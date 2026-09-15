import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

initializeApp();

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const DEFAULT_NOTIFY_OFFSETS = [3, 1, 0];

interface ItemDoc {
  householdId: string;
  name: string;
  expiryDate: string; // YYYY-MM-DD
  notifyOffsets?: number[];
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Runs daily and pushes a notification to every member of a household for
 * each item that lands on one of its configured D-day offsets. Local
 * notifications only fire on the device that added the item, so this is
 * what actually makes reminders reach every household member.
 */
export const sendExpiryReminders = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Asia/Seoul" },
  async () => {
    const db = getFirestore();
    const itemsSnap = await db.collection("items").get();

    const dueItemsByHousehold = new Map<string, { name: string; offset: number }[]>();
    for (const doc of itemsSnap.docs) {
      const item = doc.data() as ItemDoc;
      const offset = daysUntilExpiry(item.expiryDate);
      const offsets = item.notifyOffsets ?? DEFAULT_NOTIFY_OFFSETS;
      if (!offsets.includes(offset)) continue;

      const list = dueItemsByHousehold.get(item.householdId) ?? [];
      list.push({ name: item.name, offset });
      dueItemsByHousehold.set(item.householdId, list);
    }

    if (dueItemsByHousehold.size === 0) {
      logger.info("No items due for a reminder today.");
      return;
    }

    const messages: PushMessage[] = [];
    for (const [householdId, dueItems] of dueItemsByHousehold) {
      const householdDoc = await db.collection("households").doc(householdId).get();
      const memberIds: string[] = householdDoc.data()?.memberIds ?? [];
      if (memberIds.length === 0) continue;

      const memberDocs = await db.getAll(
        ...memberIds.map((uid) => db.collection("users").doc(uid))
      );
      const pushTokens = memberDocs
        .map((d) => d.data()?.pushToken as string | undefined)
        .filter((token): token is string => !!token);

      for (const item of dueItems) {
        const title = item.offset === 0 ? "오늘이 유통기한이에요" : `유통기한 D-${item.offset}`;
        const body = `${item.name}의 유통기한이 ${item.offset === 0 ? "오늘" : `${item.offset}일 후`}이에요.`;
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
);
