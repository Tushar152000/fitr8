import { View } from "react-native";
import { Card, Text } from "@/components/ui";
import { MEAL_TYPES, mealTypeForHour } from "@/lib/format";
import { dayLabel, MEAL_BACKFILL_DAYS } from "@/lib/meal-param";
import { slotShareKcal } from "@/lib/meal-slots";
import { useColors } from "@/lib/theme";
import type { Day } from "@/lib/types";
import { DailySummary } from "./daily-summary";
import { DayTimeline } from "./day-timeline";
import { MealSlotCard } from "./meal-slot-card";
import { QuickLog } from "./quick-log";

/**
 * A day on the Meals tab (Figma "Meals"): the day's summary, the "Your day" timeline, Quick log, then one card per slot
 * (Breakfast, Lunch, Snacks, Dinner). `pastDay` = an earlier day; `canLog` false = older than the
 * logging window (read-only: no quick log or add buttons).
 */
export function DayMeals({ day, pastDay, canLog }: { day: Day; pastDay: string | null; canLog: boolean }) {
  const c = useColors();
  const label = pastDay ? dayLabel(pastDay) : "Today";
  const eatenLabel = label === "Today" || label === "Yesterday" ? `Eaten ${label.toLowerCase()}` : `Eaten on ${label}`;
  const kcalLeft = day.target ? day.target.kcal - day.eaten.kcal : 0;
  const logged = MEAL_TYPES.filter((t) => day.meals.some((m) => m.mealType === t && m.status === "CONFIRMED"));

  return (
    <View style={{ gap: 16 }}>
      <DailySummary day={day} eatenLabel={eatenLabel} />
      <DayTimeline meals={day.meals} timezone={day.timezone} today={!pastDay} />
      {canLog ? (
        <QuickLog
          date={pastDay}
          mealType={pastDay ? null : mealTypeForHour(new Date().getHours())}
          suggestedKcal={
            !pastDay && day.target ? slotShareKcal(kcalLeft, mealTypeForHour(new Date().getHours()), logged) : null
          }
        />
      ) : (
        <Card>
          <Text variant="labelMedium" color={c.ink2}>
            Meals can be added up to {MEAL_BACKFILL_DAYS} days back. This day is read-only.
          </Text>
        </Card>
      )}
      {MEAL_TYPES.map((t) => (
        <MealSlotCard
          key={t}
          type={t}
          // Only the meal for the time of day (today) gets the big Snap / Add food buttons.
          current={!pastDay && t === mealTypeForHour(new Date().getHours())}
          meals={day.meals.filter((m) => m.mealType === t)}
          timezone={day.timezone}
          pastDay={pastDay}
          canLog={canLog}
          suggestedKcal={day.target ? slotShareKcal(kcalLeft, t, logged) : null}
        />
      ))}
    </View>
  );
}
