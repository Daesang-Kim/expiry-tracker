import { View, Text, Pressable, StyleSheet } from "react-native";
import { ITEM_CATEGORIES } from "../types";

interface Props {
  value: string | null;
  onChange: (category: string | null) => void;
}

export function CategoryPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {ITEM_CATEGORIES.map((category) => {
        const selected = value === category;
        return (
          <Pressable
            key={category}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(selected ? null : category)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{category}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  chipSelected: { backgroundColor: "#0E9F6E" },
  chipText: { color: "#555", fontSize: 13 },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
});
