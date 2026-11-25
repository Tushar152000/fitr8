import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronRight, UtensilsCrossed } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { HealthTodayCard } from "@/components/health/today-card";
import { PremiumBanner } from "@/components/premium/home-banner";
import { QueryError } from "@/components/query-error";
import { TodaySkeleton } from "@/components/skeletons";
import { Card, FadeIn, InsightCard, Skeleton, Text } from "@/components/ui";
import { WorkoutUnlockBanner } from "@/components/workout/unlock-banner";
import { canLogOn, dayLabel, recentDays } from "@/lib/meal-param";
import { dayQueryFor, progressQuery } from "@/lib/queries";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { Day } from "@/lib/types";
import { CalorieCard } from "./calorie-card";
import { HydrationCard } from "./hydration-card";
import { WeightCard } from "./weight-card";

/**
 * One page of Home's day strip. Each page fetches its own day, so neighbours are loaded before
 * they're swiped in; a page still loading shows the day skeleton in place, then fades in.
 */
export function DayPage({ date, isToday, current }: { date: string; isToday: boolean; current: boolean }) {
  const day = useQuery(dayQueryFor(isToday ? null : date));
  if (day.isPending) return <TodaySkeleton />;
  if (day.isError) {
    return current ? <QueryError error={day.error} onRetry={() => day.refetch()} /> : <TodaySkeleton />;
  }
  return (
    <FadeIn>
      <DayContent day={day.data} pastDay={isToday ? null : date} />
    </FadeIn>
  );
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
    <View style={{ gap: 14 }}>
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
  return (
    <FadeIn>
      <WeightCard p={progress.data} />
    </FadeIn>
  );
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
          {canLogOn(date) ? "See or add meals for " : "View meals for "}
          {date === recentDays()[1] ? "yesterday" : dayLabel(date)}
        </Text>
      </View>
      <ChevronRight size={20} color={c.ink3} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  pastMeals: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: c.surface,
  },
}));
