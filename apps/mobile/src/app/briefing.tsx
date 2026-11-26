import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { QueryError } from "@/components/query-error";
import { BriefingSkeleton } from "@/components/skeletons";
import { Button, PageHeader, Screen, Text } from "@/components/ui";
import { CoachRules } from "@/components/workout/briefing/coach-rules";
import { EnergyCheck } from "@/components/workout/briefing/energy-check";
import { FuelCard } from "@/components/workout/briefing/fuel-card";
import { SessionPlan } from "@/components/workout/briefing/session-plan";
import { SnackCard, type SnackState } from "@/components/workout/briefing/snack-card";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { weekdayName } from "@/lib/dates";
import { setEnergy, useEnergy } from "@/lib/energy";
import { workoutQuery } from "@/lib/queries";
import { refreshDay } from "@/lib/query";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { Energy, TodayWorkout } from "@/lib/types";
import { haptic } from "@/lib/haptics";

/** Screen 10a: fuel, pre-workout snack, energy check, the coach's rules and today's prescriptions. */
export default function BriefingScreen() {
  const energy = useEnergy();
  const workout = useQuery({ ...workoutQuery(energy), placeholderData: keepPreviousData });

  if (workout.isPending) {
    return (
      <Screen>
        <PageHeader eyebrow="Coach briefing" title="Today" />
        <BriefingSkeleton />
      </Screen>
    );
  }
  if (workout.isError) {
    return (
      <Screen>
        <PageHeader eyebrow="Coach briefing" title="Today" />
        <QueryError error={workout.error} onRetry={() => workout.refetch()} />
      </Screen>
    );
  }
  return <Briefing data={workout.data} energy={energy} switching={workout.isPlaceholderData} />;
}

function Briefing({ data, energy, switching }: { data: TodayWorkout; energy: Energy; switching: boolean }) {
  const c = useColors();
  const styles = useStyles();
  const [snackState, setSnackState] = useState<SnackState>("idle");
  const [error, setError] = useState<string | null>(null);
  const session = data.session;

  async function logSnack() {
    if (!data.snack) return;
    setSnackState("saving");
    setError(null);
    try {
      if (data.snack.log.kind === "usual") {
        await api("/api/meals/relog", { json: { mealId: data.snack.log.mealId, mealType: "SNACK" } });
      } else {
        await api("/api/meals/log-items", { json: { mealType: "SNACK", items: data.snack.log.items } });
      }
      setSnackState("done");
      track("meal_logged", { method: data.snack.log.kind === "usual" ? "usual" : "type" });
      haptic.success();
      refreshDay();
    } catch (e) {
      setError(errorMessage(e, "Couldn't log it. Try again."));
      setSnackState("idle");
    }
  }

  if (!session) {
    return (
      <Screen>
        <PageHeader eyebrow="Coach briefing" title="Rest day" />
        <View style={styles.card}>
          <Text variant="bodySm" color={c.ink2}>
            {data.cardio}
          </Text>
        </View>
        {data.nextDay && (
          <Text variant="bodySm" color={c.ink2}>
            Next: <Text variant="bodyStrong">{data.nextDay.name}</Text> on {weekdayName(data.nextDay.date)}.
          </Text>
        )}
        <Button variant="secondary" onPress={() => router.navigate("/workout")}>
          See this week
        </Button>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button onPress={() => (router.canGoBack() ? router.back() : router.navigate("/workout-session"))}>
          Start workout
        </Button>
      }
    >
      <PageHeader
        eyebrow={`Coach briefing${data.deload ? " · deload week" : ""}`}
        title={`${session.name} · ${data.sessionMinutes} min`}
      />
      <View style={{ gap: 16, opacity: switching ? 0.6 : 1 }}>
        <FuelCard fuel={data.fuel} />
        {data.fuel.low && data.snack && (
          <SnackCard snack={data.snack} state={snackState} error={error} onLog={logSnack} />
        )}
        <EnergyCheck value={energy} onChange={setEnergy} />
        <CoachRules rules={session.rules} />
        <SessionPlan session={session} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { padding: 16, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
}));
