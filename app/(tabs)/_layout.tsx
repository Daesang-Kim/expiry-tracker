import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { purgeExpiredPhotos } from "../../src/services/cleanup";
import { registerPushToken } from "../../src/services/notifications";
import { colors } from "../../src/styles/theme";

export default function TabsLayout() {
  const { user } = useAuth();

  useEffect(() => {
    // Best-effort background cleanup of stale thumbnails — failures are silent
    // since this isn't user-initiated (the manual button in Settings surfaces errors).
    if (user?.householdId) {
      purgeExpiredPhotos(user.householdId).catch(() => {});
    }
  }, [user?.householdId]);

  useEffect(() => {
    if (user?.uid) {
      registerPushToken(user.uid).catch(() => {});
    }
  }, [user?.uid]);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.cardBg },
        tabBarStyle: { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "추가",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "options" : "options-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
