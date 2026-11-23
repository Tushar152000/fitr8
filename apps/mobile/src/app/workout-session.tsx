import { useQuery } from "@tanstack/react-query";
import { WorkoutSkeleton } from "@/components/skeletons";
import { router } from "expo-router";
import {
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  ListOrdered,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { QueryError } from "@/components/query-error";
import { Button, Card, FieldError, Screen, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { handlePremiumError } from "@/lib/premium";
import { showToast } from "@/lib/toast";
import { useEnergy } from "@/lib/energy";
import { workoutQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { fonts, makeStyles, radius, useColors, type Colors } from "@/lib/theme";
import type { AdjustedExercise, DayState, Energy, TodayWorkout } from "@/lib/types";

type SetState = { kg: string; reps: string; done: boolean };

/** Whole minutes since a start time, 1–300 (the training log's range). */
const minutesSince = (start: number) => Math.min(300, Math.max(1, Math.round((Date.now() - start) / 60_000)));

const weekday = (ymd: string, style: "long" | "narrow" = "long") =>
  new Intl.DateTimeFormat("en-IN", { weekday: style, timeZone: "UTC" }).format(new Date(ymd));

const repsLabel = (e: { repMin: number; repMax: number; timed: boolean }) =>
  `${e.repMin}–${e.repMax}${e.timed ? " s" : ""}`;

const roleLabel = (role: AdjustedExercise["role"]) =>
  role === "main" ? "Main lift" : role === "secondary" ? "Second lift" : "Accessory";

/**
 * Focus mode (15b, from the Workout tab's "Start workout"): today's gym session from the strength
 * engine, with the 10a energy check applied. Finishing logs the session's duration to the week.
 */
export default function WorkoutSessionScreen() {
  const energy = useEnergy();
  const workout = useQuery(workoutQuery(energy));

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
      refreshing={workout.isRefetching}
      onRefresh={() => workout.refetch()}
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
  const c = useColors();
  const styles = useStyles();
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
      if (!handlePremiumError(e)) setError(e instanceof Error ? e.message : "Couldn't log the session. Try again.");
    } finally {
      setFinishing(false);
    }
  }
  const [error, setError] = useState<string | null>(null);

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
      setError(e instanceof Error ? e.message : "Couldn't save that exercise. Try again.");
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

          {allDone && (
            <View style={styles.doneCard}>
              <Utensils size={20} color={c.protein} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text weight={700}>Session done. Protein next.</Text>
                <Text size={13} color={c.ink2}>
                  Aim for 25–40 g of protein at your next meal to help recovery.
                </Text>
                <Pressable accessibilityRole="link" onPress={() => router.push("/log/type")}>
                  <Text weight={600} size={13} color={c.brandText}>
                    Log your next meal
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
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

          <View style={{ gap: 8 }}>
            <Text variant="h2">Recommended exercises</Text>
            {session.exercises.map((e, i) => {
              const done = sets[i]?.every((s) => s.done);
              return (
                <Pressable
                  key={e.slug}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i === active }}
                  onPress={() => setActive(i)}
                  style={[styles.exercise, i === active && { borderColor: c.ink }]}
                >
                  <View style={[styles.num, { backgroundColor: done ? c.protein : c.sunken }]}>
                    {done ? (
                      <Check size={16} color={c.surface} strokeWidth={3} accessibilityLabel="Done" />
                    ) : (
                      <Text weight={700} size={13} color={c.ink2}>
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text weight={600}>{e.name}</Text>
                    <Text size={13} color={c.ink3} tabular>
                      {e.sets} × {repsLabel(e)}
                      {e.targetKg != null ? ` · ${e.targetKg} kg` : ""} · {e.rir} in reserve
                    </Text>
                  </View>
                  <ChevronRight size={20} color={c.ink3} />
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const stripStyles = (c: Colors): Record<DayState, { bg: string; fg: string; border?: string; dashed?: boolean }> => ({
  today: { bg: c.strong, fg: c.onStrong },
  done: { bg: c.proteinSoft, fg: c.protein },
  planned: { bg: c.surface, fg: c.ink, border: c.lineStrong },
  missed: { bg: c.surface, fg: c.ink3, border: c.lineStrong, dashed: true },
  rest: { bg: c.sunken, fg: c.ink3 },
  before: { bg: c.sunken, fg: c.ink3 },
});

function WeekStrip({ strip }: { strip: TodayWorkout["strip"] }) {
  const c = useColors();
  const styles = useStyles();
  const STRIP = stripStyles(c);
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel="This week">
      {strip.map((d) => {
        const s = STRIP[d.state];
        return (
          <View
            key={d.date}
            accessibilityLabel={`${weekday(d.date)}: ${d.name ?? "rest"}, ${d.state}`}
            style={[
              styles.day,
              { backgroundColor: s.bg },
              s.border && { borderWidth: 1, borderColor: s.border, borderStyle: s.dashed ? "dashed" : "solid" },
            ]}
          >
            <Text weight={700} size={12} color={s.fg}>
              {weekday(d.date, "narrow")}
            </Text>
            {d.state === "done" ? (
              <Check size={14} color={s.fg} strokeWidth={3} />
            ) : (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: d.state === "rest" ? "transparent" : s.fg,
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

function Pill({ icon: Icon, text, onPress }: { icon: LucideIcon; text: string; onPress?: () => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.pill}>
      <Icon size={16} color={c.ink2} />
      <Text weight={600} size={14} color={c.ink2}>
        {text}
      </Text>
    </Pressable>
  );
}

function ActiveExercise({
  ex,
  index,
  total,
  doneCount,
  sets,
  saved,
  onChange,
  onToggle,
}: {
  ex: AdjustedExercise;
  index: number;
  total: number;
  doneCount: number;
  sets: SetState[];
  saved?: string;
  onChange: (i: number, patch: Partial<SetState>) => void;
  onToggle: (i: number) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const weighted = ex.targetKg != null;
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text weight={600} size={12} color={c.ink3}>
            {roleLabel(ex.role)} · exercise {index + 1} of {total}
          </Text>
          <Text variant="h2" size={22}>
            {ex.name}
          </Text>
          <Text size={13} color={c.ink2} tabular>
            {ex.sets} × {repsLabel(ex)} · {ex.rir} reps in reserve · rest {Math.round((ex.restSec / 60) * 2) / 2} min
          </Text>
        </View>
        <View style={styles.badge}>
          <Text weight={700} size={12} tabular>
            {doneCount}/{total} done
          </Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <View style={styles.setRow}>
          <Text weight={600} size={12} color={c.ink3} style={{ width: 32 }}>
            Set
          </Text>
          <Text weight={600} size={12} color={c.ink3} style={{ flex: 1 }}>
            {weighted ? "kg" : "Load"}
          </Text>
          <Text weight={600} size={12} color={c.ink3} style={{ flex: 1 }}>
            {ex.timed ? "Seconds" : "Reps"}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        {sets.map((s, i) => (
          <View key={i} style={styles.setRow}>
            <Text weight={700} tabular color={s.done ? c.ink3 : c.ink} style={{ width: 32 }}>
              {i + 1}
            </Text>
            <View style={{ flex: 1 }}>
              {weighted ? (
                <SetInput label={`Set ${i + 1} kg`} value={s.kg} onChange={(kg) => onChange(i, { kg })} />
              ) : (
                <Text weight={600} size={13} color={c.ink3}>
                  Bodyweight
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <SetInput
                label={`Set ${i + 1} ${ex.timed ? "seconds" : "reps"}`}
                value={s.reps}
                placeholder={repsLabel(ex)}
                onChange={(reps) => onChange(i, { reps })}
              />
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.done }}
              accessibilityLabel={`Set ${i + 1} done`}
              onPress={() => onToggle(i)}
              style={[styles.tick, { backgroundColor: s.done ? c.protein : c.sunken }]}
            >
              <Check size={20} strokeWidth={2.5} color={s.done ? c.surface : c.ink3} />
            </Pressable>
          </View>
        ))}
      </View>
      {ex.bonusRep && (
        <Text weight={600} size={13} color={c.protein}>
          Feeling great: take one extra rep on your last set.
        </Text>
      )}
      <View style={styles.hint}>
        <TrendingUp size={16} color={c.protein} style={{ marginTop: 2 }} />
        <Text size={13} color={c.ink2} style={{ flex: 1 }}>
          {saved
            ? `Saved. Next time: ${saved}`
            : (ex.note ??
              `Stop each set with ${ex.rir} good reps left. Top the range on every set and the load goes up.`)}
        </Text>
      </View>
    </Card>
  );
}

function RestDay({ data }: { data: TodayWorkout }) {
  const c = useColors();
  return (
    <>
      <Card>
        <Text color={c.ink2}>{data.cardio}</Text>
      </Card>
      {data.nextDay && (
        <View style={{ gap: 8 }}>
          <Text variant="h2">
            Next: {data.nextDay.name}, {weekday(data.nextDay.date)}
          </Text>
          <View style={{ borderRadius: radius.card, backgroundColor: c.surface }}>
            {data.nextDay.exercises.map((e, i) => (
              <View
                key={e.slug}
                style={[
                  {
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  },
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
                ]}
              >
                <Text weight={600} style={{ flex: 1 }}>
                  {e.name}
                </Text>
                <Text size={13} color={c.ink3} tabular>
                  {e.sets} × {repsLabel(e)}
                  {e.targetKg != null ? ` · ${e.targetKg} kg` : ""}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <Button variant="secondary" onPress={() => router.push("/briefing")}>
        Coach briefing
      </Button>
    </>
  );
}

function SetInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <TextInput
      accessibilityLabel={label}
      keyboardType="decimal-pad"
      value={value}
      placeholder={placeholder}
      placeholderTextColor={c.ink3}
      onChangeText={(v) => onChange(v.replace(",", "."))}
      style={styles.input}
    />
  );
}

const useStyles = makeStyles((c) => ({
  day: { flex: 1, height: 56, borderRadius: radius.input, alignItems: "center", justifyContent: "center", gap: 4 },
  pill: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 18,
    backgroundColor: c.chip,
    paddingHorizontal: 16,
  },
  badge: { borderRadius: 999, backgroundColor: c.sunken, paddingHorizontal: 10, paddingVertical: 4 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tick: { width: 44, height: 44, borderRadius: radius.input, alignItems: "center", justifyContent: "center" },
  input: {
    height: 44,
    borderRadius: radius.input,
    backgroundColor: c.sunken,
    paddingHorizontal: 12,
    fontFamily: fonts.sans600,
    fontSize: 15,
    color: c.ink,
    fontVariant: ["tabular-nums"],
  },
  hint: { flexDirection: "row", gap: 8, borderRadius: radius.input, backgroundColor: c.proteinSoft, padding: 12 },
  doneCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: radius.card,
    backgroundColor: c.proteinSoft,
    padding: 16,
  },
  exercise: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
}));
