import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { DayPage } from "@/components/home/day-page";
import { DAY_WINDOW_RADIUS, DayStrip, useDayPager } from "@/components/home/day-pager";
import { DaySwitcher } from "@/components/home/day-switcher";
import { HomeHeader } from "@/components/home/home-header";
import { Screen } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { recentDays, dayFromParam } from "@/lib/meal-param";
import { usePremiumIntro } from "@/lib/premium";
import { dayQueryFor } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { usePullRefresh } from "@/lib/use-pull-refresh";
import { showDay, useViewDay } from "@/lib/view-day";

const refreshHome = () =>
  Promise.all([["day"], ["progress"], ["water"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })));

/**
 * Home (v2 design): greeting, the day switcher, then the day's calories and macros, today's water
 * and the latest weight. Meals live on the Meals tab. Swipe or use the arrows to look at a recent
 * day (up to a week back).
 */
export default function HomeScreen() {
  const me = useMe();
  usePremiumIntro(me);
  // null = today. A day that has slid out of the window (app left open for days) falls back to today.
  const viewDay = dayFromParam(useViewDay() ?? undefined);
  const days = recentDays(); // today first
  const index = viewDay ? Math.max(0, days.indexOf(viewDay)) : 0;
  // Stable on purpose: the day pager builds its swipe gesture once from it (see day-pager.tsx).
  const go = useCallback((i: number) => {
    const all = recentDays();
    showDay(i <= 0 ? null : all[Math.min(i, all.length - 1)]);
  }, []);
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
    // A horizontal swipe anywhere on the screen pages between days; only the day strip moves.
    <GestureDetector gesture={pager.gesture}>
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
          />

          <DayStrip
            pager={pager}
            days={days}
            index={index}
            renderDay={(date, current) => <DayPage date={date} isToday={date === days[0]} current={current} />}
          />
        </Screen>
      </View>
    </GestureDetector>
  );
}
