import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { CircleCheck } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { PlanBadge } from "@/components/onboarding/plan-badge";
import { ProjectionLine } from "@/components/onboarding/projection-line";
import { StepsBar } from "@/components/onboarding/steps-bar";
import { TargetCard } from "@/components/onboarding/target-card";
import { TooFast } from "@/components/onboarding/too-fast";
import { QueryError } from "@/components/query-error";
import { PlanSkeleton } from "@/components/skeletons";
import { Button, Screen, StatTile, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { longDate } from "@/lib/dates";
import { formatInt } from "@/lib/format";
import { paceLine } from "@/lib/plan-pace";
import { planQuery } from "@/lib/queries";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** Screens 5 / 5b: the plan computed at onboarding, or the two safe options when the goal is too fast. */
export default function PlanScreen() {
  const { refresh } = useAuth();
  const plan = useQuery(planQuery);
  const [starting, setStarting] = useState(false);
  const c = useColors();
  const styles = useStyles();

  // Onboarding is saved; re-reading /api/me flips the app into the signed-in tabs.
  async function start() {
    setStarting(true);
    await refresh().catch(() => setStarting(false));
    router.replace("/today");
  }

  if (plan.isPending) {
    return (
      <Screen>
        <StepsBar current={4} total={4} />
        <PlanSkeleton />
      </Screen>
    );
  }
  if (plan.isError) {
    return (
      <Screen>
        <QueryError error={plan.error} onRetry={() => plan.refetch()} />
      </Screen>
    );
  }

  const { summary, goal, metric } = plan.data;
  const recomp = goal.type === "RECOMPOSITION";
  if (!summary.plan.feasible && !recomp) {
    return <TooFast data={plan.data} onStart={start} starting={starting} />;
  }

  const pace = paceLine(summary.plan.weeklyChangeKg, metric.weightKg, summary.plan.targetWeightKg);
  return (
    <Screen
      footer={
        <Button onPress={start} loading={starting}>
          Start my plan
        </Button>
      }
    >
      <StepsBar current={4} total={4} />
      <View style={{ gap: 12 }}>
        <Text variant="title" accessibilityRole="header">
          Your plan
        </Text>
        <PlanBadge
          icon={<CircleCheck size={16} color={c.protein} />}
          label={pace.atTarget && !recomp ? "At your target weight" : "Realistic goal"}
          color={c.protein}
          background={c.proteinSoft}
        />
      </View>

      <View style={{ gap: 16 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View style={{ gap: 2 }}>
              <Text variant="labelMedium">Now</Text>
              <Text variant="stat" tabular>
                {metric.weightKg}{" "}
                <Text variant="labelMedium" color={c.ink2}>
                  kg
                </Text>
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Text variant="labelMedium">Goal · {longDate(goal.targetDate)}</Text>
              <Text variant="stat" tabular>
                {recomp ? "Hold" : summary.plan.targetWeightKg}{" "}
                <Text variant="labelMedium" color={c.ink2}>
                  {recomp ? "weight" : "kg"}
                </Text>
              </Text>
            </View>
          </View>
          <ProjectionLine from={metric.weightKg} to={recomp ? metric.weightKg : summary.plan.targetWeightKg} />
          <Text variant="labelRegular" color={c.ink2} style={{ lineHeight: 18 }}>
            {recomp ? "Weight stays steady while you lose fat and build muscle." : pace.text}
            {goal.targetBodyFatPct != null && ` · body fat ${summary.bodyFatPct ?? "?"}% → ${goal.targetBodyFatPct}%`}
          </Text>
        </View>

        <TargetCard summary={summary} />

        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatTile
            label="BMI"
            value={String(summary.bmi.value)}
            sub={summary.bmi.category.charAt(0).toUpperCase() + summary.bmi.category.slice(1)}
          />
          <StatTile label="BMR" value={formatInt(summary.plan.bmr)} sub="kcal at rest" />
          <StatTile
            label="Workouts"
            value={`${plan.data.training.daysPerWeek}×`}
            sub={`a week, ${plan.data.training.sessionMinutes} min`}
          />
        </View>
      </View>

      {summary.plan.warnings.length > 0 && (
        <View style={{ gap: 6 }}>
          {summary.plan.warnings.map((w) => (
            <View key={w} style={{ flexDirection: "row", gap: 8 }}>
              <View style={styles.bullet} />
              <Text variant="labelRegular" color={c.ink2} style={{ flex: 1, lineHeight: 18 }}>
                {w}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  /** v2 summary card: white, radius 20, card lift, 20 padding. */
  card: { backgroundColor: c.surface, borderRadius: radius.card, padding: 20, gap: 12, ...shadows.card },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.ink3, marginTop: 9 },
}));
