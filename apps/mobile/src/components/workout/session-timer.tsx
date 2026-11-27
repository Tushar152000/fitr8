import type { TrainingDayDto } from "@fitr8/contracts";
import { router } from "expo-router";
import { Pause, Play, Square } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AppState, Vibration, View } from "react-native";
import { clearSession, readSession, saveSession, togglePause, useActiveSession } from "@/lib/session-store";
import { Button, FieldError, PressableScale, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { errorMessage } from "@/lib/api";
import { handlePremiumError } from "@/lib/premium";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { dayColors, logSession, SESSION_VERB, sessionMinutes } from "@/lib/training";
import { TrackBar } from "./track-bar";

/** "m:ss" */
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/**
 * The guided session: the current block, time left in it, what's next. Time comes from the start
 * timestamp, so it stays right if the phone locks or the app is in the background. The timing is
 * saved on the phone (`lib/session-store.ts`) on every start, pause and resume, so leaving the
 * screen or closing the app resumes it where it was (paused stays paused); cleared once logged.
 */
export function SessionTimer({ day, onStop }: { day: TrainingDayDto; onStop: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const col = dayColors(c, day.type);
  const verbs = SESSION_VERB[day.type]!;
  // Resume a session left mid-way (screen closed, app killed), else start now.
  // The shared session store is the one source of truth (the live bar can pause it too). A session
  // left mid-way resumes; otherwise this screen starts one now.
  const meta = { date: day.date, type: day.type, title: day.title, minutes: day.minutes };
  const [saved] = useState(() => readSession(day.date, day.type));
  const [fresh] = useState(() => ({ startedAt: Date.now(), pausedMs: 0, pausedAt: null as number | null }));
  const live = useActiveSession();
  const mine = live && live.date === day.date && live.type === day.type ? live : null;
  const { startedAt, pausedMs, pausedAt } = mine ?? saved ?? fresh;
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastBlock = useRef(0);

  // Starting (or resuming a saved one) makes it the active session: saved on the phone, shown in
  // the live bar, with its notifications. Pause / resume go through the store too.
  useEffect(() => {
    if (!saved) track("training_session_started", { type: day.type, minutes: day.minutes });
    if (!mine) saveSession(meta, saved ?? fresh);
    // Once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  async function finish() {
    const minutes = sessionMinutes(elapsedMin);
    setBusy(true);
    setError(null);
    try {
      await logSession(day, minutes);
      clearSession(day.date, day.type);
      showToast(`Logged ${minutes} min`);
      onStop();
      if (router.canGoBack()) router.back();
    } catch (e) {
      if (!handlePremiumError(e)) setError(errorMessage(e, "Couldn't log it. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text variant="labelStrong" color={c.ink2}>
          {done ? "All blocks done" : `Block ${index + 1} of ${day.blocks.length}`}
        </Text>
        <Text variant="heading1" center>
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
        <Text variant="labelMedium" color={c.ink2} tabular>
          {clock(Math.floor(elapsedMs / 1000))} of {day.minutes}:00
          {next && !done ? ` · next: ${next.label}` : ""}
        </Text>
      </View>
      <TrackBar>
        <View style={{ flex: Math.min(1, elapsedMin / day.minutes), backgroundColor: col.fg }} />
        <View style={{ flex: Math.max(0, 1 - elapsedMin / day.minutes), backgroundColor: c.track }} />
      </TrackBar>
      {error && <FieldError>{error}</FieldError>}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            icon={pausedAt ? Play : Pause}
            onPress={() => {
              togglePause();
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
      <PressableScale
        accessibilityRole="button"
        onPress={() => {
          clearSession(day.date, day.type);
          onStop();
        }}
        style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Text variant="bodyStrong" color={c.ink2}>
          Cancel without logging
        </Text>
      </PressableScale>
    </View>
  );
}

// The guided timer is the day's hero: v2 card, 20 px padding.
const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 16, padding: 20, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
}));
