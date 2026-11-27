import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui";
import { formatInt, MEAL_LABEL } from "@/lib/format";
import { slotTime } from "@/lib/meal-slots";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { Day } from "@/lib/types";

type Meal = Day["meals"][number];

/** The line runs 06:00 → 24:00. */
const START_H = 6;
const END_H = 24;
const ORDER = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"] as const;
/** Same ink shades as Home's calorie ring segments, so the two screens read as one. */
const SHADES = [1, 0.72, 0.5, 0.34];
const TICKS = [
  { h: 6, label: "6 am" },
  { h: 12, label: "12 pm" },
  { h: 18, label: "6 pm" },
  { h: 24, label: "12 am" },
];

/** Local hour (with minutes) of an ISO time in the user's timezone. */
function hourIn(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hour12: false, timeZone })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  return (Number(parts.hour) % 24) + Number(parts.minute) / 60;
}

const at = (h: number) => Math.min(1, Math.max(0, (h - START_H) / (END_H - START_H)));

/**
 * Meals tab "Your day" (2026-11-28): a line from 6 am to midnight with a dot at each logged meal's
 * time (size by kcal, ink shade by meal type like Home's ring), and an olive "now" marker today.
 * Dots pop in one after another; tap one to open the meal. Works for every plan (no photos needed).
 */
export function DayTimeline({ meals, timezone, today }: { meals: Meal[]; timezone: string; today: boolean }) {
  const c = useColors();
  const styles = useStyles();
  const logged = meals.filter((m) => m.status === "CONFIRMED");
  const max = Math.max(1, ...logged.map((m) => m.totalKcal));
  const now = today ? at(hourIn(new Date().toISOString(), timezone)) : null;
  const total = logged.reduce((a, m) => a + m.totalKcal, 0);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text variant="labelStrong">Your day</Text>
        <Text variant="caption" color={c.ink2} tabular>
          {logged.length === 0
            ? "No meals yet"
            : `${logged.length} ${logged.length === 1 ? "meal" : "meals"} · ${formatInt(total)} kcal`}
        </Text>
      </View>

      <View style={styles.lane}>
        <View style={styles.line} />
        {now != null && (
          <View style={[styles.now, { left: `${now * 100}%` }]}>
            <View style={styles.nowLine} />
            <Text variant="caption" color={c.brandText} style={styles.nowLabel}>
              Now
            </Text>
          </View>
        )}
        {logged.map((m, i) => (
          <Dot
            key={m.id}
            meal={m}
            index={i}
            x={at(hourIn(m.createdAt, timezone))}
            size={10 + 10 * Math.sqrt(m.totalKcal / max)}
            shade={SHADES[ORDER.indexOf(m.mealType as (typeof ORDER)[number])] ?? 0.6}
            timezone={timezone}
          />
        ))}
      </View>

      <View style={styles.ticks}>
        {TICKS.map((t) => (
          <Text key={t.h} variant="caption" color={c.ink3}>
            {t.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Dot({
  meal,
  index,
  x,
  size,
  shade,
  timezone,
}: {
  meal: Meal;
  index: number;
  x: number;
  size: number;
  shade: number;
  timezone: string;
}) {
  const c = useColors();
  const reduce = useReducedMotion();
  const pop = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    pop.set(withDelay(120 + index * 110, withTiming(1, { duration: 420, easing: Easing.out(Easing.back(2)) })));
  }, [reduce, index, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }], opacity: Math.min(1, pop.get() * 1.5) }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: `${x * 100}%`,
          top: 14 - size / 2,
          marginLeft: -size / 2,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${MEAL_LABEL[meal.mealType]} at ${slotTime(meal.createdAt, timezone)}, ${formatInt(meal.totalKcal)} kcal. Open`}
        onPress={() => router.push(`/log/${meal.id}` as Href)}
        hitSlop={10}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.ink,
          opacity: shade,
          borderWidth: 2,
          borderColor: c.surface,
        }}
      />
    </Animated.View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 10, padding: 16, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lane: { height: 28, justifyContent: "center", marginHorizontal: 6 },
  line: { height: 2, borderRadius: 1, backgroundColor: c.track },
  now: { position: "absolute", top: 0, bottom: 0, alignItems: "center", marginLeft: -1 },
  nowLine: { width: 2, flex: 1, borderRadius: 1, backgroundColor: c.brand },
  nowLabel: { position: "absolute", top: -14, width: 40, textAlign: "center" },
  ticks: { flexDirection: "row", justifyContent: "space-between" },
}));
