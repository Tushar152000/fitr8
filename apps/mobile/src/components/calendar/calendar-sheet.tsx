import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { QueryError } from "@/components/query-error";
import { Sheet } from "@/components/sheet";
import { PillButton, PressableScale, Text } from "@/components/ui";
import {
  addMonths,
  calendarQuery,
  calendarSummary,
  monthOf,
  monthTitle,
  monthWeeks,
  type CalendarStatus,
} from "@/lib/calendar";
import { useMe } from "@/lib/auth";
import { localYmd } from "@/lib/meal-param";
import { makeStyles, useColors, radius } from "@/lib/theme";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * The month shown in a calendar (starts on `selected`'s month; `reset()` goes back there) and its
 * data, title and subtitle. Shared by the calendar sheet and the streak sheet's calendar view.
 */
export function useCalendarMonth(selected: string, enabled: boolean) {
  const [month, setMonth] = useState(() => monthOf(selected));
  const cal = useQuery({ ...calendarQuery(month), enabled, placeholderData: keepPreviousData });
  return {
    month,
    setMonth,
    reset: () => setMonth(monthOf(selected)),
    cal,
    title: monthTitle(month),
    subtitle: cal.data ? calendarSummary(cal.data.summary) : " ",
  };
}

/**
 * ‹ › round buttons for the sheet header: next is off at the current month, previous at the month
 * the user started in (`/me` `startedOn`).
 */
export function MonthArrows({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const c = useColors();
  const startedOn = useMe().startedOn;
  const atNow = month >= monthOf(localYmd());
  const atStart = Boolean(startedOn) && month <= monthOf(startedOn);
  return (
    <>
      <RoundButton label="Previous month" disabled={atStart} onPress={() => setMonth(addMonths(month, -1))}>
        <ChevronLeft size={20} color={atStart ? c.ink3 : c.ink} strokeWidth={2} />
      </RoundButton>
      <RoundButton label="Next month" disabled={atNow} onPress={() => setMonth(addMonths(month, 1))}>
        <ChevronRight size={20} color={atNow ? c.ink3 : c.ink} strokeWidth={2} />
      </RoundButton>
    </>
  );
}

/**
 * Figma "Sheet/Calendar" (Meals and Home, from the middle of the day switcher): the month with a dot
 * per day (olive on target, blue over target, hollow ring missed), the selected day in a black
 * circle, future days greyed. Tapping a day up to today shows it (`onPick`); "Go to today" too.
 * Keep it mounted (the sheet animates closed); each opening starts on the selected day's month.
 */
export function CalendarSheet({
  open,
  onClose,
  selected,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** The day being viewed, YYYY-MM-DD. */
  selected: string;
  onPick: (ymd: string) => void;
}) {
  const m = useCalendarMonth(selected, open);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) m.reset();
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      figma
      gap={18}
      title={m.title}
      subtitle={m.subtitle}
      trailing={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <MonthArrows month={m.month} setMonth={m.setMonth} />
        </View>
      }
    >
      <CalendarBody
        month={m.month}
        cal={m.cal}
        selected={selected}
        onPick={(ymd) => {
          onPick(ymd);
          onClose();
        }}
      />
    </Sheet>
  );
}

/** Weekday row, the 6-row month grid, the legend and "Go to today" (18 px apart, as in Figma). */
export function CalendarBody({
  month,
  cal,
  selected,
  onPick,
}: {
  month: string;
  cal: ReturnType<typeof useCalendarMonth>["cal"];
  selected: string;
  onPick: (ymd: string) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const today = localYmd();
  // Days before the user's first day can't be opened, drawn like future days.
  const startedOn = useMe().startedOn ?? "";
  const status = new Map((cal.data?.month === month ? cal.data.days : []).map((d) => [d.date, d.status]));
  return (
    <View style={{ gap: 18 }}>
      {cal.isError && !cal.data ? (
        <QueryError error={cal.error} onRetry={() => cal.refetch()} />
      ) : (
        <View style={[{ gap: 2 }, cal.isPlaceholderData && { opacity: 0.6 }]}>
          <View style={styles.weekdays}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} variant="captionStrong" color={c.ink3} style={styles.cellText}>
                {d}
              </Text>
            ))}
          </View>
          {monthWeeks(month).map((week, i) => (
            <View key={i} style={{ flexDirection: "row" }}>
              {week.map((ymd, j) =>
                ymd ? (
                  <Day
                    key={ymd}
                    ymd={ymd}
                    status={status.get(ymd) ?? "none"}
                    selected={ymd === selected}
                    isToday={ymd === today}
                    future={ymd > today || ymd < startedOn}
                    onPress={() => onPick(ymd)}
                  />
                ) : (
                  <View key={j} style={styles.empty} />
                ),
              )}
            </View>
          ))}
        </View>
      )}
      <View style={styles.legend}>
        <Legend dot={<View style={[styles.dot8, { backgroundColor: c.brand }]} />} label="On target" />
        <Legend dot={<View style={[styles.dot8, { backgroundColor: c.link }]} />} label="Over target" />
        <Legend dot={<View style={[styles.dot8, styles.ring]} />} label="Missed" />
      </View>
      <PillButton variant="soft" label="Go to today" onPress={() => onPick(today)} />
    </View>
  );
}

function Day({
  ymd,
  status,
  selected,
  isToday,
  future,
  onPress,
}: {
  ymd: string;
  status: CalendarStatus;
  selected: boolean;
  isToday: boolean;
  future: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const n = Number(ymd.slice(8));
  const color = selected
    ? c.onStrong
    : future
      ? c.ink3
      : status === "on_target" || status === "over_target" || isToday
        ? c.ink
        : c.ink2;
  const words = { on_target: "on target", over_target: "over target", missed: "missed", none: "" }[status];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${ymd}${isToday ? ", today" : ""}${words ? `, ${words}` : ""}`}
      accessibilityState={{ selected, disabled: future }}
      disabled={future}
      onPress={onPress}
      style={styles.day}
    >
      <View style={[styles.number, selected && { backgroundColor: c.strong }]}>
        <Text variant="labelStrong" color={color} tabular>
          {n}
        </Text>
      </View>
      <View
        style={[
          styles.marker,
          status === "on_target" && { backgroundColor: c.brand },
          status === "over_target" && { backgroundColor: c.link },
          status === "missed" && styles.ring,
        ]}
      />
    </PressableScale>
  );
}

/** 36 px round soft button (canvas fill) for sheet headers. */
export function RoundButton({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={styles.round}
    >
      {children}
    </PressableScale>
  );
}

function Legend({ dot, label }: { dot: ReactNode; label: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {dot}
      <Text variant="labelMedium" color={c.ink2}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  weekdays: { flexDirection: "row", paddingBottom: 6 },
  cellText: { flex: 1, textAlign: "center" },
  empty: { flex: 1, height: 48 }, // = a day cell (4 + 32 + 3 + 5 + 4)
  day: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 },
  number: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  marker: { width: 5, height: 5, borderRadius: 2.5 },
  ring: { borderWidth: 1, borderColor: c.lineStrong },
  dot8: { width: 8, height: 8, borderRadius: 4 },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.ground,
    alignItems: "center",
    justifyContent: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.box,
    backgroundColor: c.ground,
  },
}));
