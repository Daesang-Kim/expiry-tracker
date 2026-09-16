import { View, Text, Pressable, StyleSheet, Share, Alert, TextInput } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { getHousehold, updateHouseholdName } from "../../src/services/household";
import {
  DEFAULT_PHOTO_RETENTION_DAYS,
  formatBytes,
  getHouseholdStorageUsage,
  purgeExpiredPhotos,
  type StorageUsage,
} from "../../src/services/cleanup";
import { inputStyle, PLACEHOLDER_COLOR } from "../../src/styles/input";
import { colors } from "../../src/styles/theme";
import type { Household } from "../../src/types";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const loadUsage = useCallback(() => {
    if (!user?.householdId) return;
    setUsageError(null);
    getHouseholdStorageUsage(user.householdId)
      .then(setUsage)
      .catch((err) => setUsageError(err instanceof Error ? err.message : String(err)));
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

  function startEditingName() {
    setNameDraft(household?.name ?? "");
    setEditingName(true);
  }

  async function handleSaveName() {
    if (!household || !nameDraft.trim()) return;
    setSavingName(true);
    try {
      await updateHouseholdName(household.id, nameDraft.trim());
      setHousehold({ ...household, name: nameDraft.trim() });
      setEditingName(false);
    } catch (err) {
      Alert.alert("변경 실패", err instanceof Error ? err.message : String(err));
    } finally {
      setSavingName(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>이메일</Text>
      <Text style={styles.value}>{user?.email}</Text>

      <Text style={styles.label}>가족 그룹</Text>
      {editingName ? (
        <View style={styles.nameEditRow}>
          <TextInput
            style={[styles.input, styles.nameInput]}
            placeholder="가족 그룹 이름"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={nameDraft}
            onChangeText={setNameDraft}
            autoFocus
          />
          <Pressable style={styles.iconButton} onPress={handleSaveName} disabled={savingName}>
            <Ionicons name="checkmark" size={20} color={colors.accent} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => setEditingName(false)}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.nameRow}>
          <Text style={styles.value}>{household?.name ?? "-"}</Text>
          {household && (
            <Pressable style={styles.iconButton} onPress={startEditingName}>
              <Ionicons name="pencil" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}

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
      ) : usageError ? (
        <Text style={styles.value}>{usageError}</Text>
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
  container: { flex: 1, padding: 24, gap: 4, backgroundColor: colors.background },
  label: { color: colors.textMuted, marginTop: 16, fontSize: 13 },
  value: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: inputStyle,
  nameInput: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, fontSize: 15 },
  iconButton: { padding: 6 },
  shareButton: { backgroundColor: colors.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 12 },
  shareButtonText: { color: "#fff", fontWeight: "600" },
  cleanupButton: {
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 10,
  },
  cleanupButtonText: { color: colors.textPrimary, fontWeight: "600" },
  signOutButton: { marginTop: 40, alignItems: "center" },
  signOutText: { color: colors.danger, fontWeight: "600" },
});
