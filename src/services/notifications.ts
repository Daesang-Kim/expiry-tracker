import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Item } from "../types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === "granted";
}

function notificationIdFor(itemId: string, offset: number): string {
  return `${itemId}-d${offset}`;
}

/** Cancels any existing notifications for the item, then schedules one per offset in item.notifyOffsets. */
export async function scheduleItemNotifications(item: Item): Promise<void> {
  await cancelItemNotifications(item.id, item.notifyOffsets);

  const expiry = new Date(item.expiryDate);
  expiry.setHours(9, 0, 0, 0); // 09:00 on the target day

  for (const offset of item.notifyOffsets) {
    const triggerDate = new Date(expiry);
    triggerDate.setDate(triggerDate.getDate() - offset);
    if (triggerDate.getTime() <= Date.now()) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: notificationIdFor(item.id, offset),
      content: {
        title: offset === 0 ? "오늘이 유통기한이에요" : `유통기한 D-${offset}`,
        body: `${item.name}의 유통기한이 ${offset === 0 ? "오늘" : `${offset}일 후`}이에요.`,
        data: { itemId: item.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
}

export async function cancelItemNotifications(
  itemId: string,
  offsets: number[] = [3, 1, 0]
): Promise<void> {
  await Promise.all(
    offsets.map((offset) => Notifications.cancelScheduledNotificationAsync(notificationIdFor(itemId, offset)))
  );
}

export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("expiry-alerts", {
    name: "유통기한 알림",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
