import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { CalendarSheet } from "@/components/calendar/calendar-sheet";
import { DaySwitcher } from "@/components/home/day-switcher";
import { DayMeals } from "@/components/meals/day-meals";
import { QueryError } from "@/components/query-error";
import { TodaySkeleton } from "@/components/skeletons";
import { FadeIn, Screen, Text } from "@/components/ui";
import { canLogOn, pagerDays, viewableDay } from "@/lib/meal-param";
import { dayQueryFor } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { useColors } from "@/lib/theme";
import { usePullRefresh } from "@/lib/use-pull-refresh";
import { showDay, useViewDay } from "@/lib/view-day";

const EYEBROW = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short" });
const eyebrow = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return EYEBROW.format(new Date(y, m - 1, d)).replace(/^(\w+) /, "$1, ");
};

/**
 * Meals tab (Figma "Meals"): date + title, the day switcher (middle → month calendar), the day's
 * summary, Quick log and one card per meal slot. Shares the viewed day with Home; the calendar can
 * jump to any earlier day (older than the logging window = read-only).
 */
export default function MealsScreen() {
  const c = useColors();
  const [calendar, setCalendar] = useState(false);
  const viewDay = viewableDay(useViewDay());
  const days = pagerDays(viewDay);
  const index = viewDay ? Math.max(0, days.indexOf(viewDay)) : 0;
  const go = (i: number) => showDay(i <= 0 ? null : days[Math.min(i, days.length - 1)]);
  const isToday = index === 0;
  // Keep the last day on screen (dimmed) while the next one loads, instead of flashing a skeleton.
  const day = useQuery({ ...dayQueryFor(isToday ? null : days[index]), placeholderData: keepPreviousData });
  const pull = usePullRefresh(() =>
    Promise.all(
      [["day"], ["meal-suggestion"], ["calendar"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ),
  );

  return (
    <Screen tabBar refreshing={pull.refreshing} onRefresh={pull.onRefresh} contentStyle={{ gap: 16 }}>
      <View style={{ gap: 2 }}>
        <Text variant="labelStrong" color={c.ink2}>
          {eyebrow(days[index])}
        </Text>
        <Text variant="title" accessibilityRole="header">
          Meals
        </Text>
      </View>

      <DaySwitcher
        day={days[index]}
        canOlder={index < days.length - 1}
        canNewer={index > 0}
        onOlder={() => go(index + 1)}
        onNewer={() => go(index - 1)}
        onToday={() => go(0)}
        onCalendar={() => setCalendar(true)}
      />

      {day.isPending ? (
        <TodaySkeleton />
      ) : day.isError ? (
        <QueryError error={day.error} onRetry={() => day.refetch()} />
      ) : (
        <FadeIn style={day.isPlaceholderData && { opacity: 0.6 }}>
          <DayMeals day={day.data} pastDay={isToday ? null : days[index]} canLog={canLogOn(days[index])} />
        </FadeIn>
      )}

      <CalendarSheet
        open={calendar}
        onClose={() => setCalendar(false)}
        selected={days[index]}
        onPick={(ymd) => showDay(ymd === days[0] ? null : ymd)}
      />
    </Screen>
  );
}
