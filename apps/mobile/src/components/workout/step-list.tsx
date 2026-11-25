import type { TrainingStep } from "@fitr8/contracts";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * A day's steps (name and detail) with dividers. On its own it is a surface card (16d); `inset`
 * is the smaller sunken version inside the week's day card (16c).
 */
export function StepList({ steps, inset }: { steps: TrainingStep[]; inset?: boolean }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={inset ? styles.insetList : styles.list}>
      {steps.map((s, i) => (
        <View
          key={`${s.name}-${i}`}
          style={[styles.step, inset && styles.insetStep, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}
        >
          <Text weight={600} size={inset ? 14 : undefined} style={{ flex: 1 }}>
            {s.name}
          </Text>
          <Text size={13} color={c.ink3} tabular style={{ flexShrink: 1, textAlign: "right" }}>
            {s.detail}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  list: { borderRadius: radius.card, backgroundColor: c.surface },
  insetList: { borderRadius: radius.input, backgroundColor: c.sunken },
  step: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  insetStep: { paddingHorizontal: 14, paddingVertical: 12 },
}));
