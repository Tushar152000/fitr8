import { router, type Href } from "expo-router";
import type { ProgressDto } from "@fitr8/contracts";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** Measurements opened on the Add sheet for weight (where weigh-ins are logged). */
const ADD_WEIGHT = "/measurements?add=weightKg" as Href;

/**
 * Home weight card (Figma "Home"): latest weigh-in and this week's change vs the plan, a divider,
 * one line about the trend, and the olive "Weekly check-in and trend" link into Progress. "This
 * week" is drawn at 55 % while there isn't enough data yet. With no weigh-in this week, the "This
 * week" block opens Measurements on the Add sheet for weight (where weigh-ins are logged); the rest
 * of the card still opens Progress.
 */

export function WeightCard({ p }: { p: ProgressDto }) {
  const c = useColors();
  const styles = useStyles();
  const latest = p.latest?.weightKg ?? null;
  const change = p.weeklyChange;
  const planned = p.plan.weeklyChangeKg;
  const onTrack = change != null && Math.abs(change - planned) <= 0.25;
  const Trend = change != null && change > 0 ? TrendingUp : TrendingDown;
  const tone = onTrack ? c.protein : c.cautionText;
  const needsWeighIn = change == null || p.weeks.find((w) => w.weeksAgo === 0)?.date == null;
  const kg = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)} kg`;
  const Week = needsWeighIn ? PressableScale : View;
  return (
    // Two targets without nesting buttons (web forbids <button> in <button>): the whole card opens
    // Progress through a pressable layer behind the content; "This week" sits above it.
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Weekly check-in and trend"
        accessibilityHint="Opens Progress: weekly check-in and weight trend"
        onPress={() => router.push("/progress")}
        style={({ pressed }) => [StyleSheet.absoluteFill, styles.layer, pressed && { backgroundColor: c.sunken }]}
      />
      <View style={[styles.row, styles.passThrough]}>
        <View style={[styles.stat, styles.noTouch]}>
          <Text variant="labelMedium" color={c.ink2} style={styles.tight}>
            Latest weight
          </Text>
          <Text variant="heading1" tabular style={{ letterSpacing: -0.44 }}>
            {latest != null ? `${latest.toFixed(1)} kg` : "—"}
          </Text>
        </View>
        <Week
          {...(needsWeighIn
            ? {
                accessibilityRole: "button" as const,
                accessibilityLabel: "Add this week's weigh-in",
                onPress: () => router.push(ADD_WEIGHT),
                hitSlop: 8,
              }
            : {})}
          style={[styles.week, !needsWeighIn && styles.noTouch, change == null && { opacity: 0.55 }]}
        >
          <View style={styles.stat}>
            <Text variant="labelMedium" color={c.ink2} style={styles.tight}>
              This week
            </Text>
            {change != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Trend size={18} color={tone} />
                <Text variant="heading2" color={tone} tabular style={{ letterSpacing: -0.36 }}>
                  {kg(change)}
                </Text>
              </View>
            ) : (
              <Text variant="heading2" style={{ letterSpacing: -0.36 }}>
                Not enough data
              </Text>
            )}
          </View>
          <ChevronRight size={24} color={c.ink} strokeWidth={2} />
        </Week>
      </View>
      <View style={[styles.divider, styles.noTouch]} />
      <View style={[styles.foot, styles.noTouch]}>
        <Text variant="bodySm" color={c.ink2} style={[styles.tight, { lineHeight: undefined }]}>
          {change == null
            ? "Weigh in once a week to see your trend against the plan"
            : onTrack
              ? `On track with the plan (${kg(planned)} a week). Logged ${p.daysLogged}/7 days.`
              : `Plan is ${kg(planned)} a week. Logged ${p.daysLogged}/7 days.`}
        </Text>
        <Text variant="bodyStrong" color={c.accentText} style={styles.tight}>
          Weekly check-in and trend
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: {
    borderRadius: radius.card,
    backgroundColor: c.surface,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    ...shadows.card,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stat: { gap: 2 },
  week: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginLeft: 52,
  },
  divider: { height: 1, backgroundColor: c.lineStrong },
  foot: { gap: 4 },
  layer: { borderRadius: radius.card },
  passThrough: { pointerEvents: "box-none" },
  noTouch: { pointerEvents: "none" },
  tight: { letterSpacing: -0.28 },
}));
