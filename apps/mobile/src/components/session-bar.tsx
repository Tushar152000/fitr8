import { router } from "expo-router";
import { Pause, Play } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from "react-native-reanimated";
import { PressableScale, RunIcon, Text } from "@/components/ui";
import { notifySessionRunning } from "@/lib/reminders";
import { elapsedOf, togglePause, useActiveSession } from "@/lib/session-store";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { localYmd } from "@/lib/meal-param";

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

/**
 * The live "session in progress" bar above the tab bar (2026-11-28, user request), on every tab:
 * the session, a live timer against its planned length, Pause / Resume, and a tap back into it.
 * Only for today's active session; hidden otherwise.
 */
export function SessionBar() {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const s = useActiveSession();
  const [now, setNow] = useState(() => Date.now());
  const today = s?.date === localYmd();
  useEffect(() => {
    if (!s || s.pausedAt || !today) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [s, today]);
  if (!s || !today) return null;
  const elapsed = elapsedOf(s, now);
  const fraction = Math.min(1, elapsed / (s.minutes * 60_000));

  return (
    <Animated.View
      entering={reduce ? undefined : FadeInDown.duration(250)}
      exiting={reduce ? undefined : FadeOutDown.duration(200)}
      style={styles.bar}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${s.title} ${s.pausedAt ? "paused" : "in progress"}, ${clock(elapsed)}. Open`}
        onPress={() => router.push({ pathname: "/training/[date]", params: { date: s.date, start: "1" } })}
        style={styles.main}
      >
        <View style={styles.icon}>
          <RunIcon size={16} color="#ffffff" strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="labelStrong" color="#ffffff" numberOfLines={1}>
            {s.title}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.7)" tabular>
            {s.pausedAt ? "Paused · " : ""}
            {clock(elapsed)} of {s.minutes}:00
          </Text>
        </View>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={s.pausedAt ? "Resume" : "Pause"}
        onPress={togglePause}
        hitSlop={8}
        style={styles.toggle}
      >
        {s.pausedAt ? <Play size={16} color={c.ink} fill={c.ink} /> : <Pause size={16} color={c.ink} fill={c.ink} />}
      </PressableScale>
      <View style={[styles.progress, { width: `${fraction * 100}%` }]} />
    </Animated.View>
  );
}

/**
 * Mounted once at the root: when the app goes to the background with a session active, a "Long walk
 * in progress · 12 min so far · Tap to return" notification (only if notifications are allowed).
 */
export function SessionWatcher() {
  const s = useActiveSession();
  useEffect(() => {
    if (!s || s.date !== localYmd()) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") void notifySessionRunning(s).catch(() => {});
    });
    return () => sub.remove();
  }, [s]);
  return null;
}

const useStyles = makeStyles((c) => ({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 10,
    borderRadius: radius.card,
    backgroundColor: "#0c0c0c",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.panelLine,
  },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(194,224,74,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#C2E04A",
    alignItems: "center",
    justifyContent: "center",
  },
  progress: { position: "absolute", left: 0, bottom: 0, height: 3, backgroundColor: "#C2E04A" },
}));
