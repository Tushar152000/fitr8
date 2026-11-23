import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { QueryError } from "@/components/query-error";
import { WorkoutSkeleton } from "@/components/skeletons";
import { Screen } from "@/components/ui";
import { WorkoutLocked } from "@/components/workout/locked";
import { TrainingSetup } from "@/components/workout/setup";
import { TrainingWeekView } from "@/components/workout/week";
import { billingQuery, trainingStateQuery, trainingWeekQuery } from "@/lib/queries";

/**
 * The Workout tab (spec "Workout unlock"). Free → 16a (locked, with the user's own numbers).
 * Premium without a training setup → 16b once, then 16c (the week, on today). If Premium lapses
 * the tab is locked again; the setup and logs are kept for when they come back.
 */
export default function WorkoutTab() {
  const params = useLocalSearchParams<{ source?: string }>();
  const billing = useQuery(billingQuery);

  if (billing.isPending) return <Loading />;
  if (billing.isError)
    return (
      <Screen tabBar>
        <QueryError error={billing.error} onRetry={() => billing.refetch()} />
      </Screen>
    );
  if (!billing.data.limits.workouts) return <WorkoutLocked source={params.source === "banner" ? "banner" : "tab"} />;
  return <PremiumWorkouts />;
}

function PremiumWorkouts() {
  const state = useQuery(trainingStateQuery);
  const [start, setStart] = useState<string | null>(null);
  const hasProfile = Boolean(state.data?.profile);
  const week = useQuery({ ...trainingWeekQuery(start), enabled: hasProfile, placeholderData: (prev) => prev });

  if (state.isPending) return <Loading />;
  if (state.isError)
    return (
      <Screen tabBar>
        <QueryError error={state.error} onRetry={() => state.refetch()} />
      </Screen>
    );
  if (!state.data.profile) return <TrainingSetup state={state.data} onDone={() => setStart(null)} />;
  if (week.isPending) return <Loading />;
  if (week.isError)
    return (
      <Screen tabBar>
        <QueryError error={week.error} onRetry={() => week.refetch()} />
      </Screen>
    );
  return (
    <Screen
      tabBar
      refreshing={week.isRefetching && !week.isPlaceholderData}
      onRefresh={() => {
        void state.refetch();
        void week.refetch();
      }}
    >
      <TrainingWeekView key={week.data.start} week={week.data} onWeek={setStart} />
    </Screen>
  );
}

function Loading() {
  return (
    <Screen tabBar>
      <WorkoutSkeleton />
    </Screen>
  );
}
