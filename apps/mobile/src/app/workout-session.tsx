import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Clock, Dumbbell, ListOrdered } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { QueryError } from "@/components/query-error";
import { WorkoutSkeleton } from "@/components/skeletons";
import { Button, FieldError, Screen, Text } from "@/components/ui";
import { ActiveExercise, type SetState } from "@/components/workout/session/active-exercise";
import { SessionDoneCard } from "@/components/workout/session/done-card";
import { ExerciseList } from "@/components/workout/session/exercise-list";
import { Pill } from "@/components/workout/session/pill";
import { RestDay } from "@/components/workout/session/rest-day";
import { WeekStrip } from "@/components/workout/session/week-strip";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { useEnergy } from "@/lib/energy";
import { handlePremiumError } from "@/lib/premium";
import { workoutQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { showToast } from "@/lib/toast";
import { minutesSince } from "@/lib/training";
import type { Energy, TodayWorkout } from "@/lib/types";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/**
 * Focus mode (15b, from the Workout tab's "Start workout"): today's gym session from the strength
 * engine, with the 10a energy check applied. Finishing logs the session's duration to the week.
 */
export default function WorkoutSessionScreen() {
  const energy = useEnergy();
  const workout = useQuery(workoutQuery(energy));
  const pull = usePullRefresh(() => workout.refetch());

  if (workout.isPending) {
    return (
      <Screen>
        <BackHeader />
        <WorkoutSkeleton />
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
  return (
    <Session
      key={`${workout.data.planId}-${energy}`}
      data={workout.data}
      energy={energy}
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
    />
  );
}

function Session({
  data,
  energy,
  refreshing,
  onRefresh,
}: {
  data: TodayWorkout;
  energy: Energy;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const session = data.session;
  const [active, setActive] = useState(() => {
    const open = session?.exercises.findIndex((e) => !data.completed.includes(e.slug)) ?? 0;
    return Math.max(0, open);
  });
  const [sets, setSets] = useState<SetState[][]>(
    () =>
      session?.exercises.map((e) =>
        Array.from({ length: e.sets }, () => ({
          kg: e.targetKg != null ? String(e.targetKg) : "",
          reps: "",
          done: data.completed.includes(e.slug),
        })),
      ) ?? [],
  );
  const [saved, setSaved] = useState<Record<string, string>>({});
  // When the session started (focus mode opened), for the logged duration.
  const [startedAt] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracked = useRef(false);
  useEffect(() => {
    if (!session || tracked.current) return;
    tracked.current = true;
    track("training_session_started", { type: "gym", minutes: session.estimatedMinutes });
  }, [session]);

  async function finish() {
    if (!session) return;
    const minutes = minutesSince(startedAt);
    setFinishing(true);
    try {
      await api("/api/training/logs", {
        json: {
          date: session.date,
          type: "gym",
          minutes,
          exercises: session.exercises.map((e, i) => ({
            name: e.name,
            sets: sets[i]?.filter((x) => x.done).length || undefined,
            reps: Math.round(Number(sets[i]?.find((x) => x.done)?.reps) || 0) || undefined,
            kg: e.targetKg ?? undefined,
          })),
        },
      });
      track("training_session_logged", { type: "gym", minutes });
      setFinished(true);
      showToast(`Logged ${minutes} min`);
      void queryClient.invalidateQueries({ queryKey: ["training"] });
    } catch (e) {
      if (!handlePremiumError(e)) setError(errorMessage(e, "Couldn't log the session. Try again."));
    } finally {
      setFinishing(false);
    }
  }

  const doneCount = sets.filter((s) => s.length && s.every((x) => x.done)).length;
  const allDone = session != null && doneCount === session.exercises.length;

  function update(i: number, patch: Partial<SetState>) {
    setSets((all) => all.map((ex, j) => (j === active ? ex.map((s, k) => (k === i ? { ...s, ...patch } : s)) : ex)));
  }

  async function toggle(i: number) {
    if (!session) return;
    const ex = session.exercises[active];
    const current = sets[active];
    const nowDone = !current[i].done;
    const reps = current[i].reps || String(ex.repMax);
    const next = current.map((s, k) => (k === i ? { ...s, done: nowDone, reps } : s));
    setSets((all) => all.map((e, j) => (j === active ? next : e)));
    if (!nowDone || !next.every((s) => s.done)) return;

    // Last set of this exercise ticked: log it and show next time's target.
    setError(null);
    try {
      const res = await api<{ next: { note: string } }>("/api/workouts/logs", {
        json: {
          planId: data.planId,
          exerciseSlug: ex.slug,
          sets: next.map((s) => ({
            kg: s.kg.trim() === "" ? null : Number(s.kg),
            reps: Math.round(Number(s.reps) || 0),
            rir: ex.rir,
          })),
        },
      });
      setSaved((m) => ({ ...m, [ex.slug]: res.next.note }));
      // Other energy variants of today's session are now stale (their "completed" list).
      queryClient.invalidateQueries({ queryKey: ["workout"], refetchType: "none" });
      const nextOpen = session.exercises.findIndex((_, j) => j > active && !sets[j]?.every((s) => s.done));
      if (nextOpen > 0) setActive(nextOpen);
    } catch (e) {
      setError(errorMessage(e, "Couldn't save that exercise. Try again."));
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <BackHeader />
      <View>
        <Text variant="meta">
          {session ? "Today's session" : "Rest day"} · {data.split}
          {data.deload ? " · deload week" : ""}
        </Text>
        <Text variant="h1">{session ? session.name : "Recover today"}</Text>
      </View>

      <WeekStrip strip={data.strip} />

      {!session ? (
        <RestDay data={data} />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pill icon={Clock} text={`~${session.estimatedMinutes} min`} />
            <Pill icon={ListOrdered} text={`${session.exercises.length} exercises`} />
            <Pill icon={Dumbbell} text={`energy: ${energy}`} onPress={() => router.push("/briefing")} />
          </View>

          <ActiveExercise
            ex={session.exercises[active]}
            index={active}
            total={session.exercises.length}
            doneCount={doneCount}
            sets={sets[active]}
            saved={saved[session.exercises[active].slug]}
            onChange={update}
            onToggle={toggle}
          />
          {error && <FieldError>{error}</FieldError>}

          {allDone && <SessionDoneCard />}
          {doneCount > 0 && !finished && (
            <Button loading={finishing} onPress={finish}>
              Finish and log workout
            </Button>
          )}
          {finished && (
            <Button
              variant="secondary"
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/workout"))}
            >
              Back to your week
            </Button>
          )}

          <ExerciseList exercises={session.exercises} sets={sets} active={active} onSelect={setActive} />
        </>
      )}
    </Screen>
  );
}
