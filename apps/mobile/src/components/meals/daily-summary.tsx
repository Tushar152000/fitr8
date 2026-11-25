import { View } from "react-native";
import { ProgressFill, StatusPill, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { Day } from "@/lib/types";

/**
 * Figma "Daily summary" (Meals): eaten kcal of the target, "kcal left" tag, a black progress bar
 * and Protein / Carbs / Fats bars (black on the Meals tab; colours are Home's).
 */
export function DailySummary({ day, eatenLabel }: { day: Day; eatenLabel: string }) {
  const c = useColors();
  const styles = useStyles();
  const t = day.target;
  const e = day.eaten;
  const left = t ? Math.round(t.kcal - e.kcal) : null;
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Text variant="labelMedium" color={c.ink2}>
            {eatenLabel}
          </Text>
          <View style={styles.kcal}>
            <Text variant="stat" tabular style={{ letterSpacing: 0 }}>
              {formatInt(e.kcal)}
            </Text>
            <Text variant="labelMedium" color={c.ink2} tabular>
              {t ? `/ ${formatInt(t.kcal)} kcal` : "kcal"}
            </Text>
          </View>
        </View>
        {left != null && (
          <StatusPill
            icon={null}
            tone={left >= 0 ? "accent" : "neutral"}
            label={left >= 0 ? `${formatInt(left)} kcal left` : `${formatInt(-left)} kcal over`}
          />
        )}
      </View>
      {t && (
        <>
          <ProgressFill
            fraction={t.kcal > 0 ? e.kcal / t.kcal : 0}
            color={c.ink}
            trackStyle={styles.track}
            fillStyle={styles.fill}
          />
          <View style={{ gap: 14 }}>
            <Macro label="Protein" eaten={e.proteinG} target={t.proteinG} />
            <Macro label="Carbs" eaten={e.carbsG} target={t.carbsG} />
            <Macro label="Fats" eaten={e.fatG} target={t.fatG} />
          </View>
        </>
      )}
    </View>
  );
}

function Macro({ label, eaten, target }: { label: string; eaten: number; target: number }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View
      style={{ gap: 8 }}
      accessible
      accessibilityLabel={`${label}: ${formatInt(eaten)} of ${formatInt(target)} grams`}
    >
      <View style={styles.row}>
        <Text variant="labelStrong">{label}</Text>
        <Text weight={600} size={13} tabular>
          {formatInt(eaten)}/{formatInt(target)}g
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

const useStyles = makeStyles((c, shadows) => ({
  card: { padding: 20, gap: 16, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  top: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  kcal: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  track: { height: 8, borderRadius: 100, backgroundColor: c.track, overflow: "hidden" },
  fill: { borderRadius: 100 },
}));
