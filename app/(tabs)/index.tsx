import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import { subscribeToHouseholdItems, daysUntilExpiry } from "../../src/services/items";
import { EditItemModal } from "../../src/components/EditItemModal";
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
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  useEffect(() => {
    if (!user?.householdId) return;
    setError(null);
    return subscribeToHouseholdItems(user.householdId, setItems, (err) => setError(err.message));
  }, [user?.householdId]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)),
    [items]
  );

  if (error) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>목록을 불러오지 못했어요.{"\n"}{error}</Text>
      </View>
    );
  }

  if (sorted.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>아직 등록된 항목이 없어요.{"\n"}추가 탭에서 항목을 등록해보세요.</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => setEditingItem(item)}>
            <View style={styles.rowText}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.name}</Text>
                {item.category && <Text style={styles.category}>{item.category}</Text>}
              </View>
              <Text style={styles.date}>{item.expiryDate}</Text>
            </View>
            <ExpiryBadge days={daysUntilExpiry(item.expiryDate)} />
          </Pressable>
        )}
      />
      <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} />
    </>
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 16, fontWeight: "600" },
  category: {
    fontSize: 11,
    color: "#666",
    backgroundColor: "#e8e8ec",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  date: { color: "#777", fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { textAlign: "center", color: "#888", lineHeight: 22 },
});
