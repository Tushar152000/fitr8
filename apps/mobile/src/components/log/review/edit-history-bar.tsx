import { Redo2, Undo2, type LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/** The hint over the items, with undo / redo for this screen's edits (nothing is saved until "Save"). */
export function EditHistoryBar({
  hint,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  hint: string;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Text size={13} color={c.ink3} style={{ flex: 1 }}>
        {hint}
      </Text>
      <HistoryButton label="Undo" icon={Undo2} onPress={onUndo} disabled={!canUndo} />
      <HistoryButton label="Redo" icon={Redo2} onPress={onRedo} disabled={!canRedo} />
    </View>
  );
}

function HistoryButton({
  label,
  icon: Icon,
  onPress,
  disabled,
}: {
  label: "Undo" | "Redo";
  icon: LucideIcon;
  onPress: () => void;
  disabled: boolean;
}) {
  const c = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label} last change`}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.history, disabled && { opacity: 0.35 }]}
    >
      <Icon size={16} color={c.ink2} />
      <Text weight={600} size={13} color={c.ink2}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  history: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6 },
});
