import { router } from "expo-router";
import type { ProgressDto } from "@fitr8/contracts";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * Home v2 weight card: latest weigh-in and this week's change vs the plan, one tap into Progress
 * (weekly check-in and trend).
 */
export function WeightCard({ p }: { p: ProgressDto }) {
  const c = useColors();
  const styles = useStyles();
  const latest = p.latest?.weightKg ?? null;
  const change = p.weeklyChange;
  const planned = p.plan.weeklyChangeKg;
  const onTrack = change != null && Math.abs(change - planned) <= 0.25;
  const Trend = change != null && change > 0 ? TrendingUp : TrendingDown;
  const kg = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)} kg`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens Progress: weekly check-in and weight trend"
      onPress={() => router.push("/progress")}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: c.sunken }]}
    >
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text size={12} color={c.ink2}>
            Latest weight
          </Text>
          <Text weight={700} size={22} tabular>
            {latest != null ? `${latest.toFixed(1)} kg` : "—"}
          </Text>
        </View>
        <View style={{ flex: 1.3, gap: 4 }}>
          <Text size={12} color={c.ink3}>
            This week
          </Text>
          {change != null ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Trend size={18} color={onTrack ? c.protein : c.cautionText} />
              <Text weight={700} size={20} color={onTrack ? c.protein : c.cautionText} tabular>
                {kg(change)}
              </Text>
            </View>
          ) : (
            <Text weight={600} size={17} color={c.ink3}>
              Not enough data
            </Text>
          )}
        </View>
        <ChevronRight size={22} color={c.ink2} />
      </View>
      <View style={styles.divider} />
      <Text size={13} color={c.ink2}>
        {change == null
          ? "Weigh in once a week to see your trend against the plan"
          : onTrack
            ? `On track with the plan (${kg(planned)} a week). Logged ${p.daysLogged}/7 days.`
            : `Plan is ${kg(planned)} a week. Logged ${p.daysLogged}/7 days.`}
      </Text>
      <Text weight={600} size={13} color={c.accentText}>
        Weekly check-in and trend
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: { borderRadius: radius.card, backgroundColor: c.surface, padding: 16, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  divider: { height: 1, backgroundColor: c.line },
}));
