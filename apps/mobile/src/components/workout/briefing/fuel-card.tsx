import { BatteryLow, CircleCheck } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { TodayWorkout } from "@/lib/types";

/** Briefing (10a) fuel check: fuelled or running low, from what's been eaten so far today. */
export function FuelCard({ fuel }: { fuel: TodayWorkout["fuel"] }) {
  const c = useColors();
  const styles = useStyles();
  const low = fuel.low;
  return (
    <View accessibilityLabel="Fuel" style={[styles.fuel, { backgroundColor: low ? c.cautionSoft : c.proteinSoft }]}>
      {low ? <BatteryLow size={24} color={c.cautionText} /> : <CircleCheck size={24} color={c.protein} />}
      <View style={{ flex: 1 }}>
        <Text weight={700} color={low ? c.cautionText : c.protein}>
          {low ? "Running low" : "Fuelled"}
        </Text>
        <Text size={13} color={c.ink2} tabular>
          {formatInt(fuel.eatenKcal)} of {formatInt(fuel.targetKcal)} kcal so far today
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  fuel: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.card, padding: 16 },
}));
