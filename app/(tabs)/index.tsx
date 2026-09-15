import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, Alert } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import { subscribeToHouseholdItems, deleteItem, daysUntilExpiry } from "../../src/services/items";
import type { Item } from "../../src/types";

function ExpiryBadge({ days }: { days: number }) {
  const label = days < 0 ? "만료됨" : days === 0 ? "오늘" : `D-${days}`;
  const color = days <= 1 ? "#e0473e" : days <= 3 ? "#e0a13e" : "#3e8ee0";
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user?.householdId) return;
    return subscribeToHouseholdItems(user.householdId, setItems);
  }, [user?.householdId]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)),
    [items]
  );

  async function handleDelete(item: Item) {
    Alert.alert("삭제할까요?", item.name, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await deleteItem(item.id);
        },
      },
    ]);
  }

  if (sorted.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>아직 등록된 항목이 없어요.{"\n"}추가 탭에서 항목을 등록해보세요.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sorted}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onLongPress={() => handleDelete(item)}>
          <View style={styles.rowText}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.date}>{item.expiryDate}</Text>
          </View>
          <ExpiryBadge days={daysUntilExpiry(item.expiryDate)} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f5f5f7",
  },
  rowText: { gap: 2 },
  name: { fontSize: 16, fontWeight: "600" },
  date: { color: "#777", fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { textAlign: "center", color: "#888", lineHeight: 22 },
});
