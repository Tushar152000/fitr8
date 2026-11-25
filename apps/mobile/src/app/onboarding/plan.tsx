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
import { Button, Card, Screen, StatTile, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { longDate } from "@/lib/dates";
import { formatInt } from "@/lib/format";
import { paceLine } from "@/lib/plan-pace";
import { planQuery } from "@/lib/queries";
import { makeStyles, useColors } from "@/lib/theme";

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
      <Screen gutter={24}>
        <StepsBar current={4} total={4} />
        <PlanSkeleton />
      </Screen>
    );
  }
  if (plan.isError) {
    return (
      <Screen gutter={24}>
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
      gutter={24}
      footer={
        <Button onPress={start} loading={starting}>
          Start my plan
        </Button>
      }
    >
      <StepsBar current={4} total={4} />
      <View style={{ gap: 12 }}>
        <Text variant="h1">Your plan</Text>
        <PlanBadge
          icon={<CircleCheck size={16} color={c.protein} />}
          label={pace.atTarget && !recomp ? "At your target weight" : "Realistic goal"}
          color={c.protein}
          background={c.proteinSoft}
        />
      </View>

      <View style={{ gap: 12 }}>
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Text weight={600} size={12} color={c.ink3}>
                Now
              </Text>
              <Text variant="h1" size={26} tabular>
                {metric.weightKg}{" "}
                <Text weight={600} size={15} color={c.ink3}>
                  kg
                </Text>
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text weight={600} size={12} color={c.ink3}>
                Goal · {longDate(goal.targetDate)}
              </Text>
              <Text variant="h1" size={26} tabular>
                {recomp ? "Hold" : summary.plan.targetWeightKg}{" "}
                <Text weight={600} size={15} color={c.ink3}>
                  {recomp ? "weight" : "kg"}
                </Text>
              </Text>
            </View>
          </View>
          <ProjectionLine from={metric.weightKg} to={recomp ? metric.weightKg : summary.plan.targetWeightKg} />
          <Text size={13} color={c.ink2}>
            {recomp ? "Weight stays steady while you lose fat and build muscle." : pace.text}
            {goal.targetBodyFatPct != null && ` · body fat ${summary.bodyFatPct ?? "?"}% → ${goal.targetBodyFatPct}%`}
          </Text>
        </Card>

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
              <Text size={13} color={c.ink2} style={{ flex: 1 }}>
                {w}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.ink3, marginTop: 9 },
}));
