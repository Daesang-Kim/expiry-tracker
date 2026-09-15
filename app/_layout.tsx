import { useEffect } from "react";
import { Redirect, Slot, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { setupAndroidNotificationChannel } from "../src/services/notifications";

function RootNavigation() {
  const { user, initializing } = useAuth();
  const segments = useSegments() as string[];
  const inAuthGroup = segments[0] === "(auth)";

  useEffect(() => {
    setupAndroidNotificationChannel();
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user && !inAuthGroup) return <Redirect href="/(auth)/login" />;
  if (user && !user.householdId && segments[1] !== "invite") {
    return <Redirect href="/(auth)/invite" />;
  }
  if (user && user.householdId && inAuthGroup) return <Redirect href="/(tabs)" />;
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
