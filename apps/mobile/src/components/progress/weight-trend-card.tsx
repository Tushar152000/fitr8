import { View } from "react-native";
import { TrendChart, type Progress } from "./trend-chart";
import { Card, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/** "Weight trend": your weigh-ins against the plan line, with a You / Plan legend. */
export function WeightTrendCard({ points, plan }: { points: Progress["points"]; plan: Progress["plan"] }) {
  const c = useColors();
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text variant="h2">Weight trend</Text>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: c.brand }} />
            <Text weight={600} size={12} color={c.ink3}>
              You
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 16, borderTopWidth: 2, borderStyle: "dashed", borderColor: c.ink3 }} />
            <Text weight={600} size={12} color={c.ink3}>
              Plan
            </Text>
          </View>
        </View>
      </View>
      <TrendChart points={points} plan={plan} />
    </Card>
  );
}
