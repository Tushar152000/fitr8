import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { RingArc, StatusPill, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { Day } from "@/lib/types";

const RING = 68;
const STROKE = 7;

/**
 * Meals "Daily summary" (rings redesign 2026-11-28, user request: rounded instead of bars): the
 * day's label with the "kcal left" / "kcal over" tag, then four rings in a row — Calories (ink),
 * Protein, Carbs, Fats (Home's macro colours) — each with the amount inside and "of target" under
 * it. The rings sweep in on arrival. Past a target the ring is full and turns ink (DESIGN.md 6c:
 * never red).
 */
export function DailySummary({ day, eatenLabel }: { day: Day; eatenLabel: string }) {
  const c = useColors();
  const styles = useStyles();
  const t = day.target;
  const e = day.eaten;
  const left = t ? Math.round(t.kcal - e.kcal) : null;
  // The rings animate value changes, so they start empty and get their values a frame later.
  const reduce = useReducedMotion();
  const [arrived, setArrived] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const id = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(id);
  }, [reduce]);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text variant="labelStrong" color={c.ink2}>
          {eatenLabel}
        </Text>
        {left != null && (
          <StatusPill
            icon={null}
            tone={left >= 0 ? "accent" : "neutral"}
            label={left >= 0 ? `${formatInt(left)} kcal left` : `${formatInt(-left)} kcal over`}
          />
        )}
      </View>
      {t ? (
        <View style={styles.rings}>
          <Ring label="Calories" value={e.kcal} target={t.kcal} unit="kcal" color={c.ink} show={arrived} />
          <Ring label="Protein" value={e.proteinG} target={t.proteinG} unit="g" color={c.macroProtein} show={arrived} />
          <Ring label="Carbs" value={e.carbsG} target={t.carbsG} unit="g" color={c.macroCarbs} show={arrived} />
          <Ring label="Fats" value={e.fatG} target={t.fatG} unit="g" color={c.macroFat} show={arrived} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text variant="stat" tabular>
            {formatInt(e.kcal)}
          </Text>
          <Text variant="labelMedium" color={c.ink2}>
            kcal
          </Text>
        </View>
      )}
    </View>
  );
}

function Ring({
  label,
  value,
  target,
  unit,
  color,
  show,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
  show: boolean;
}) {
  const c = useColors();
  const styles = useStyles();
  const over = target > 0 && value > target;
  const fraction = target > 0 ? Math.min(1, value / target) : 0;
  const r = (RING - STROKE) / 2;
  return (
    <View
      style={styles.ringCol}
      accessible
      accessibilityLabel={`${label}: ${formatInt(value)} of ${formatInt(target)} ${unit === "g" ? "grams" : "kcal"}`}
    >
      <View style={{ width: RING, height: RING }}>
        <Svg width={RING} height={RING} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke={c.ringTrack} strokeWidth={STROKE} />
          <RingArc
            centre={RING / 2}
            r={r}
            strokeWidth={STROKE}
            fraction={show ? fraction : 0}
            color={over ? c.ink : color}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.centre]}>
          <Text weight={700} size={unit === "kcal" ? 14 : 15} tabular style={{ letterSpacing: -0.3 }}>
            {formatInt(value)}
          </Text>
          <Text variant="caption" color={c.ink3} style={{ marginTop: -2 }}>
            {unit}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "center" }}>
        <Text variant="labelStrong" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="caption" color={c.ink2} tabular numberOfLines={1}>
          of {formatInt(target)}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { padding: 20, gap: 16, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rings: { flexDirection: "row", justifyContent: "space-between" },
  ringCol: { alignItems: "center", gap: 8 },
  centre: { alignItems: "center", justifyContent: "center" },
}));
