import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await signUp(email, password);
      // AuthContext picks up the new user via onAuthStateChanged; root layout
      // redirects to /(auth)/invite automatically since householdId is null.
    } catch (err) {
      Alert.alert("회원가입 실패", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      <TextInput
        style={styles.input}
        placeholder="이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 (6자 이상)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "가입 중..." : "가입하기"}</Text>
      </Pressable>
      <Link href="/(auth)/login" style={styles.link}>
        이미 계정이 있으신가요? 로그인
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  button: { backgroundColor: "#2f6fed", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { textAlign: "center", marginTop: 16, color: "#2f6fed" },
});
