import { View, Text, Pressable, StyleSheet, Share, Alert } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../src/contexts/AuthContext";
import { getHousehold } from "../../src/services/household";
import {
  DEFAULT_PHOTO_RETENTION_DAYS,
  formatBytes,
  getHouseholdStorageUsage,
  purgeExpiredPhotos,
  type StorageUsage,
} from "../../src/services/cleanup";
import type { Household } from "../../src/types";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const loadUsage = useCallback(() => {
    if (user?.householdId) getHouseholdStorageUsage(user.householdId).then(setUsage);
  }, [user?.householdId]);

  useEffect(() => {
    if (user?.householdId) getHousehold(user.householdId).then(setHousehold);
  }, [user?.householdId]);

  useEffect(loadUsage, [loadUsage]);

  async function handleCleanup() {
    if (!user?.householdId) return;
    setCleaning(true);
    try {
      const purged = await purgeExpiredPhotos(user.householdId);
      Alert.alert("정리 완료", purged > 0 ? `사진 ${purged}개를 삭제했어요.` : "정리할 사진이 없어요.");
      loadUsage();
    } catch (err) {
      Alert.alert("정리 실패", err instanceof Error ? err.message : String(err));
    } finally {
      setCleaning(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>이메일</Text>
      <Text style={styles.value}>{user?.email}</Text>

      <Text style={styles.label}>가족 그룹</Text>
      <Text style={styles.value}>{household?.name ?? "-"}</Text>

      <Text style={styles.label}>초대 코드</Text>
      <Text style={styles.value}>{household?.inviteCode ?? "-"}</Text>
      {household && (
        <Pressable
          style={styles.shareButton}
          onPress={() => Share.share({ message: `expiry-tracker 초대 코드: ${household.inviteCode}` })}
        >
          <Text style={styles.shareButtonText}>초대 코드 공유하기</Text>
        </Pressable>
      )}

      <Text style={styles.label}>저장공간</Text>
      {usage ? (
        <>
          <Text style={styles.value}>
            사진 {usage.photoCount}개 · {formatBytes(usage.totalBytes)}
          </Text>
          <Text style={styles.hint}>
            만료 {DEFAULT_PHOTO_RETENTION_DAYS}일 후 자동 삭제 대상: {usage.staleCount}개 (
            {formatBytes(usage.staleBytes)})
          </Text>
          <Pressable style={styles.cleanupButton} onPress={handleCleanup} disabled={cleaning}>
            <Text style={styles.cleanupButtonText}>{cleaning ? "정리 중..." : "지금 정리하기"}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.value}>불러오는 중...</Text>
      )}

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>로그아웃</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 4 },
  label: { color: "#888", marginTop: 16, fontSize: 13 },
  value: { fontSize: 16, fontWeight: "600" },
  hint: { color: "#999", fontSize: 12, marginTop: 2 },
  shareButton: { backgroundColor: "#2f6fed", borderRadius: 8, padding: 12, alignItems: "center", marginTop: 12 },
  shareButtonText: { color: "#fff", fontWeight: "600" },
  cleanupButton: {
    backgroundColor: "#eee",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 10,
  },
  cleanupButtonText: { color: "#333", fontWeight: "600" },
  signOutButton: { marginTop: 40, alignItems: "center" },
  signOutText: { color: "#e0473e", fontWeight: "600" },
});
