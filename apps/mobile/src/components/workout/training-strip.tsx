import type { TrainingDayDto } from "@fitr8/contracts";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { DAY_LABEL, weekdayLetter } from "@/lib/training";
import { fade, makeStyles, useColors, useScheme } from "@/lib/theme";

const STATUS_WORD = { done: ", done", missed: ", missed", planned: "", today: ", today" } as const;

/**
 * Figma "Week": M–S in a white pill. The selected day is a black pill (white letter, lime dot); the
 * dot says what the day holds: filled olive = done, outlined olive = a session to do, outlined grey
 * = a missed session, none = rest (letter faded). Today, when not selected, has an olive letter.
 */
export function TrainingStrip({
  days,
  today,
  selected,
  onSelect,
}: {
  days: TrainingDayDto[];
  today: string;
  selected: string;
  onSelect: (day: TrainingDayDto) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const dark = useScheme() === "dark";
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {days.map((d) => {
        const on = d.date === selected;
        const rest = d.type === "rest";
        const dot = on
          ? { backgroundColor: dark ? c.brand : c.highlight }
          : d.status === "done"
            ? { backgroundColor: c.brand }
            : rest
              ? null
              : { borderWidth: 1.2, borderColor: d.status === "missed" ? c.ink3 : c.brand };
        const letter = on ? c.onStrong : d.date === today ? c.brandText : rest ? fade(c.ink, 0.45) : c.ink;
        return (
          <PressableScale
            key={d.date}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${d.weekday}: ${DAY_LABEL[d.type]}, ${d.title}${STATUS_WORD[d.status]}`}
            onPress={() => onSelect(d)}
            style={[styles.day, on && { backgroundColor: c.strong }]}
          >
            <Text variant="labelStrong" color={letter}>
              {weekdayLetter(d.date)}
            </Text>
            <View style={[styles.dot, dot]} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  track: { flexDirection: "row", gap: 4, padding: 6, borderRadius: 100, backgroundColor: c.surface },
  day: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 100 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
}));
