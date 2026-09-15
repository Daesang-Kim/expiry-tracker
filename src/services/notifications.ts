import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

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

export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("expiry-alerts", {
    name: "유통기한 알림",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Registers this device for Expo push notifications and saves the token on the
 * user's Firestore doc. D-3/D-1/D-day reminders are sent server-side (see
 * functions/src/index.ts) to every household member, not just whoever added
 * the item, so every member's device needs a token on file.
 */
export async function registerPushToken(uid: string): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

  await setDoc(doc(db, "users", uid), { pushToken }, { merge: true });
}
