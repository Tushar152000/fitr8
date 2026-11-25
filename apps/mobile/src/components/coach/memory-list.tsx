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
          <Text style={{ flex: 1 }}>{m.text}</Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Forget: ${m.text}`}
            disabled={removing === m.id}
            onPress={() => onForget(m)}
            hitSlop={8}
            style={{ opacity: removing === m.id ? 0.4 : 1 }}
          >
            <Trash2 size={18} color={c.ink3} />
          </PressableScale>
        </AnimatedRow>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  list: { backgroundColor: c.surface, borderRadius: radius.card, borderWidth: 1, borderColor: c.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: c.line },
}));
