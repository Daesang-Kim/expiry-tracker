import { useEffect } from "react";
import { Tabs } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { purgeExpiredPhotos } from "../../src/services/cleanup";

export default function TabsLayout() {
  const { user } = useAuth();

  useEffect(() => {
    // Best-effort background cleanup of stale thumbnails — failures are silent
    // since this isn't user-initiated (the manual button in Settings surfaces errors).
    if (user?.householdId) {
      purgeExpiredPhotos(user.householdId).catch(() => {});
    }
  }, [user?.householdId]);

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="add" options={{ title: "추가" }} />
      <Tabs.Screen name="settings" options={{ title: "설정" }} />
    </Tabs>
  );
}
