import type { SessionBlock, TrainingDayDto, TrainingLogDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Lightbulb, Pause, Play, Square } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, Vibration, View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { QueryError } from "@/components/query-error";
import { Sheet } from "@/components/sheet";
import { WorkoutSkeleton } from "@/components/skeletons";
import { Button, Card, FieldError, NumberField, Screen, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { recentDays } from "@/lib/meal-param";
import { handlePremiumError } from "@/lib/premium";
import { trainingWeekQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { showToast } from "@/lib/toast";
import { dayColors, DAY_LABEL, EFFORT_LABEL, kcalText } from "@/lib/training";
import { makeStyles, radius, useColors, type Colors } from "@/lib/theme";

const VERB: Record<string, { start: string; done: string; did: string }> = {
  run: { start: "Start run", done: "Finish run", did: "I already ran · log it" },
  hiit: { start: "Start intervals", done: "Finish intervals", did: "I already did it · log it" },
  cycle: { start: "Start ride", done: "Finish ride", did: "I already rode · log it" },
  yoga: { start: "Start flow", done: "Finish flow", did: "I already did it · log it" },
  walk: { start: "Start walk", done: "Finish walk", did: "I already walked · log it" },
};

const intensityColor = (c: Colors, i: SessionBlock["intensity"], fg: string) =>
  i === "hard" ? c.fat : i === "steady" ? fg : i === "rest" ? c.dayRest : c.track;

/** 16d: one day of the week (runs, rides, yoga, walks, rest) with a guided timer and "log it". */
export default function TrainingDayScreen() {
  const { date, start } = useLocalSearchParams<{ date: string; start?: string }>();
  const week = useQuery(trainingWeekQuery(date));
  const day = week.data?.days.find((d) => d.date === date);

  if (week.isPending)
    return (
      <Screen>
        <BackHeader />
        <WorkoutSkeleton />
      </Screen>
    );
  if (week.isError || !day)
    return (
      <Screen>
        <BackHeader />
        <QueryError error={week.error ?? new Error("That day isn't in your plan.")} onRetry={() => week.refetch()} />
      </Screen>
    );
  return <DayDetail day={day} today={week.data.today} autoStart={start === "1"} />;
}

function DayDetail({ day, today, autoStart }: { day: TrainingDayDto; today: string; autoStart: boolean }) {
  const c = useColors();
  const styles = useStyles();
  const col = dayColors(c, day.type);
  const verbs = VERB[day.type];
  // Sessions can be done and logged today or on the last 7 days (the API's window).
  const loggable = recentDays().includes(day.date);
  const canStart = Boolean(verbs) && day.date === today && day.blocks.length > 0;
  const [timerOn, setTimerOn] = useState(autoStart && canStart);
  const [logOpen, setLogOpen] = useState(false);
  const total = day.blocks.reduce((t, b) => t + b.minutes, 0) || 1;

  useEffect(() => {
    track("training_day_opened", { type: day.type, weekday: day.weekday });
  }, [day.type, day.weekday]);

  return (
    <Screen>
      <BackHeader>
        <View style={{ flexDirection: "row" }}>
          <View style={[styles.badge, { backgroundColor: col.soft }]}>
            <Text size={12} weight={700} color={col.fg}>
              {day.weekday} · {DAY_LABEL[day.type]}
            </Text>
          </View>
        </View>
      </BackHeader>

      <View style={{ gap: 6 }}>
        <Text variant="h1">{day.title}</Text>
        <Text color={c.ink2}>{day.why}</Text>
      </View>

      {day.type !== "rest" && (
        <Card style={{ flexDirection: "row", gap: 12 }}>
          <Stat label="Time" value={`${day.minutes} min`} />
          {day.distanceKm != null && <Stat label="Running" value={`~${day.distanceKm} km`} />}
          <Stat label={day.logs.length ? "Burned about" : "Burns about"} value={`${kcalText(day.kcal)} kcal`} />
          {day.distanceKm == null && <Stat label="Effort" value={EFFORT_LABEL[day.effort]} />}
        </Card>
      )}

      {timerOn ? (
        <SessionTimer day={day} onStop={() => setTimerOn(false)} />
      ) : (
        <>
          {day.blocks.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text variant="h2">The session</Text>
              <View
                style={styles.bar}
                accessible
                accessibilityLabel={day.blocks.map((b) => `${b.label} ${b.minutes} min`).join(", ")}
              >
                {day.blocks.map((b, i) => (
                  <View
                    key={i}
                    style={{
                      flex: b.minutes / total,
                      backgroundColor: intensityColor(c, b.intensity, col.fg),
                      marginLeft: i ? 2 : 0,
                    }}
                  />
                ))}
              </View>
              {day.pace && (
                <Text size={13} color={c.ink2}>
                  Easy pace: {day.pace}. If you can&apos;t talk in full sentences, slow down.
                </Text>
              )}
            </View>
          )}
          <View style={{ borderRadius: radius.card, backgroundColor: c.surface }}>
            {day.steps.map((s, i) => (
              <View
                key={`${s.name}-${i}`}
                style={[styles.step, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}
              >
                <Text weight={600} style={{ flex: 1 }}>
                  {s.name}
                </Text>
                <Text size={13} color={c.ink3} tabular style={{ flexShrink: 1, textAlign: "right" }}>
                  {s.detail}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {day.tips.length > 0 && !timerOn && (
        <View style={{ gap: 8 }}>
          <Text variant="h2">Coach tips</Text>
          {day.tips.map((t) => (
            <View key={t} style={styles.tip}>
              <Lightbulb size={16} color={c.carbsText} style={{ marginTop: 2 }} />
              <Text size={14} color={c.ink2} style={{ flex: 1 }}>
                {t}
              </Text>
            </View>
          ))}
        </View>
      )}

      {day.logs.length > 0 && (
        <Card>
          <Text weight={700}>Done</Text>
          {day.logs.map((l) => (
            <LoggedRow key={l.id} log={l} />
          ))}
        </Card>
      )}

      {!timerOn && verbs && (
        <View style={{ gap: 10 }}>
          {canStart && (
            <Button
              icon={Play}
              onPress={() => {
                setTimerOn(true);
              }}
            >
              {verbs.start}
            </Button>
          )}
          {loggable ? (
            <Button variant="secondary" onPress={() => setLogOpen(true)}>
              {day.logs.length ? "Change what you logged" : verbs.did}
            </Button>
          ) : (
            <Text size={13} color={c.ink3} center>
              {day.date > today ? `This session is planned for ${day.weekday}.` : "This day is too long ago to log."}
            </Text>
          )}
        </View>
      )}
      {day.type === "rest" && (
        <Text size={13} color={c.ink3} center>
          Rest is part of the plan. Fancy a walk anyway? Log it from a walk day.
        </Text>
      )}

      <LogSheet open={logOpen} onClose={() => setLogOpen(false)} day={day} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text size={12} weight={600} color={c.ink3}>
        {label}
      </Text>
      <Text weight={700} tabular>
        {value}
      </Text>
    </View>
  );
}

function LoggedRow({ log }: { log: TrainingLogDto }) {
  const c = useColors();
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ flex: 1 }} tabular>
        {DAY_LABEL[log.type]} · {log.minutes} min{log.distanceKm ? ` · ${log.distanceKm} km` : ""} ·{" "}
        {kcalText(log.kcal)} kcal
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove this session"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await api(`/api/training/logs/${log.id}`, { method: "DELETE" });
            await queryClient.invalidateQueries({ queryKey: ["training"] });
          } catch (e) {
            if (!handlePremiumError(e)) showToast("Couldn't remove it. Try again.");
          } finally {
            setBusy(false);
          }
        }}
        style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}
      >
        <Text weight={600} size={13} color={c.danger}>
          Remove
        </Text>
      </Pressable>
    </View>
  );
}

