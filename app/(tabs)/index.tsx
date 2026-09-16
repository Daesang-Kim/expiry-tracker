import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, Image, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { subscribeToHouseholdItems, daysUntilExpiry, compareItemUrgency, isLowStock } from "../../src/services/items";
import { EditItemModal } from "../../src/components/EditItemModal";
import { colors } from "../../src/styles/theme";
import { ITEM_CATEGORIES } from "../../src/types";
import type { Item } from "../../src/types";

function ExpiryBadge({ days }: { days: number }) {
  const label = days < 0 ? "만료됨" : days === 0 ? "오늘" : `D-${days}`;
  const [bg, fg] =
    days <= 1 ? [colors.dangerBg, colors.danger] : days <= 3 ? [colors.warningBg, colors.warning] : [colors.infoBg, colors.info];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

function StockBadge({ item }: { item: Item }) {
  const low = isLowStock(item);
  const [bg, fg] = low ? [colors.dangerBg, colors.danger] : [colors.chipBg, colors.textSecondary];
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderWidth: low ? 0 : 1, borderColor: colors.chipBorder }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{item.quantity}개</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.householdId) return;
    setError(null);
    return subscribeToHouseholdItems(user.householdId, setItems, (err) => setError(err.message));
  }, [user?.householdId]);

  const sorted = useMemo(() => [...items].sort(compareItemUrgency), [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sorted.filter((item) => {
      if (category && item.category !== category) return false;
      if (query && !item.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [sorted, search, category]);

  if (error) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>목록을 불러오지 못했어요.{"\n"}{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="항목 검색"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.chipRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["전체", ...ITEM_CATEGORIES] as const}
          keyExtractor={(c) => c}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item: c }) => {
            const selected = c === "전체" ? category === null : category === c;
            return (
              <Pressable
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setCategory(c === "전체" ? null : c)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 등록된 항목이 없어요.{"\n"}추가 탭에서 항목을 등록해보세요.</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>조건에 맞는 항목이 없어요.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => setEditingItem(item)}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} />
              ) : (
                <View style={styles.thumbnailPlaceholder} />
              )}
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {[item.category, item.expiryDate ?? (item.lowStockThreshold != null ? `${item.quantity}개` : null)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <View style={styles.badgeStack}>
                {item.expiryDate && <ExpiryBadge days={daysUntilExpiry(item.expiryDate)} />}
                {item.lowStockThreshold != null && <StockBadge item={item} />}
              </View>
            </Pressable>
          )}
        />
      )}

      <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
  chipRow: { paddingLeft: 16, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12.5, fontWeight: "600", color: colors.textSecondary },
  chipTextSelected: { color: "#fff" },
  list: { padding: 16, paddingTop: 0, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    borderRadius: 13,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  thumbnail: { width: 36, height: 36, borderRadius: 9 },
  thumbnailPlaceholder: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.background },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 14.5, fontWeight: "600", color: colors.textPrimary },
  meta: { fontSize: 11.5, color: colors.textMuted },
  badgeStack: { alignItems: "flex-end", gap: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  badgeText: { fontWeight: "700", fontSize: 11.5 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { textAlign: "center", color: colors.textMuted, lineHeight: 22 },
});
