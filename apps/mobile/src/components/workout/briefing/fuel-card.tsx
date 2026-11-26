import { BatteryLow, CircleCheck } from "lucide-react-native";
import { View } from "react-native";
import { IconTile, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { TodayWorkout } from "@/lib/types";

/**
 * Briefing (10a) fuel check: fuelled or running low, from what's been eaten so far today. A v2
 * white card: status tile (accent when fuelled, caution when low), the verdict and today's kcal.
 */
export function FuelCard({ fuel }: { fuel: TodayWorkout["fuel"] }) {
  const c = useColors();
  const styles = useStyles();
  const low = fuel.low;
  return (
    <View accessible accessibilityLabel={`Fuel: ${low ? "running low" : "fuelled"}`} style={styles.card}>
      {low ? (
        <View style={styles.lowTile}>
          <BatteryLow size={18} color={c.cautionText} strokeWidth={2} />
        </View>
      ) : (
        <IconTile icon={CircleCheck} accent />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" color={low ? c.cautionText : c.ink}>
          {low ? "Running low" : "Fuelled"}
        </Text>
        <Text variant="labelRegular" color={c.ink2} tabular>
          {formatInt(fuel.eatenKcal)} of {formatInt(fuel.targetKcal)} kcal so far today
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  // The Icon Tile's shape in the caution tint.
  lowTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: c.cautionSoft,
    alignItems: "center",
    justifyContent: "center",
  },
}));
