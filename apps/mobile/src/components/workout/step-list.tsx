import type { TrainingStep } from "@fitr8/contracts";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * A day's steps (name and detail) with dividers. On its own it is a v2 white card (16d); `inset`
 * is the grey version inside another white card.
 */
export function StepList({ steps, inset }: { steps: TrainingStep[]; inset?: boolean }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={inset ? styles.insetList : styles.list}>
      {steps.map((s, i) => (
        <View key={`${s.name}-${i}`} style={[styles.step, i > 0 && styles.divider]}>
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {s.name}
          </Text>
          <Text variant="labelMedium" color={c.ink2} tabular style={{ flexShrink: 1, textAlign: "right" }}>
            {s.detail}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  list: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  insetList: { paddingHorizontal: 14, borderRadius: radius.input, backgroundColor: c.ground },
  step: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 48 },
  divider: { borderTopWidth: 1, borderTopColor: c.line },
}));
