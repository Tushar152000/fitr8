import type { DashboardMealDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Check, ChevronRight } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { PressableScale, ProgressFill, Text } from "@/components/ui";
import { GOAL_LABEL } from "@/lib/profile-summary";
import { planQuery } from "@/lib/queries";
import { MEAL_LABEL, formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";

// Figma "Home" calorie card: a 130 px ring (8 px track, 10 px round-capped arc) 20 px from the left,
// macros in a column to its right.
const TRACK = 8;
const ARC = 10;
const SIZE = 130;
const R = 61;
/** Gap between meal segments, as a fraction of the ring. */
const GAP = 0.014;
/** Slow, smooth arrival (user feedback 2026-11-28: 0.9 s felt rushed). */
const SWEEP_MS = 1600;
/** A long, soft ease-out (like easeOutQuint): fast start, a gentle settle. */
const SMOOTH = Easing.bezier(0.22, 1, 0.36, 1);
/** "Perfect day" can show from this local hour (the day is mostly done). */
const PERFECT_HOUR = 20;
const FLIP_MS = 640;
/** The pace line assumes eating is spread from 07:00 to 21:00. */
const DAY_START_H = 7;
const DAY_END_H = 21;
/** Meals in ring order, each a shade of ink (darkest first). */
const ORDER = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"] as const;
const SHADES = [1, 0.72, 0.5, 0.34];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Macros = { proteinG: number; carbsG: number; fatG: number };

/**
 * Home calorie card (redesign 2026-11-28, user request; colours kept to ink + olive):
 * - Front: the ring is split into the day's meals (breakfast → dinner, ink shades with small gaps)
 *   and sweeps in on arrival and after each log; the centre number counts to its new value. Today,
 *   an olive tick marks where the day "should" be by now and the line under the number says so
 *   ("On track", "A bit ahead", "Room for a good dinner"). Protein has its own line; carbs and fat
 *   are two small bars; "eaten of target" sits under them.
 * - Over target (docs/DESIGN.md 6c, never red): the ring is fully ink with a grey overflow arc,
 *   centre "212 kcal over", macro bars past their target fill ink.
 * - Tap: the card flips to today's meals with their kcal; tap again to flip back.
 * - Header (2026-11-28): a small olive bar + "Today's fuel" and the goal chip ("Lose fat · 2,000
 *   kcal" → /goal); a plain card (the corner glow was removed: not simple); the hero number is
 *   the biggest type on Home. Perfect day:
 *   today after 20:00 within ±5 % of the target, the chip and pace line read "Perfect day" and a
 *   lime burst leaves the ring once per day.
 * Reduce Motion: no sweep, count or flip animation (the flip still swaps faces).
 */
export function CalorieCard({
  eaten,
  target,
  meals,
  today,
}: {
  eaten: Macros & { kcal: number };
  target: Macros & { kcal: number };
  meals: DashboardMealDto[];
  /** Today (pace tick and line) or a past day ("eaten of target" instead). */
  today: boolean;
}) {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const left = Math.round(target.kcal - eaten.kcal);
  const over = left < 0;
  const shown = useCountTo(Math.abs(left), !reduce);

  // Segments: kcal per meal type (confirmed or ready meals), scaled so all of them fill `fill`.
  const logged = meals.filter((m) => m.status === "CONFIRMED" || m.status === "READY");
  const perType = ORDER.map((t) => logged.filter((m) => m.mealType === t).reduce((a, m) => a + m.totalKcal, 0));
  const sum = perType.reduce((a, b) => a + b, 0);
  const fill = target.kcal > 0 ? Math.min(1, eaten.kcal / target.kcal) : 0;
  const overflow = over && target.kcal > 0 ? Math.min(1, -left / target.kcal) : 0;
  const parts = segments(perType, sum, fill);

  // Sweep 0 → 1 whenever the eaten total changes (arrival, a new log).
  const sweep = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return sweep.set(1);
    sweep.set(0);
    sweep.set(withTiming(1, { duration: SWEEP_MS, easing: SMOOTH }));
  }, [eaten.kcal, reduce, sweep]);

  const plan = useQuery(planQuery);
  const goal = plan.data?.goal ? GOAL_LABEL[plan.data.goal.type] : null;
  const now = new Date();
  const perfect =
    today &&
    now.getHours() >= PERFECT_HOUR &&
    eaten.kcal > 0 &&
    target.kcal > 0 &&
    Math.abs(left) <= target.kcal * 0.05;
  const pace = today && !perfect ? paceOf(eaten.kcal, target.kcal, now) : null;
  const burst = usePerfectBurst(perfect, !reduce);

  const label = over
    ? `${formatInt(-left)} kcal over your target of ${formatInt(target.kcal)}`
    : `${formatInt(left)} kcal to go. ${formatInt(eaten.kcal)} of ${formatInt(target.kcal)} eaten${pace ? `. ${pace.text}` : ""}`;

  // Flip between the ring and today's meals.
  const [back, setBack] = useState(false);
  const flip = useSharedValue(0);
  const toggle = () => {
    const next = !back;
    setBack(next);
    flip.set(
      reduce ? (next ? 1 : 0) : withTiming(next ? 1 : 0, { duration: FLIP_MS, easing: Easing.inOut(Easing.cubic) }),
    );
  };
  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.get() < 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${flip.get() * 180}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.get() < 0.5 ? 0 : 1,
    transform: [{ perspective: 900 }, { rotateY: `${flip.get() * 180 - 180}deg` }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={back ? "Today's meals. Tap to show calories" : label}
      accessibilityHint={back ? undefined : "Shows today's meals"}
      onPress={toggle}
    >
      <Animated.View style={[styles.card, frontStyle]} pointerEvents={back ? "none" : "auto"}>
        <View style={styles.header}>
          {/* A small olive bar marks the main card (2026-11-28: plain card, no glow). */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={styles.accent} />
            <Text variant="labelStrong" color={c.ink2}>
              Today&apos;s fuel
            </Text>
          </View>
          {perfect ? (
            <View style={[styles.chip, { backgroundColor: c.brandSoft }]}>
              <Check size={12} color={c.brandText} strokeWidth={2.6} />
              <Text variant="captionStrong" color={c.brandText}>
                Perfect day
              </Text>
            </View>
          ) : goal ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Goal: ${goal}, ${formatInt(target.kcal)} kcal a day. Open goal`}
              onPress={() => router.push("/goal")}
              hitSlop={8}
              style={[styles.chip, { backgroundColor: c.ground }]}
            >
              <Text variant="captionStrong" color={c.ink} tabular>
                {goal} · {formatInt(target.kcal)} kcal
              </Text>
              <ChevronRight size={12} color={c.ink2} strokeWidth={2.4} />
            </PressableScale>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={{ width: SIZE, height: SIZE }}>
            <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: "-90deg" }] }}>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={TRACK} stroke={c.ringTrack} />
              {parts.map((p, i) => (
                <Segment
                  key={ORDER[i]}
                  start={p.start}
                  length={p.length}
                  opacity={SHADES[i]}
                  color={c.ink}
                  sweep={sweep}
                />
              ))}
              {overflow > 0 && (
                <Segment
                  start={0}
                  length={overflow}
                  opacity={1}
                  color={c.ink3}
                  sweep={sweep}
                  width={4}
                  radiusOffset={-9}
                />
              )}
            </Svg>
            {pace && !over && <PaceTick fraction={pace.expected} color={c.brand} edge={c.surface} />}
            {burst}
            <View style={[StyleSheet.absoluteFill, styles.centre]}>
              <Text weight={700} size={36} tabular style={{ letterSpacing: -1.2, lineHeight: 40 }}>
                {formatInt(shown)}
              </Text>
              <Text variant="labelMedium" color={c.ink2}>
                {over ? "Kcal over" : "Kcal to go"}
              </Text>
              <Text
                weight={600}
                size={10}
                color={(pace || perfect) && !over ? c.brandText : c.ink2}
                tabular
                style={{ marginTop: 5 }}
              >
                {perfect
                  ? "Perfect day"
                  : over
                    ? "No stress"
                    : pace
                      ? pace.text
                      : `${formatInt(eaten.kcal)} of ${formatInt(target.kcal)}`}
              </Text>
            </View>
          </View>

          <View style={styles.macros}>
            {/* Protein first: it matters most for the goal. */}
            <View
              style={{ gap: 6 }}
              accessible
              accessibilityLabel={`Protein: ${formatInt(eaten.proteinG)} of ${formatInt(target.proteinG)} grams`}
            >
              <View style={styles.row}>
                <Text variant="labelStrong">Protein</Text>
                <Text variant="bodyStrong" tabular>
                  {formatInt(eaten.proteinG)}
                  <Text variant="labelStrong" color={c.ink2} tabular>
                    /{formatInt(target.proteinG)}g
                  </Text>
                </Text>
              </View>
              <ProgressFill
                fraction={target.proteinG > 0 ? eaten.proteinG / target.proteinG : 0}
                color={eaten.proteinG > target.proteinG ? c.ink : c.macroProtein}
                trackStyle={styles.track}
                fillStyle={styles.fill}
              />
            </View>
            <View style={styles.small}>
              <SmallMacro label="Carbs" eaten={eaten.carbsG} target={target.carbsG} color={c.macroCarbs} />
              <SmallMacro label="Fat" eaten={eaten.fatG} target={target.fatG} color={c.macroFat} />
            </View>
            <Text variant="caption" color={c.ink2} tabular>
              {formatInt(eaten.kcal)} of {formatInt(target.kcal)} kcal
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.card, styles.back, backStyle]} pointerEvents={back ? "auto" : "none"}>
        <MealList meals={logged} />
      </Animated.View>
    </Pressable>
  );
}

/** Ring segments: each meal type's share of `fill`, in order, with small gaps between them. */
function segments(perType: number[], sum: number, fill: number) {
  const present = perType.filter((k) => k > 0).length;
  if (sum <= 0 || fill <= 0) {
    // Nothing logged by meal (or totals come only from the server): one plain arc.
    return perType.map((_, i) => ({ start: 0, length: i === 0 ? fill : 0 }));
  }
  const gaps = Math.max(0, present - 1) * GAP;
  const usable = Math.max(0, fill - (fill >= 1 ? present * GAP : gaps));
  let at = 0;
  return perType.map((k) => {
    if (k <= 0) return { start: at, length: 0 };
    const length = (k / sum) * usable;
    const part = { start: at, length };
    at += length + GAP;
    return part;
  });
}

/** One arc from `start` to `start + length` (fractions of the ring), revealed by `sweep`. */
function Segment({
  start,
  length,
  opacity,
  color,
  sweep,
  width = ARC,
  radiusOffset = 0,
}: {
  start: number;
  length: number;
  opacity: number;
  color: string;
  sweep: SharedValue<number>;
  width?: number;
  radiusOffset?: number;
}) {
  const r = R + radiusOffset;
  const circ = 2 * Math.PI * r;
  const props = useAnimatedProps(() => {
    // The sweep runs across the whole filled ring; each segment shows the part the sweep has passed.
    const reach = sweep.get() * (start + length);
    const drawn = Math.max(0, Math.min(length, reach - start));
    return { strokeDasharray: `${drawn * circ} ${circ}`, strokeOpacity: drawn > 0.001 ? opacity : 0 };
  });
  if (length <= 0) return null;
  return (
    <AnimatedCircle
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDashoffset={-start * circ}
      animatedProps={props}
    />
  );
}

/** The olive "where you'd be by now" tick, sitting on the ring at `fraction` (0 = top, clockwise). */
function PaceTick({ fraction, color, edge }: { fraction: number; color: string; edge: string }) {
  const a = fraction * 2 * Math.PI - Math.PI / 2;
  const d = 12;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: SIZE / 2 + Math.cos(a) * R - d / 2,
        top: SIZE / 2 + Math.sin(a) * R - d / 2,
        width: d,
        height: d,
        borderRadius: d / 2,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: edge,
      }}
    />
  );
}

/**
 * Where the day should be by `now` if eating is spread 07:00–21:00, and what to say about it.
 * Within 10 % of the target either way = on track.
 */
function paceOf(eaten: number, target: number, now: Date) {
  if (target <= 0) return null;
  const h = now.getHours() + now.getMinutes() / 60;
  const expected = Math.min(1, Math.max(0, (h - DAY_START_H) / (DAY_END_H - DAY_START_H)));
  const diff = (eaten - expected * target) / target;
  const text =
    diff > 0.1 ? "A bit ahead" : diff < -0.1 ? (h >= 17 ? "Room for a good dinner" : "Plenty of room") : "On track";
  return { expected, text };
}

function SmallMacro({ label, eaten, target, color }: { label: string; eaten: number; target: number; color: string }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View
      style={{ flex: 1, gap: 4 }}
      accessible
      accessibilityLabel={`${label}: ${formatInt(eaten)} of ${formatInt(target)} grams`}
    >
      <View style={styles.row}>
        <Text variant="caption" color={c.ink2}>
          {label}
        </Text>
        <Text variant="captionStrong" tabular>
          {formatInt(eaten)}g
        </Text>
      </View>
      <ProgressFill
        fraction={target > 0 ? eaten / target : 0}
        color={eaten > target ? c.ink : color}
        trackStyle={styles.smallTrack}
        fillStyle={styles.fill}
      />
    </View>
  );
}

/** The card's back: today's meals with their kcal (up to four, then "+ n more"). */
function MealList({ meals }: { meals: DashboardMealDto[] }) {
  const c = useColors();
  const styles = useStyles();
  const shown = meals.slice(0, 4);
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={styles.row}>
        <Text variant="labelStrong">Today&apos;s meals</Text>
        <Text variant="caption" color={c.ink3}>
          Tap to flip back
        </Text>
      </View>
      {shown.length === 0 ? (
        <Text variant="labelMedium" color={c.ink2} style={{ marginTop: 8 }}>
          Nothing logged yet. Tap the camera to add your first meal.
        </Text>
      ) : (
        shown.map((m) => (
          <View key={m.id} style={styles.mealRow}>
            <View
              style={[
                styles.mealDot,
                { backgroundColor: c.ink, opacity: SHADES[ORDER.indexOf(m.mealType as (typeof ORDER)[number])] ?? 0.5 },
              ]}
            />
            <Text variant="caption" color={c.ink2} style={{ width: 64 }}>
              {MEAL_LABEL[m.mealType]}
            </Text>
            <Text variant="labelMedium" numberOfLines={1} style={{ flex: 1 }}>
              {m.items[0]?.name ?? m.inputText ?? "Meal"}
              {m.items.length > 1 ? ` +${m.items.length - 1}` : ""}
            </Text>
            <Text variant="labelStrong" tabular>
              {formatInt(m.totalKcal)}
            </Text>
          </View>
        ))
      )}
      {meals.length > shown.length && (
        <Text variant="caption" color={c.ink3}>
          + {meals.length - shown.length} more in Meals
        </Text>
      )}
    </View>
  );
}

/**
 * The once-a-day lime burst for a perfect day: a ring leaving the calorie ring. Remembered per date
 * (SecureStore / localStorage) so it plays once; returns the element to draw over the ring.
 */
function usePerfectBurst(perfect: boolean, animate: boolean) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!perfect || !animate) return;
    const d = new Date();
    const key = `fitr8.perfectday.${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    let live = true;
    void (async () => {
      try {
        const seen =
          Platform.OS === "web" ? globalThis.localStorage?.getItem(key) : await SecureStore.getItemAsync(key);
        if (seen === "1" || !live) return;
        if (Platform.OS === "web") globalThis.localStorage?.setItem(key, "1");
        else await SecureStore.setItemAsync(key, "1");
      } catch {
        return;
      }
      t.set(0);
      t.set(withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    })();
    return () => {
      live = false;
    };
  }, [perfect, animate, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get() > 0 && t.get() < 1 ? 1 - t.get() : 0,
    transform: [{ scale: 1 + t.get() * 0.45 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: 6,
          borderColor: "#C2E04A",
        },
        style,
      ]}
    />
  );
}

/** Counts from the last shown value to `value` (ease-out); `animate={false}` jumps. */
function useCountTo(value: number, animate: boolean) {
  const [n, setN] = useState(animate ? 0 : value);
  const from = useRef(animate ? 0 : value);
  useEffect(() => {
    if (!animate) return;
    const start = Date.now();
    const a = from.current;
    let id = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / SWEEP_MS);
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - t, 5)));
      from.current = v;
      setN(v);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value, animate]);
  return animate ? n : value;
}

const useStyles = makeStyles((c, shadows) => ({
  card: {
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    backfaceVisibility: "hidden",
    ...shadows.card,
  },
  back: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "stretch", paddingVertical: 16 },
  centre: { alignItems: "center", justifyContent: "center" },
  accent: { width: 4, height: 14, borderRadius: 2, backgroundColor: c.brand },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 26 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  body: { flexDirection: "row", alignItems: "center" },
  macros: { flex: 1, marginLeft: 24, gap: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  small: { flexDirection: "row", gap: 12 },
  track: { height: 8, borderRadius: 4, backgroundColor: c.track, overflow: "hidden" },
  smallTrack: { height: 5, borderRadius: 3, backgroundColor: c.track, overflow: "hidden" },
  fill: { borderRadius: 4 },
  mealRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  mealDot: { width: 6, height: 6, borderRadius: 3 },
}));
