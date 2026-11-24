import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { ChevronRight, UtensilsCrossed } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { TodaySkeleton } from "@/components/skeletons";
import { Card, InsightCard, Screen, Skeleton, Text } from "@/components/ui";
import { DAY_WINDOW_RADIUS, DayStrip, useDayPager } from "@/components/day-pager";
import { DaySwitcher } from "@/components/day-switcher";
import { CalorieCard } from "@/components/home/calorie-card";
import { HydrationCard } from "@/components/home/hydration-card";
import { WeightCard } from "@/components/home/weight-card";
import { QueryError } from "@/components/query-error";
import { queryClient } from "@/lib/query";
import { useMe } from "@/lib/auth";
import { dayFromParam, dayLabel, recentDays } from "@/lib/meal-param";
import { dayQueryFor, progressQuery } from "@/lib/queries";
import { showDay, useViewDay } from "@/lib/view-day";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { Day } from "@/lib/types";
import { usePremiumIntro } from "@/lib/premium";
import { PremiumBadge } from "@/components/premium-badge";
import { PremiumBanner } from "@/components/premium/home-banner";
import { HealthTodayCard } from "@/components/health/today-card";
import { WorkoutUnlockBanner } from "@/components/workout/unlock-banner";

function greeting(hour: number) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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
  const styles = useStyles();

  const now = new Date();
  const dateText = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short" }).format(now);
  const firstName = me.name?.split(" ")[0];

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["day"] }),
      queryClient.invalidateQueries({ queryKey: ["progress"] }),
      queryClient.invalidateQueries({ queryKey: ["water"] }),
    ]);
    setRefreshing(false);
  };

  return (
    // A horizontal swipe anywhere on the screen pages between days; only the day strip moves.
    <GestureDetector gesture={pager.gesture}>
      <View style={{ flex: 1 }}>
        <Screen tabBar refreshing={refreshing} onRefresh={refresh} contentStyle={{ gap: 16 }}>
          <View style={styles.header}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text weight={600} size={13} color={styles.meta.color}>
                  {dateText}
                </Text>
                {me.plan === "PRO" && <PremiumBadge />}
              </View>
              <Text variant="h1" size={26}>
                {greeting(now.getHours())}
                {firstName ? `, ${firstName}` : ""}
              </Text>
            </View>
            <ProfileButton name={me.name} image={me.image} />
          </View>

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

/** Profile lives behind this button now that the tab bar is Home · Meals · Workout · Coach. */
function ProfileButton({ name, image }: { name: string | null; image: string | null }) {
  const c = useColors();
  const styles = useStyles();
  const initial = name?.trim()[0]?.toUpperCase();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Profile and settings"
      onPress={() => router.push("/profile")}
      hitSlop={6}
      style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.7 }]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.avatarImage} />
      ) : (
        <Text weight={700} size={16} color={c.ink}>
          {initial ?? "?"}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * One page of the strip. Each page fetches its own day, so neighbours are loaded before they're
 * swiped in; a page still loading shows the day skeleton in place.
 */
function DayPage({ date, isToday, current }: { date: string; isToday: boolean; current: boolean }) {
  const day = useQuery(dayQueryFor(isToday ? null : date));
  if (day.isPending) return <TodaySkeleton />;
  if (day.isError) {
    return current ? <QueryError error={day.error} onRetry={() => day.refetch()} /> : <TodaySkeleton />;
  }
  return <DayContent day={day.data} pastDay={isToday ? null : date} />;
}

function DayContent({ day, pastDay }: { day: Day; pastDay: string | null }) {
  const c = useColors();
  const target = day.target;
  const over = target ? day.eaten.kcal - target.kcal : 0;
  const positiveNote =
    target && day.eaten.proteinG >= target.proteinG
      ? `You still hit your protein (${Math.round(day.eaten.proteinG)} g) — that's what matters most. Tomorrow resets.`
      : day.streak > 1
        ? `You've logged ${day.streak} days in a row. One day over doesn't undo that. Tomorrow resets.`
        : "Logging it honestly is the hard part, and you did it. Tomorrow resets.";

  return (
    <View style={{ gap: 16 }}>
      {target ? (
        <CalorieCard eaten={day.eaten} target={target} />
      ) : (
        <Card>
          <Text color={c.ink2}>No targets yet. Finish your plan in Profile.</Text>
        </Card>
      )}

      {target && over > 0 && <InsightCard headline="A little over. No stress." reason={positiveNote} />}

      {pastDay ? (
        <PastDayMeals day={day} date={pastDay} />
      ) : (
        <>
          <HydrationCard />
          <TodayWeight />
          <PremiumBanner />
          {/* Design 16: workouts for free users. Then the health apps' numbers. */}
          <WorkoutUnlockBanner />
          <HealthTodayCard />
        </>
      )}
    </View>
  );
}

function TodayWeight() {
  const progress = useQuery(progressQuery);
  if (progress.isPending) return <Skeleton height={150} radius={radius.card} />;
  if (progress.isError) return <QueryError error={progress.error} onRetry={() => progress.refetch()} />;
  return <WeightCard p={progress.data} />;
}

/** A past day on Home: its meals are on the Meals tab (same day). */
function PastDayMeals({ day, date }: { day: Day; date: string }) {
  const c = useColors();
  const styles = useStyles();
  const count = day.meals.length;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.navigate("/meals")}
      style={({ pressed }) => [styles.pastMeals, pressed && { backgroundColor: c.sunken }]}
    >
      <UtensilsCrossed size={20} color={c.ink2} />
      <View style={{ flex: 1 }}>
        <Text weight={600}>{count ? `${count} meal${count === 1 ? "" : "s"} logged` : "Nothing logged"}</Text>
        <Text size={13} color={c.ink3}>
          See or add meals for {dayLabel(date).toLowerCase()}
        </Text>
      </View>
      <ChevronRight size={20} color={c.ink3} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  meta: { color: c.ink3 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 44, height: 44 },
  pastMeals: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: c.surface,
  },
}));
