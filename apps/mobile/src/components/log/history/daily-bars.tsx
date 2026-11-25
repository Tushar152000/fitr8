import type { HistoryDayDto } from "@fitr8/contracts";
import { StyleSheet, View } from "react-native";
import { Card, PressableScale, Text } from "@/components/ui";
import { formatYmd } from "@/lib/dates";
import { formatInt } from "@/lib/format";
import { useColors } from "@/lib/theme";

const BAR_H = 150;

/** Brand = within target, ink = over, grey stub = not logged, faded = today so far; dashed target line. */
export function DailyBars({
  days,
  range,
  selected,
  onSelect,
}: {
  days: HistoryDayDto[];
  range: number;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const c = useColors();
  const targets = days.map((d) => d.target ?? 0);
  const max = Math.max(...days.map((d) => d.kcal), ...targets, 1) * 1.1;
  const typicalTarget = targets.filter(Boolean).at(-1) ?? 0;
  const over = days.filter((d) => d.logged && d.target && d.kcal > d.target).length;
  const summary = `${days.filter((d) => d.logged).length} of ${range} days logged; ${over} over target. Target ${formatInt(typicalTarget)} kcal.`;

  return (
    <Card accessibilityLabel={`Daily calories. ${summary}`}>
      <View style={{ height: BAR_H }}>
        {typicalTarget > 0 && (
          <View style={[styles.target, { bottom: (typicalTarget / max) * BAR_H, pointerEvents: "none" }]}>
            <Text weight={600} size={11} color={c.ink3} tabular style={styles.targetLabel}>
              {formatInt(typicalTarget)}
            </Text>
          </View>
        )}
        <View
          style={[StyleSheet.absoluteFill, { flexDirection: "row", alignItems: "flex-end", gap: range === 7 ? 12 : 3 }]}
        >
          {days.map((d) => {
            const isOver = d.logged && d.target != null && d.kcal > d.target;
            const h = d.logged ? Math.max(6, (d.kcal / max) * BAR_H) : 6;
            const isSelected = d.date === selected;
            return (
              <PressableScale
                key={d.date}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${formatYmd(d.date, { weekday: "long", day: "numeric", month: "short" })}: ${
                  d.logged
                    ? `${formatInt(d.kcal)} kcal${d.isToday ? " so far" : ""}${isOver ? ", over target" : ""}`
                    : "not logged"
                }`}
                onPress={() => onSelect(d.date)}
                style={{ flex: 1, height: "100%", justifyContent: "flex-end" }}
              >
                <View
                  style={{
                    height: h,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    backgroundColor: !d.logged ? c.line : isOver ? c.ink : c.brand,
                    opacity: d.isToday && d.logged ? 0.45 : 1,
                    ...(isSelected
                      ? { outlineWidth: 2, outlineColor: c.ink, outlineOffset: 2, outlineStyle: "solid" }
                      : null),
                  }}
                />
              </PressableScale>
            );
          })}
        </View>
      </View>
      {range === 7 && (
        <View style={{ flexDirection: "row", gap: 12 }} aria-hidden>
          {days.map((d) => (
            <Text key={d.date} weight={600} size={11} color={c.ink3} center style={{ flex: 1 }}>
              {formatYmd(d.date, { weekday: "narrow" })}
            </Text>
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 4 }} aria-hidden>
        <Legend color={c.brand} label="Within target" />
        <Legend color={c.ink} label="Over" />
        <Legend color={c.line} label="Not logged" />
        <Legend color={c.brand} faded label="Today so far" />
      </View>
    </Card>
  );
}

function Legend({ color, label, faded }: { color: string; label: string; faded?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, opacity: faded ? 0.45 : 1 }} />
      <Text weight={600} size={12} color={c.ink3}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  target: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(107,110,118,0.6)",
  },
  targetLabel: { position: "absolute", right: 0, top: -20 },
});
