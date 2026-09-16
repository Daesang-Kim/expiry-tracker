import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import { createHousehold, joinHouseholdByInviteCode } from "../../src/services/household";
import { inputStyle, PLACEHOLDER_COLOR } from "../../src/styles/input";

export default function InviteScreen() {
  const { user, setHouseholdId } = useAuth();
  const [code, setCode] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!user) return;
    setLoading(true);
    try {
      const household = await joinHouseholdByInviteCode(user.uid, code.trim());
      await setHouseholdId(household.id);
    } catch (err) {
      Alert.alert("참여 실패", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!user) return;
    setLoading(true);
    try {
      const household = await createHousehold(user.uid, householdName.trim() || "우리집");
      await setHouseholdId(household.id);
    } catch (err) {
      Alert.alert("생성 실패", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>가족 그룹 참여</Text>
      <Text style={styles.subtitle}>초대 코드를 받았다면 입력해주세요.</Text>
      <TextInput
        style={styles.input}
        placeholder="초대 코드 (예: AB12CD)"
        placeholderTextColor={PLACEHOLDER_COLOR}
        autoCapitalize="characters"
        value={code}
        onChangeText={setCode}
      />
      <Pressable style={styles.button} onPress={handleJoin} disabled={loading || !code.trim()}>
        <Text style={styles.buttonText}>{loading ? "처리 중..." : "코드로 참여하기"}</Text>
      </Pressable>

      <View style={styles.divider} />

      <Text style={styles.subtitle}>처음이라면 새 가족 그룹을 만들어주세요.</Text>
      <TextInput
        style={styles.input}
        placeholder="가족 그룹 이름 (예: 우리집)"
        placeholderTextColor={PLACEHOLDER_COLOR}
        value={householdName}
        onChangeText={setHouseholdName}
      />
      <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleCreate} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "처리 중..." : "새로 만들기"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#666", marginBottom: 4 },
  input: inputStyle,
  button: { backgroundColor: "#2f6fed", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 4 },
  buttonSecondary: { backgroundColor: "#666" },
  buttonText: { color: "#fff", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 20 },
});
