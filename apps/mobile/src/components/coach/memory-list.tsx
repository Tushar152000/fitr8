import type { CoachMemoryView } from "@fitr8/contracts";
import { Trash2 } from "lucide-react-native";
import { View } from "react-native";
import { AnimatedRow, PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** The facts the coach keeps, one row each with a delete button; the row being forgotten dims its button. */
export function MemoryList({
  memories,
  removing,
  onForget,
}: {
  memories: CoachMemoryView[];
  removing: string | null;
  onForget: (memory: CoachMemoryView) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.list}>
      {memories.map((m, i) => (
        <AnimatedRow key={m.id} style={[styles.row, i > 0 && styles.divider]}>
          <Text variant="bodyMedium" style={{ flex: 1 }}>
            {m.text}
          </Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Forget: ${m.text}`}
            disabled={removing === m.id}
            onPress={() => onForget(m)}
            hitSlop={8}
            style={{ opacity: removing === m.id ? 0.4 : 1 }}
          >
            <Trash2 size={18} color={c.ink2} strokeWidth={2} />
          </PressableScale>
        </AnimatedRow>
      ))}
    </View>
  );
}

// Figma "Group": white card, card lift, 16 px sides; rows 12 px tall padding with 1 px dividers.
const useStyles = makeStyles((c, shadows) => ({
  list: {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 4,
    ...shadows.card,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 48 },
  divider: { borderTopWidth: 1, borderTopColor: c.line },
}));
