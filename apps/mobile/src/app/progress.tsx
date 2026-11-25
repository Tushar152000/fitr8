import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { CheckinForm } from "@/components/progress/checkin-form";
import { WeightTrendCard } from "@/components/progress/weight-trend-card";
import { QueryError } from "@/components/query-error";
import { ProgressSkeleton } from "@/components/skeletons";
import type { Progress } from "@/components/progress/trend-chart";
import { FadeIn, InsightCard, Screen, StatTile, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { progressInsight } from "@/lib/progress-insight";
import { progressQuery } from "@/lib/queries";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/** Screen 11: weekly check-in, trend vs plan, last-7-day stats. Opened from the Progress card on Today. */
export default function ProgressScreen() {
  const progress = useQuery(progressQuery);
  const pull = usePullRefresh(() => progress.refetch());

  return (
    <Screen refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      <BackHeader />
      <View>
        <Text variant="meta">Weekly check-in</Text>
        <Text variant="h1">Progress</Text>
      </View>
      {progress.isPending ? (
        <ProgressSkeleton />
      ) : progress.isError ? (
        <QueryError error={progress.error} onRetry={() => progress.refetch()} />
      ) : (
        <FadeIn style={{ gap: 24 }}>
          <ProgressBody p={progress.data} />
        </FadeIn>
      )}
    </Screen>
  );
}

function ProgressBody({ p }: { p: Progress }) {
  const { headline, reason } = progressInsight(p);
  return (
    <>
      <CheckinForm lastWeightKg={p.latest?.weightKg ?? null} lastWaistCm={p.latest?.waistCm ?? null} />
      <InsightCard headline={headline} reason={reason} />
      <WeightTrendCard points={p.points} plan={p.plan} />
      <View style={{ flexDirection: "row", gap: 8 }} accessibilityLabel="Last 7 days">
        <StatTile
          label="Avg intake"
          value={p.avgIntake == null ? "—" : formatInt(p.avgIntake)}
          sub={p.avgIntake == null ? "no meals yet" : "kcal a day"}
        />
        <StatTile label="Days logged" value={`${p.daysLogged}/7`} sub="last 7 days" />
        <StatTile label="Workouts" value="—" sub="tracking soon" />
      </View>
    </>
  );
}
