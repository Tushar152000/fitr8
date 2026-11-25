import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { QueryError } from "@/components/query-error";
import { BriefingSkeleton } from "@/components/skeletons";
import { Button, Card, Screen, Text } from "@/components/ui";
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
import { useColors } from "@/lib/theme";
import type { Energy, TodayWorkout } from "@/lib/types";

/** Screen 10a: fuel, pre-workout snack, energy check, the coach's rules and today's prescriptions. */
export default function BriefingScreen() {
  const energy = useEnergy();
  const workout = useQuery({ ...workoutQuery(energy), placeholderData: keepPreviousData });

  if (workout.isPending) {
    return (
      <Screen>
        <BackHeader />
        <BriefingSkeleton />
      </Screen>
    );
  }
  if (workout.isError) {
    return (
      <Screen>
        <BackHeader />
        <QueryError error={workout.error} onRetry={() => workout.refetch()} />
      </Screen>
    );
  }
  return <Briefing data={workout.data} energy={energy} switching={workout.isPlaceholderData} />;
}

function Briefing({ data, energy, switching }: { data: TodayWorkout; energy: Energy; switching: boolean }) {
  const c = useColors();
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
      refreshDay();
    } catch (e) {
      setError(errorMessage(e, "Couldn't log it. Try again."));
      setSnackState("idle");
    }
  }

  if (!session) {
    return (
      <Screen>
        <BackHeader />
        <View>
          <Text variant="meta">Coach briefing</Text>
          <Text variant="h1">Rest day</Text>
        </View>
        <Card>
          <Text color={c.ink2}>{data.cardio}</Text>
        </Card>
        {data.nextDay && (
          <Text color={c.ink2}>
            Next: <Text weight={600}>{data.nextDay.name}</Text> on {weekdayName(data.nextDay.date)}.
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
      <BackHeader />
      <View style={{ gap: 16, opacity: switching ? 0.6 : 1 }}>
        <View>
          <Text variant="meta">Coach briefing{data.deload ? " · deload week" : ""}</Text>
          <Text variant="h1">
            {session.name} · {data.sessionMinutes} min
          </Text>
        </View>
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
