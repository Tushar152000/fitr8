import { Minus, Plus } from "lucide-react-native";
import { View } from "react-native";
import { FormField, PressableScale, Text } from "@/components/ui";
import { clock, type WeeklySchedule } from "@/lib/reminder-format";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { RoundButton } from "./round-button";

// Monday first, as people in India read a week. Values are 0 = Sunday … 6 = Saturday.
const WEEK = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
] as const;

/**
 * The days-of-the-week toggles and the time of a weekly reminder. A once-a-day time steps by
 * 15 minutes; several times a day are shown as written (changed by describing the reminder again).
 */
export function ScheduleFields({
  schedule,
  onToggleDay,
  onShift,
}: {
  schedule: WeeklySchedule;
  onToggleDay: (day: number) => void;
  onShift: (minutes: number) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const single = schedule.hours.length === 1;
  return (
    <>
      <FormField label="Days" gap={8}>
        <View style={styles.days} accessibilityLabel="Days">
          {WEEK.map(([day, label]) => (
            <PressableScale
              key={day}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: schedule.weekdays.includes(day) }}
              accessibilityLabel={label}
              onPress={() => onToggleDay(day)}
              style={[styles.day, schedule.weekdays.includes(day) && styles.dayOn]}
            >
              <Text weight={600} size={13} color={schedule.weekdays.includes(day) ? c.onStrong : c.ink2}>
                {label.slice(0, 2)}
              </Text>
            </PressableScale>
          ))}
        </View>
      </FormField>

      <FormField label={single ? "Time" : "Times"} gap={8}>
        {single ? (
          <View style={styles.time}>
            <RoundButton icon={Minus} label="15 minutes earlier" onPress={() => onShift(-15)} />
            <Text variant="h1" size={26} tabular style={{ flex: 1, textAlign: "center" }}>
              {clock(schedule.hours[0]!, schedule.minute)}
            </Text>
            <RoundButton icon={Plus} label="15 minutes later" onPress={() => onShift(15)} />
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <Text weight={600} tabular>
              {schedule.hours.map((h) => clock(h, schedule.minute)).join(" · ")}
            </Text>
            <Text size={13} color={c.ink3}>
              To change these times, describe the reminder again.
            </Text>
          </View>
        )}
      </FormField>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  days: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  day: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: c.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  dayOn: { backgroundColor: c.strong },
  time: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.input,
    backgroundColor: c.surface,
    padding: 6,
  },
}));
