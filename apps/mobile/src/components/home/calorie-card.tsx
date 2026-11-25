import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ProgressFill, RingArc, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";

const SIZE = 120;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;

type Macros = { proteinG: number; carbsG: number; fatG: number };

/**
 * Home v2 calorie card: ink ring with "kcal to go" in the middle and "eaten of target" under it,
 * Protein / Carbs / Fats on the right. Over target reads in ink, never red (design rule).
 */
export function CalorieCard({
  eaten,
  target,
}: {
  eaten: Macros & { kcal: number };
  target: Macros & { kcal: number };
}) {
  const c = useColors();
  const styles = useStyles();
  const left = Math.round(target.kcal - eaten.kcal);
  const over = left < 0;
  const fraction = target.kcal > 0 ? Math.min(1, Math.max(0, eaten.kcal / target.kcal)) : 0;
  const label = over
    ? `${formatInt(-left)} kcal over your target of ${formatInt(target.kcal)}`
    : `${formatInt(left)} kcal to go. ${formatInt(eaten.kcal)} of ${formatInt(target.kcal)} eaten`;

  return (
    <View style={styles.card}>
      <View style={{ width: SIZE, height: SIZE }} accessible accessibilityRole="image" accessibilityLabel={label}>
        <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} stroke={c.track} />
          <RingArc centre={SIZE / 2} r={R} strokeWidth={STROKE} fraction={fraction} color={c.ink} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.centre]}>
          <Text weight={700} size={24} tabular>
            {formatInt(Math.abs(left))}
          </Text>
          <Text size={11} color={c.ink3}>
            {over ? "Kcal over" : "Kcal to go"}
          </Text>
          <Text weight={600} size={10} color={c.link} tabular style={{ marginTop: 2 }}>
            {formatInt(eaten.kcal)} of {formatInt(target.kcal)}
          </Text>
        </View>
      </View>
      <View style={styles.macros}>
        <MacroRow label="Protein" eaten={eaten.proteinG} target={target.proteinG} />
        <MacroRow label="Carbs" eaten={eaten.carbsG} target={target.carbsG} />
        <MacroRow label="Fats" eaten={eaten.fatG} target={target.fatG} />
      </View>
    </View>
  );
}

function MacroRow({ label, eaten, target }: { label: string; eaten: number; target: number }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View
      style={{ gap: 6 }}
      accessible
      accessibilityLabel={`${label}: ${formatInt(eaten)} of ${formatInt(target)} grams`}
    >
      <View style={styles.row}>
        <Text weight={600} size={12}>
          {label}
        </Text>
        <Text size={12} color={c.ink3} tabular>
          <Text weight={700} size={14} tabular>
            {formatInt(eaten)}
          </Text>
          /{formatInt(target)}g
        </Text>
      </View>
      <ProgressFill
        fraction={target > 0 ? eaten / target : 0}
        color={c.ink}
        trackStyle={styles.track}
        fillStyle={styles.fill}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: c.surface,
  },
  centre: { alignItems: "center", justifyContent: "center" },
  macros: { flex: 1, gap: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  track: { height: 6, borderRadius: 3, backgroundColor: c.track, overflow: "hidden" },
  fill: { borderRadius: 3 },
}));
