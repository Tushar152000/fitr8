import { Check } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { weekdayName } from "@/lib/dates";
import { makeStyles, radius, useColors, type Colors } from "@/lib/theme";
import type { DayState, TodayWorkout } from "@/lib/types";

const stripStyles = (c: Colors): Record<DayState, { bg: string; fg: string; border?: string; dashed?: boolean }> => ({
  today: { bg: c.strong, fg: c.onStrong },
  done: { bg: c.proteinSoft, fg: c.protein },
  planned: { bg: c.surface, fg: c.ink, border: c.lineStrong },
  missed: { bg: c.surface, fg: c.ink3, border: c.lineStrong, dashed: true },
  rest: { bg: c.sunken, fg: c.ink3 },
  before: { bg: c.sunken, fg: c.ink3 },
});

/** This week's gym days in focus mode (15b): today, done, planned, missed and rest at a glance. */
export function WeekStrip({ strip }: { strip: TodayWorkout["strip"] }) {
  const c = useColors();
  const styles = useStyles();
  const STRIP = stripStyles(c);
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel="This week">
      {strip.map((d) => {
        const s = STRIP[d.state];
        return (
          <View
            key={d.date}
            accessibilityLabel={`${weekdayName(d.date)}: ${d.name ?? "rest"}, ${d.state}`}
            style={[
              styles.day,
              { backgroundColor: s.bg },
              s.border && { borderWidth: 1, borderColor: s.border, borderStyle: s.dashed ? "dashed" : "solid" },
            ]}
          >
            <Text weight={700} size={12} color={s.fg}>
              {weekdayName(d.date, "narrow")}
            </Text>
            {d.state === "done" ? (
              <Check size={14} color={s.fg} strokeWidth={3} />
            ) : (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: d.state === "rest" ? "transparent" : s.fg,
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  day: { flex: 1, height: 56, borderRadius: radius.input, alignItems: "center", justifyContent: "center", gap: 4 },
}));
