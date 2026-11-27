import type { HealthSummaryDto } from "@fitr8/contracts";
import { ChevronRight, Footprints, HeartPulse, Moon } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Sheet } from "@/components/sheet";
import { PressableScale, RingArc, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors, useScheme } from "@/lib/theme";
import { HealthMetrics, RECOVERY_LABEL, sleepText } from "./metrics";

/** Always-dark card text (white in both themes). */
/**
 * Card colours per theme (2026-11-28: the dark lime-glow card was too loud; user asked for a simple
 * background). Both themes use the plain card surface like the other Home cards, ink text, no glow;
 * only the ring and the steps bar carry the accent (olive in light, lime in dark).
 */
function useTone() {
  const c = useColors();
  const dark = useScheme() === "dark";
  return dark
    ? { dark, ink: c.ink, soft: c.ink2, faint: c.track, accent: c.highlight, label: c.brandText }
    : { dark, ink: c.ink, soft: c.ink2, faint: c.track, accent: c.brand, label: c.brandText };
}
const RING = 84;
const STROKE = 8;

/**
 * Home's health card (user request 2026-11-28: only what matters, and premium): a plain card, today's Recovery as a ring with its label, then Steps (with a bar), Sleep and
 * Resting heart rate. The whole card opens a sheet with all six numbers (`HealthMetrics`).
 * `sample` tags it "Sample data" (development preview only). On arrival the recovery ring sweeps
 * up, the steps number counts up and its bar fills, and the footprints keep stepping (Reduce
 * Motion: all still).
 */
const ARRIVE_MS = 1400;
export function HealthHighlights({ s, source, sample }: { s: HealthSummaryDto; source: string; sample?: boolean }) {
  const c = useColors();
  const styles = useStyles();
  const t = useTone();
  const [open, setOpen] = useState(false);
  const score = s.recovery?.score ?? null;
  const steps = s.steps;
  const stepsPct = steps ? Math.min(1, steps.count / steps.goal) : 0;
  const reduce = useReducedMotion();
  // The ring animates value changes, so it starts empty and gets the score a frame later.
  const [arrived, setArrived] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const id = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(id);
  }, [reduce]);
  const shownSteps = useCountUp(steps?.count ?? 0, !reduce);
  const bar = useSharedValue(reduce ? stepsPct : 0);
  useEffect(() => {
    bar.set(reduce ? stepsPct : withTiming(stepsPct, { duration: ARRIVE_MS, easing: Easing.out(Easing.cubic) }));
  }, [stepsPct, reduce, bar]);
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.get() * 100}%` }));

  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Today's health from ${source}. Open all health numbers`}
        onPress={() => setOpen(true)}
        style={styles.card}
      >
        <View style={styles.head}>
          <Text variant="labelStrong" color={t.ink}>
            Today&apos;s health
          </Text>
          {sample && (
            <View style={[styles.tag, { backgroundColor: t.faint }]}>
              <Text variant="captionStrong" color={t.soft}>
                Sample data
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Text variant="caption" color={t.soft}>
            {source}
          </Text>
          <ChevronRight size={16} color={t.soft} />
        </View>

        <View style={styles.body}>
          {/* Recovery ring */}
          <View style={styles.ringWrap}>
            <Svg width={RING} height={RING} style={{ transform: [{ rotate: "-90deg" }] }}>
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={(RING - STROKE) / 2}
                stroke={t.faint}
                strokeWidth={STROKE}
                fill="none"
              />
              <RingArc
                centre={RING / 2}
                r={(RING - STROKE) / 2}
                strokeWidth={STROKE}
                fraction={arrived ? (score ?? 0) / 100 : 0}
                color={t.accent}
              />
            </Svg>
            <View style={[StyleSheet.absoluteFill, styles.ringText]}>
              <Text variant="heading2" color={t.ink} tabular>
                {score ?? "–"}
              </Text>
              <Text variant="caption" color={t.soft}>
                Recovery
              </Text>
            </View>
          </View>

          <View style={styles.stats}>
            <Text variant="bodyStrong" color={t.label} numberOfLines={1}>
              {s.recovery ? RECOVERY_LABEL[s.recovery.level] : "No recovery data yet"}
            </Text>

            <View style={{ gap: 6 }}>
              <Stat
                icon={<SteppingFeet animate={!reduce} />}
                label="Steps"
                value={steps ? formatInt(shownSteps) : "–"}
              />
              <View style={[styles.track, { backgroundColor: t.faint }]}>
                <Animated.View style={[styles.fill, { backgroundColor: t.accent }, barStyle]} />
              </View>
            </View>
            <Stat
              icon={<Moon size={14} color={t.soft} strokeWidth={2} />}
              label="Sleep"
              value={s.sleep ? sleepText(s.sleep.asleepMinutes) : "–"}
            />
            <Stat
              icon={<HeartPulse size={14} color={t.soft} strokeWidth={2} />}
              label="Resting HR"
              value={s.heartRate?.resting != null ? `${s.heartRate.resting} bpm` : "–"}
            />
          </View>
        </View>
      </PressableScale>

      <Sheet open={open} onClose={() => setOpen(false)} title="Today's health" subtitle={`From ${source}`}>
        <View style={{ paddingBottom: 8 }}>
          <HealthMetrics s={s} />
        </View>
        {sample && (
          <Text variant="caption" color={c.ink3} center style={{ marginTop: 8 }}>
            Sample numbers for previewing the design. Connect {source} to see yours.
          </Text>
        )}
      </Sheet>
    </>
  );
}

/** Counts from 0 up to `target` over ARRIVE_MS (ease-out); `animate={false}` shows it at once. */
function useCountUp(target: number, animate: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!animate) return;
    const start = Date.now();
    let id = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / ARRIVE_MS);
      setN(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, animate]);
  return animate ? n : target;
}

/** The footprints glyph, rocking heel-to-toe like a step, on a loop. */
function SteppingFeet({ animate }: { animate: boolean }) {
  const t2 = useTone();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    t.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) }),
          withTiming(-1, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(t);
  }, [animate, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${t.get() * 12}deg` }, { translateY: -Math.abs(t.get()) * 1.5 }],
  }));
  return (
    <Animated.View style={style}>
      <Footprints size={14} color={t2.soft} strokeWidth={2} />
    </Animated.View>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  const t = useTone();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {icon}
      <Text variant="labelRegular" color={t.soft} style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="labelStrong" color={t.ink} tabular>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 16, padding: 20, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  body: { flexDirection: "row", alignItems: "center", gap: 20 },
  ringWrap: { width: RING, height: RING },
  ringText: { alignItems: "center", justifyContent: "center" },
  stats: { flex: 1, gap: 10 },
  track: { height: 4, borderRadius: 2, overflow: "hidden", marginLeft: 22 },
  fill: { height: 4, borderRadius: 2 },
}));
