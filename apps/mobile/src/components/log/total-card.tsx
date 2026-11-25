import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * The footer's total: "Total" over the kcal, with a side note on the right (macros, grams, "No AI
 * scan used"). `live` announces the kcal as it changes.
 */
export function TotalCard({ kcal, live = false, children }: { kcal: number; live?: boolean; children: ReactNode }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.total}>
      <View>
        <Text weight={600} size={12} color={c.ink3}>
          Total
        </Text>
        <Text variant="h1" size={26} tabular accessibilityLiveRegion={live ? "polite" : undefined}>
          {formatInt(kcal)}{" "}
          <Text weight={600} size={13} color={c.ink3}>
            kcal
          </Text>
        </Text>
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  total: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderRadius: radius.card,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
}));
