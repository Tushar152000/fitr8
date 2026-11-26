import type { ProgressDto } from "@fitr8/contracts";
import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { Text } from "@/components/ui";
import { signedKg } from "@/lib/progress-stats";
import { makeStyles, radius, useColors } from "@/lib/theme";

const H = 120;
/** Figma chart: gridlines at 30/60/90, the line between y 22.5 and 97.5 and x 6 … width − 6. */
const GRID = [30, 60, 90];
const PAD_Y = 22.5;
const PAD_X = 6;
/** Below this spread the line is drawn around the middle instead of exaggerating tiny changes. */
const MIN_SPAN_KG = 1;

/**
 * Figma frame 10 "Weight trend": each of the last 8 weeks' latest weigh-in, oldest left, as an olive
 * line ending in a lime dot; the change over the shown weeks top right. Weeks without a weigh-in are
 * skipped (the line joins the weeks either side).
 */
export function WeeklyTrendCard({ weeks }: { weeks: ProgressDto["weeks"] }) {
  const c = useColors();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const slots = Math.max(1, weeks.length - 1);
  const points = weeks.flatMap((w, i) => (w.weightKg == null ? [] : [{ i, kg: w.weightKg }]));
  const first = points[0];
  const last = points.at(-1);
  const change = first && last && points.length > 1 ? Math.round((last.kg - first.kg) * 10) / 10 : null;

  let lo = Math.min(...points.map((p) => p.kg));
  let hi = Math.max(...points.map((p) => p.kg));
  if (hi - lo < MIN_SPAN_KG) {
    const mid = (hi + lo) / 2;
    lo = mid - MIN_SPAN_KG / 2;
    hi = mid + MIN_SPAN_KG / 2;
  }
  const x = (i: number) => PAD_X + (i / slots) * (width - 2 * PAD_X);
  const y = (kg: number) => PAD_Y + ((hi - kg) / (hi - lo)) * (H - 2 * PAD_Y);
  const label = last
    ? `Weight trend, last 8 weeks: ${last.kg.toFixed(1)} kg now${change != null ? `, ${signedKg(change)}` : ""}.`
    : "Weight trend: no weigh-ins in the last 8 weeks.";

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ gap: 2 }}>
          <Text variant="heading3">Weight trend</Text>
          <Text variant="labelRegular" color={c.ink2}>
            Last 8 weeks
          </Text>
        </View>
        {change != null && (
          <Text variant="bodyStrong" color={c.brandText} tabular>
            {signedKg(change)}
          </Text>
        )}
      </View>
      <View
        style={{ height: H }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
      >
        {width > 0 && (
          <Svg width={width} height={H}>
            {GRID.map((gy) => (
              <Line key={gy} x1={0} x2={width} y1={gy + 0.5} y2={gy + 0.5} stroke={c.line} strokeWidth={1} />
            ))}
            {points.length > 1 && (
              <Polyline
                points={points.map((p) => `${x(p.i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ")}
                fill="none"
                stroke={c.brand}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {last && (
              <Circle cx={x(last.i)} cy={y(last.kg)} r={5} fill={c.highlight} stroke={c.brand} strokeWidth={2} />
            )}
          </Svg>
        )}
        {!last && (
          <View style={styles.empty}>
            <Text variant="labelRegular" color={c.ink2} center>
              No weigh-ins yet
            </Text>
          </View>
        )}
      </View>
      <View style={styles.head}>
        <Text variant="caption" color={c.ink3}>
          8 weeks ago
        </Text>
        <Text variant="captionStrong" color={c.ink2}>
          Today
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { gap: 16, padding: 16, borderRadius: radius.card, backgroundColor: c.surface },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  empty: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "center" },
}));