async function logSession(day: TrainingDayDto, minutes: number, distanceKm?: number) {
  const type = day.type === "rest" ? "walk" : day.type;
  await api("/api/training/logs", {
    json: { date: day.date, type, minutes, ...(distanceKm ? { distanceKm } : {}) },
  });
  track("training_session_logged", { type, minutes });
  await queryClient.invalidateQueries({ queryKey: ["training"] });
}

/**
 * The guided session: the current block, time left in it, what's next. Time comes from the start
 * timestamp, so it stays right if the phone locks or the app is in the background.
 */
function SessionTimer({ day, onStop }: { day: TrainingDayDto; onStop: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const col = dayColors(c, day.type);
  const verbs = VERB[day.type]!;
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pausedMs, setPausedMs] = useState(0);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastBlock = useRef(0);

  useEffect(() => {
    track("training_session_started", { type: day.type, minutes: day.minutes });
  }, [day.type, day.minutes]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    const sub = AppState.addEventListener("change", () => setNow(Date.now()));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const elapsedMs = Math.max(0, (pausedAt ?? now) - startedAt - pausedMs);
  const elapsedMin = elapsedMs / 60_000;
  let acc = 0;
  let index = day.blocks.length;
  for (let i = 0; i < day.blocks.length; i++) {
    if (elapsedMin < acc + day.blocks[i]!.minutes) {
      index = i;
      break;
    }
    acc += day.blocks[i]!.minutes;
  }
  const done = index >= day.blocks.length;
  const block = day.blocks[Math.min(index, day.blocks.length - 1)]!;
  const leftSec = done ? 0 : Math.ceil((acc + block.minutes - elapsedMin) * 60);
  const next = day.blocks[index + 1];

  useEffect(() => {
    if (index !== lastBlock.current) {
      lastBlock.current = index;
      Vibration.vibrate(done ? [0, 300, 150, 300] : 250);
    }
  }, [index, done]);

  const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  async function finish() {
    const minutes = Math.min(300, Math.max(1, Math.round(elapsedMin)));
    setBusy(true);
    setError(null);
    try {
      await logSession(day, minutes);
      showToast(`Logged ${minutes} min`);
      onStop();
      if (router.canGoBack()) router.back();
    } catch (e) {
      if (!handlePremiumError(e)) setError(e instanceof Error ? e.message : "Couldn't log it. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 16 }}>
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text variant="meta">{done ? "All blocks done" : `Block ${index + 1} of ${day.blocks.length}`}</Text>
        <Text variant="h2" size={22} center>
          {done ? "Nice work" : block.label}
        </Text>
        <Text
          size={56}
          weight={700}
          tabular
          color={block.intensity === "hard" && !done ? c.fat : col.fg}
          accessibilityLiveRegion="polite"
        >
          {clock(leftSec)}
        </Text>
        <Text size={13} color={c.ink3} tabular>
          {clock(Math.floor(elapsedMs / 1000))} of {day.minutes}:00
          {next && !done ? ` · next: ${next.label}` : ""}
        </Text>
      </View>
      <View style={styles.bar}>
        <View style={{ flex: Math.min(1, elapsedMin / day.minutes), backgroundColor: col.fg }} />
        <View style={{ flex: Math.max(0, 1 - elapsedMin / day.minutes), backgroundColor: c.track }} />
      </View>
      {error && <FieldError>{error}</FieldError>}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            icon={pausedAt ? Play : Pause}
            onPress={() => {
              if (pausedAt) {
                setPausedMs((p) => p + (Date.now() - pausedAt));
                setPausedAt(null);
              } else setPausedAt(Date.now());
            }}
          >
            {pausedAt ? "Resume" : "Pause"}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button icon={Square} loading={busy} onPress={finish} disabled={elapsedMs < 30_000}>
            {verbs.done}
          </Button>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setStartedAt(Date.now());
          setPausedMs(0);
          setPausedAt(null);
          onStop();
        }}
        style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Text weight={600} color={c.ink3}>
          Cancel without logging
        </Text>
      </Pressable>
    </Card>
  );
}

/** "I already ran · log it": duration and, for runs and rides, an optional distance. */
function LogSheet({ open, onClose, day }: { open: boolean; onClose: () => void; day: TrainingDayDto }) {
  const c = useColors();
  const last = day.logs[0];
  const [minutes, setMinutes] = useState(String(last?.minutes ?? (day.minutes || 30)));
  const [km, setKm] = useState(last?.distanceKm ? String(last.distanceKm) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const withDistance = day.type === "run" || day.type === "hiit" || day.type === "cycle";

  async function save() {
    const m = Math.round(Number(minutes.replace(",", ".")));
    const d = km.trim() ? Number(km.replace(",", ".")) : undefined;
    if (!Number.isFinite(m) || m < 1 || m > 300) return setError("Enter 1 to 300 minutes.");
    if (d !== undefined && (!Number.isFinite(d) || d < 0.1 || d > 200))
      return setError("Enter a distance from 0.1 to 200 km, or leave it empty.");
    setBusy(true);
    setError(null);
    try {
      await logSession(day, m, d);
      showToast("Session logged");
      onClose();
    } catch (e) {
      if (!handlePremiumError(e)) setError(e instanceof Error ? e.message : "Couldn't log it. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Log ${day.title.toLowerCase()}`}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <NumberField label="How long" unit="min" value={minutes} onValueChange={setMinutes} />
          {withDistance && <NumberField label="Distance (optional)" unit="km" value={km} onValueChange={setKm} />}
        </View>
        {withDistance && (
          <Text size={13} color={c.ink3}>
            With a distance, your easy pace adjusts after 2 logged runs.
          </Text>
        )}
        {error && <FieldError>{error}</FieldError>}
        <Button onPress={save} loading={busy}>
          Log it
        </Button>
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((c) => ({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  bar: { flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", backgroundColor: c.track },
  step: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  tip: { flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.input, backgroundColor: c.surface },
}));
