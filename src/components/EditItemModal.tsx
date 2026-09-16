import { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { deleteItem, updateItem } from "../services/items";
import { DATE_PATTERN, formatDateInput } from "../utils/date";
import { CategoryPicker } from "./CategoryPicker";
import type { Item } from "../types";

interface Props {
  item: Item | null;
  onClose: () => void;
}

export function EditItemModal({ item, onClose }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setCategory(item.category);
    setExpiryDate(item.expiryDate);
    setQuantity(String(item.quantity));
  }, [item]);

  if (!item) return null;

  async function handleSave() {
    if (!item) return;
    if (!name.trim() || !DATE_PATTERN.test(expiryDate)) {
      Alert.alert("입력 확인", "이름과 유통기한(YYYY-MM-DD)을 확인해주세요.");
      return;
    }
    setSaving(true);
    try {
      await updateItem(item.id, {
        name: name.trim(),
        category,
        expiryDate,
        quantity: Number(quantity) || 1,
      });
      onClose();
    } catch (err) {
      Alert.alert("저장 실패", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!item) return;
    Alert.alert("삭제할까요?", item.name, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await deleteItem(item.id);
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal visible={!!item} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>항목 수정</Text>
          <TextInput style={styles.input} placeholder="이름" value={name} onChangeText={setName} />
          <CategoryPicker value={category} onChange={setCategory} />
          <TextInput
            style={styles.input}
            placeholder="유통기한 (예: 20260916)"
            keyboardType="number-pad"
            maxLength={10}
            value={expiryDate}
            onChangeText={(text) => setExpiryDate(formatDateInput(text))}
          />
          <TextInput
            style={styles.input}
            placeholder="수량"
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
          />

          <Pressable style={styles.button} onPress={handleSave} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? "저장 중..." : "저장"}</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>삭제 (다 썼어요)</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  button: { backgroundColor: "#2f6fed", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
  deleteButton: { padding: 12, alignItems: "center" },
  deleteButtonText: { color: "#e0473e", fontWeight: "600" },
  cancelButton: { padding: 4, alignItems: "center" },
  cancelButtonText: { color: "#888" },
});
