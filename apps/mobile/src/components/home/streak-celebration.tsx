import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Sheet } from "@/components/sheet";
import { PillButton, Text } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { reachedMilestone, streakQuery } from "@/lib/streak";
import { useColors } from "@/lib/theme";
import { StreakDrop } from "./streak-flame";

const KEY = (userId: string, days: number) => `fitr8.streak.celebrated.${userId}.${days}`;

async function wasCelebrated(key: string) {
  try {
    return (
      (Platform.OS === "web" ? globalThis.localStorage?.getItem(key) : await SecureStore.getItemAsync(key)) === "1"
    );
  } catch {
    return true; // can't remember it, so don't risk showing it every launch
  }
}
async function markCelebrated(key: string) {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(key, "1");
    else await SecureStore.setItemAsync(key, "1");
  } catch {
    // Shows once more at worst.
  }
}

/**
 * Milestone celebration (user request 2026-11-28): the first time the streak reaches 7, 30 or 100
 * days, a sheet with the burning flame, the badge's name and confetti falling over it. Once per user
 * per milestone (SecureStore / localStorage). Mounted on Home.
 */
export function StreakCelebration() {
  const c = useColors();
  const me = useMe();
  const streak = useQuery(streakQuery);
  const milestone = streak.data ? reachedMilestone(streak.data.current) : null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!milestone) return;
    let live = true;
    void wasCelebrated(KEY(me.id, milestone.days)).then((done) => {
      if (live && !done) {
        setOpen(true);
        haptic.success();
        void markCelebrated(KEY(me.id, milestone.days));
      }
    });
    return () => {
      live = false;
    };
  }, [milestone, me.id]);

  if (!milestone) return null;
  return (
    <Sheet open={open} onClose={() => setOpen(false)} title={`${milestone.days}-day streak!`}>
      <View style={{ alignItems: "center", gap: 14, paddingVertical: 8 }}>
        {open && <Confetti />}
        <StreakDrop lit best>
          <View style={styles.value}>
            <Text variant="stat" color={c.white} tabular style={{ marginBottom: -3, letterSpacing: 0 }}>
              {milestone.days}
            </Text>
            <Text weight={600} size={10} color={c.white} style={{ letterSpacing: 0.8 }}>
              DAYS
            </Text>
          </View>
        </StreakDrop>
        <Text variant="heading2" center>
          {milestone.badge}
        </Text>
        <Text variant="labelMedium" color={c.ink2} center style={{ lineHeight: 18 }}>
          You&apos;ve logged {milestone.days} days in a row. That&apos;s how results happen.
        </Text>
      </View>
      <PillButton label="Keep it going" onPress={() => setOpen(false)} style={{ alignSelf: "stretch", marginTop: 8 }} />
    </Sheet>
  );
}

const PIECES = 28;
const COLORS = ["#C2E04A", "#718b00", "#0c0c0c", "#FFD34D", "#E4F59B", "#536600"];

/** One burst of confetti falling and spinning over the sheet (skipped with Reduce Motion). */
function Confetti() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <View style={styles.confetti} pointerEvents="none">
      {Array.from({ length: PIECES }, (_, i) => (
        <Piece key={i} i={i} />
      ))}
    </View>
  );
}

function Piece({ i }: { i: number }) {
  const t = useSharedValue(0);
  // Spread deterministically so it looks random but doesn't change between renders.
  const left = ((i * 37) % 100) / 100;
  const delay = (i * 53) % 400;
  const drift = ((i * 29) % 60) - 30;
  const spin = ((i * 47) % 2 ? 1 : -1) * (360 + ((i * 61) % 360));
  const w = 5 + (i % 3) * 2;
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 1700 + ((i * 31) % 700), easing: Easing.out(Easing.quad) })));
  }, [t, delay, i]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get() < 0.85 ? 1 : (1 - t.get()) / 0.15,
    transform: [
      { translateY: -20 + t.get() * 300 },
      { translateX: drift * t.get() },
      { rotate: `${spin * t.get()}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: "absolute", top: 0, left: `${left * 100}%`, width: w, height: w * 1.6, borderRadius: 1.5 },
        { backgroundColor: COLORS[i % COLORS.length] },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // Same placement as the streak sheet's badge number.
  value: { position: "absolute", left: 0, right: 0, top: 36, alignItems: "center" },
  confetti: { position: "absolute", left: -20, right: -20, top: -30, height: 320, overflow: "hidden" },
});
