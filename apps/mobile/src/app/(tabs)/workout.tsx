import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { QueryError } from "@/components/query-error";
import { WorkoutSkeleton } from "@/components/skeletons";
import { FadeIn, Screen } from "@/components/ui";
import { TrainingSetup } from "@/components/workout/setup";
import { TrainingWeekView } from "@/components/workout/week";
import { billingQuery, trainingStateQuery, trainingWeekQuery } from "@/lib/queries";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/**
 * The Workout tab. Without a training setup → 16b once, then 16c (the week, on today). Premium
 * sees the full plan; the free plan (2026-11-28, "a taste") sees the same flow as a preview: this
 * week only, gym days with their first two exercises, one full sample session, free logging (the
 * API marks the week `preview`). If Premium lapses the tab falls back to the preview; the setup
 * and logs are kept.
 */
export default function WorkoutTab() {
  const billing = useQuery(billingQuery);

  if (billing.isPending) return <Loading />;
  if (billing.isError)
    return (
      <Screen tabBar>
        <QueryError error={billing.error} onRetry={() => billing.refetch()} />
      </Screen>
    );
  return <Workouts />;
}

function Workouts() {
  const state = useQuery(trainingStateQuery);
  const [start, setStart] = useState<string | null>(null);
  const hasProfile = Boolean(state.data?.profile);
  const week = useQuery({ ...trainingWeekQuery(start), enabled: hasProfile, placeholderData: (prev) => prev });
  const pull = usePullRefresh(() => Promise.all([state.refetch(), week.refetch()]));

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
    <Screen tabBar refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
      {/* Keyed by week: the arrows cross-fade to the new week once it has loaded. */}
      <FadeIn key={week.data.start} style={[{ gap: 24 }, week.isPlaceholderData && { opacity: 0.6 }]}>
        <TrainingWeekView week={week.data} onWeek={setStart} />
      </FadeIn>
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
