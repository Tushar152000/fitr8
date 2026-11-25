import { Trash2 } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/** Design 9: the review heading ("We found 3 items", "Edit lunch") with Delete beside it. */
export function ReviewTitle({ title, onDelete }: { title: string; onDelete: () => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <Text variant="h1" size={26} style={{ flex: 1 }}>
        {title}
      </Text>
      <PressableScale accessibilityRole="button" onPress={onDelete} style={styles.delete}>
        <Trash2 size={16} color={c.ink3} />
        <Text weight={600} size={13} color={c.ink3}>
          Delete
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  delete: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, marginRight: -8 },
});
