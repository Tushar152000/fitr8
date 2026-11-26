import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ProgressFill, RingArc, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";

// Figma "Home" calorie card: a 130 px ring (8 px track, 10 px round-capped arc) 20 px from the left,
// macros in a 143 px column 29 px to its right.
const TRACK = 8;
const ARC = 10;
const SIZE = 130;
const R = 61;

type Macros = { proteinG: number; carbsG: number; fatG: number };

/**
 * Home calorie card: ink ring with kcal to go in the middle and "eaten of target" in blue under it,
 * Protein / Carbs / Fats bars on the right (orange, teal, purple). Over target reads in ink, never
 * red (design rule).
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
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={TRACK} stroke={c.ringTrack} />
          <RingArc centre={SIZE / 2} r={R} strokeWidth={ARC} fraction={fraction} color={c.ink} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.centre]}>
          <Text variant="stat" tabular>
            {formatInt(Math.abs(left))}
          </Text>
          <Text variant="labelMedium" color={c.ink2}>
            {over ? "Kcal over" : "Kcal to go"}
          </Text>
          <Text weight={600} size={10} color={c.link} tabular style={{ marginTop: 5 }}>
            {formatInt(eaten.kcal)} of {formatInt(target.kcal)}
          </Text>
        </View>
      </View>
      <View style={styles.macros}>
        <MacroRow label="Protein" eaten={eaten.proteinG} target={target.proteinG} color={c.macroProtein} />
        <MacroRow label="Carbs" eaten={eaten.carbsG} target={target.carbsG} color={c.macroCarbs} />
        <MacroRow label="Fats" eaten={eaten.fatG} target={target.fatG} color={c.macroFat} />
      </View>
    </View>
  );
}

function MacroRow({ label, eaten, target, color }: { label: string; eaten: number; target: number; color: string }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View
      style={{ gap: 8 }}
      accessible
      accessibilityLabel={`${label}: ${formatInt(eaten)} of ${formatInt(target)} grams`}
    >
      <View style={styles.row}>
        <Text variant="labelStrong" style={{ letterSpacing: -0.24 }}>
          {label}
        </Text>
        <Text variant="bodyStrong" tabular style={{ letterSpacing: 0.56 }}>
          {formatInt(eaten)}
          <Text variant="labelStrong" color={c.ink2} tabular style={{ letterSpacing: 0.48 }}>
            /{formatInt(target)}g
          </Text>
        </Text>
      </View>
      <ProgressFill
        fraction={target > 0 ? eaten / target : 0}
        color={color}
        trackStyle={styles.track}
        fillStyle={styles.fill}
      />
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    height: 171,
    paddingHorizontal: 20,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  centre: { alignItems: "center", justifyContent: "center" },
  macros: { flex: 1, marginLeft: 24, gap: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  track: { height: 8, borderRadius: 4, backgroundColor: c.track, overflow: "hidden" },
  fill: { borderRadius: 4 },
}));
