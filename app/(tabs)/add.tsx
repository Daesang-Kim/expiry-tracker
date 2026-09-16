import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image, Switch } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../src/contexts/AuthContext";
import { addItem, updateItem, DEFAULT_NOTIFY_OFFSETS } from "../../src/services/items";
import { uploadItemThumbnail } from "../../src/services/storage";
import { DATE_PATTERN, formatDateInput } from "../../src/utils/date";
import { CategoryPicker } from "../../src/components/CategoryPicker";
import { inputStyle, PLACEHOLDER_COLOR } from "../../src/styles/input";

export default function AddItemScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("카메라 권한이 필요해요");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setKeepPhoto(true); // taking a photo means they want it kept — opt out via the switch instead
    }
    // NOTE: the captured photo is only kept locally for now — once on-device
    // OCR is wired up, this is where we'll run text recognition on it. The
    // photo is uploaded to Storage only if the user opts in via `keepPhoto`.
  }

  async function handleSave() {
    if (!user?.householdId) return;
    if (!name.trim()) {
      Alert.alert("입력 확인", "이름을 입력해주세요.");
      return;
    }
    if (expiryDate && !DATE_PATTERN.test(expiryDate)) {
      Alert.alert("입력 확인", "유통기한 날짜를 확인해주세요.");
      return;
    }
    setSaving(true);
    try {
      const itemId = await addItem({
        householdId: user.householdId,
        name: name.trim(),
        category,
        expiryDate: expiryDate || null,
        quantity: Number(quantity) || 1,
        lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : null,
        lowStockNotified: false,
        photoUrl: null,
        photoPath: null,
        photoSizeBytes: null,
        notifyOffsets: DEFAULT_NOTIFY_OFFSETS,
        createdBy: user.uid,
      });

      if (photoUri && keepPhoto) {
        const thumbnail = await uploadItemThumbnail(user.householdId, itemId, photoUri);
        await updateItem(itemId, {
          photoUrl: thumbnail.url,
          photoPath: thumbnail.path,
          photoSizeBytes: thumbnail.sizeBytes,
        });
      }

      // D-3/D-1/D-day reminders and low-stock alerts are sent to every household
      // member by a daily Cloud Function (functions/src/index.ts) — no
      // client-side scheduling needed.
      setName("");
      setCategory(null);
      setExpiryDate("");
      setQuantity("1");
      setLowStockThreshold("");
      setPhotoUri(null);
      setKeepPhoto(false);
      router.push("/(tabs)");
    } catch (err) {
      Alert.alert("저장 실패", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>항목 추가</Text>
      <TextInput
        style={styles.input}
        placeholder="이름 (예: 우유, 휴지)"
        placeholderTextColor={PLACEHOLDER_COLOR}
        value={name}
        onChangeText={setName}
      />
      <CategoryPicker value={category} onChange={setCategory} />
      <TextInput
        style={styles.input}
        placeholder="유통기한 (선택, 예: 20260916)"
        placeholderTextColor={PLACEHOLDER_COLOR}
        keyboardType="number-pad"
        maxLength={10}
        value={expiryDate}
        onChangeText={(text) => setExpiryDate(formatDateInput(text))}
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.rowInput]}
          placeholder="수량"
          placeholderTextColor={PLACEHOLDER_COLOR}
          keyboardType="number-pad"
          value={quantity}
          onChangeText={setQuantity}
        />
        <TextInput
          style={[styles.input, styles.rowInput]}
          placeholder="재고 부족 기준 (선택)"
          placeholderTextColor={PLACEHOLDER_COLOR}
          keyboardType="number-pad"
          value={lowStockThreshold}
          onChangeText={setLowStockThreshold}
        />
      </View>
      <Text style={styles.hint}>기준값 이하로 남으면 "재고 부족"으로 표시하고 알려드려요. 휴지·세제처럼 날짜 없이 수량만 챙기고 싶은 항목에 유용해요.</Text>
      <Pressable style={styles.photoButton} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <Text style={styles.photoButtonText}>사진 촬영 (선택)</Text>
        )}
      </Pressable>
      {photoUri && (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>사진도 보관하기 (압축된 썸네일, 만료 30일 후 자동 삭제)</Text>
          <Switch value={keepPhoto} onValueChange={setKeepPhoto} />
        </View>
      )}
      <Pressable style={styles.button} onPress={handleSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "저장 중..." : "저장"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  input: inputStyle,
  row: { flexDirection: "row", gap: 12 },
  rowInput: { flex: 1 },
  hint: { fontSize: 12, color: "#8B8F98", marginTop: -6 },
  photoButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    borderRadius: 8,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoButtonText: { color: "#888" },
  photoPreview: { width: "100%", height: "100%" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  switchLabel: { flex: 1, color: "#666", fontSize: 13 },
  button: { backgroundColor: "#0E9F6E", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
