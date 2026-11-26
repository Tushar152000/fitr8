import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { CalendarSheet } from "@/components/calendar/calendar-sheet";
import { DayPage } from "@/components/home/day-page";
import { DAY_WINDOW_RADIUS, DayStrip, useDayPager } from "@/components/home/day-pager";
import { DaySwitcher } from "@/components/home/day-switcher";
import { HomeHeader } from "@/components/home/home-header";
import { Screen } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { pagerDays, viewableDay } from "@/lib/meal-param";
import { usePremiumIntro } from "@/lib/premium";
import { dayQueryFor } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { usePullRefresh } from "@/lib/use-pull-refresh";
import { currentViewDay, showDay, useViewDay } from "@/lib/view-day";

const refreshHome = () =>
  Promise.all([["day"], ["progress"], ["water"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })));

/**
 * Home (Figma "Home"): avatar, Premium and streak pills, the day switcher, then the day's calories
 * and macros, today's water and the latest weight (banners under them). Meals live on the Meals tab.
 * Use the arrows to look at a recent day (a week back); the calendar (middle of the day
 * switcher, same sheet as Meals) jumps to any earlier day.
 */
export default function HomeScreen() {
  const me = useMe();
  usePremiumIntro(me);
  const [calendar, setCalendar] = useState(false);
  // null = today. Older than the week window only when picked in the calendar.
  // Never before the user's first day in the app (`/me` startedOn).
  const startedOn = me.startedOn;
  const viewDay = viewableDay(useViewDay(), undefined, startedOn);
  const days = pagerDays(viewDay, undefined, startedOn); // today first
  const index = viewDay ? Math.max(0, days.indexOf(viewDay)) : 0;
  // Stable on purpose: the day pager builds its swipe gesture once from it (see day-pager.tsx).
  const go = useCallback(
    (i: number) => {
      const all = pagerDays(viewableDay(currentViewDay(), undefined, startedOn), undefined, startedOn);
      showDay(i <= 0 ? null : all[Math.min(i, all.length - 1)]);
    },
    [startedOn],
  );
  const pager = useDayPager({ days, index, onIndex: go });
  // Prefetch the day just outside the rendered window so a swipe never waits (see day-pager.tsx).
  useEffect(() => {
    for (const i of [index - DAY_WINDOW_RADIUS - 1, index + DAY_WINDOW_RADIUS + 1]) {
      if (i >= 0 && i < days.length) void queryClient.prefetchQuery(dayQueryFor(i === 0 ? null : days[i]));
    }
    // `days` only changes at midnight; the index is what moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  const pull = usePullRefresh(refreshHome);

  return (
    // A sideways swipe moves between tabs (user decision 2026-11-26); the arrows and the calendar
    // change the day, and the day strip still slides.
    <View style={{ flex: 1 }}>
      <Screen tabBar refreshing={pull.refreshing} onRefresh={pull.onRefresh} contentStyle={{ gap: 16 }}>
        <HomeHeader me={me} />

        <DaySwitcher
          day={days[index]}
          canOlder={index < days.length - 1}
          canNewer={index > 0}
          onOlder={() => go(index + 1)}
          onNewer={() => go(index - 1)}
          onToday={() => go(0)}
          onCalendar={() => setCalendar(true)}
        />

        <DayStrip
          pager={pager}
          days={days}
          index={index}
          renderDay={(date, current) => <DayPage date={date} isToday={date === days[0]} current={current} />}
        />
      </Screen>
      <CalendarSheet
        open={calendar}
        onClose={() => setCalendar(false)}
        selected={days[index]}
        onPick={(ymd) => showDay(ymd === days[0] ? null : ymd)}
      />
    </View>
  );
}
