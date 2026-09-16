import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

initializeApp();

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const DEFAULT_NOTIFY_OFFSETS = [3, 1, 0];

interface ItemDoc {
  householdId: string;
  name: string;
  expiryDate: string | null; // YYYY-MM-DD
  notifyOffsets?: number[];
  quantity: number;
  lowStockThreshold: number | null;
  lowStockNotified?: boolean;
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface DueReminder {
  name: string;
  kind: "expiry" | "stock";
  offset?: number;
  quantity?: number;
}

function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isLowStock(item: ItemDoc): boolean {
  return item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;
}

/**
 * Runs daily and pushes a notification to every member of a household for
 * each item due for a D-day reminder or newly low on stock. Local
 * notifications only fire on the device that added the item, so this is
 * what actually makes reminders reach every household member.
 *
 * Low-stock alerts fire once per dip (via `lowStockNotified`) rather than
 * every day it stays low — otherwise a household would get the same "우유
 * 부족해요" push daily until someone restocks.
 */
export const sendExpiryReminders = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Asia/Seoul" },
  async () => {
    const db = getFirestore();
    const itemsSnap = await db.collection("items").get();

    const dueByHousehold = new Map<string, DueReminder[]>();
    const notifiedFlagUpdates: { ref: QueryDocumentSnapshot["ref"]; notified: boolean }[] = [];

    for (const doc of itemsSnap.docs) {
      const item = doc.data() as ItemDoc;

      if (item.expiryDate) {
        const offset = daysUntilExpiry(item.expiryDate);
        const offsets = item.notifyOffsets ?? DEFAULT_NOTIFY_OFFSETS;
        if (offsets.includes(offset)) {
          const list = dueByHousehold.get(item.householdId) ?? [];
          list.push({ name: item.name, kind: "expiry", offset });
          dueByHousehold.set(item.householdId, list);
        }
      }

      const low = isLowStock(item);
      if (low && !item.lowStockNotified) {
        const list = dueByHousehold.get(item.householdId) ?? [];
        list.push({ name: item.name, kind: "stock", quantity: item.quantity });
        dueByHousehold.set(item.householdId, list);
        notifiedFlagUpdates.push({ ref: doc.ref, notified: true });
      } else if (!low && item.lowStockNotified) {
        // Restocked above the threshold — clear the flag so the next dip alerts again.
        notifiedFlagUpdates.push({ ref: doc.ref, notified: false });
      }
    }

    if (dueByHousehold.size === 0) {
      logger.info("No reminders due today.");
    } else {
      const messages: PushMessage[] = [];
      for (const [householdId, dueItems] of dueByHousehold) {
        const householdDoc = await db.collection("households").doc(householdId).get();
        const memberIds: string[] = householdDoc.data()?.memberIds ?? [];
        if (memberIds.length === 0) continue;

        const memberDocs = await db.getAll(
          ...memberIds.map((uid) => db.collection("users").doc(uid))
        );
        const pushTokens = memberDocs
          .map((d) => d.data()?.pushToken as string | undefined)
          .filter((token): token is string => !!token);

        for (const reminder of dueItems) {
          const [title, body] =
            reminder.kind === "expiry"
              ? [
                  reminder.offset === 0 ? "오늘이 유통기한이에요" : `유통기한 D-${reminder.offset}`,
                  `${reminder.name}의 유통기한이 ${reminder.offset === 0 ? "오늘" : `${reminder.offset}일 후`}이에요.`,
                ]
              : ["재고가 부족해요", `${reminder.name}이(가) ${reminder.quantity}개 남았어요.`];
          for (const to of pushTokens) {
            messages.push({ to, title, body });
          }
        }
      }

      logger.info(`Sending ${messages.length} push notifications.`);
      for (let i = 0; i < messages.length; i += 100) {
        const chunk = messages.slice(i, i + 100);
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(chunk),
        });
        if (!response.ok) {
          logger.error(`Expo push request failed: ${response.status} ${await response.text()}`);
        }
      }
    }

    for (const { ref, notified } of notifiedFlagUpdates) {
      await ref.update({ lowStockNotified: notified });
    }
  }
);
