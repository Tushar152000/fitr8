import { router } from "expo-router";
import { Camera, Keyboard, Plus } from "lucide-react-native";
import { View } from "react-native";
import { Button, Card, MealRow, Text } from "@/components/ui";
import { formatInt, formatTime, MEAL_LABEL, MEAL_TYPES, mealTitle } from "@/lib/format";
import { dayLabel } from "@/lib/meal-param";
import { useColors } from "@/lib/theme";
import type { Day } from "@/lib/types";

/**
 * A day's meals (the Meals tab): grouped by Breakfast / Lunch / Snack / Dinner in day order (empty
 * groups take no space), one "Log food" under them, and the design-6b empty card when nothing is
 * logged. `pastDay` = a recent day being filled in (typing first; the meal is long eaten).
 */
export function DayMeals({ day, pastDay }: { day: Day; pastDay: string | null }) {
  const c = useColors();
  const logParams = () => (pastDay ? { date: pastDay } : {});
  const logPath = pastDay ? "/log/type" : "/log";
  const dayName = pastDay ? dayLabel(pastDay).toLowerCase() : "today";

  return (
    <View style={{ gap: 16 }}>
      {day.meals.length === 0 && (
        <Card dark>
          <View style={{ gap: 4 }}>
            <Text variant="h2" size={22} color={c.white}>
              {pastDay ? `Nothing logged for ${dayName}` : "Log your first meal"}
            </Text>
            <Text size={13} color="rgba(255,255,255,0.75)">
              {pastDay
                ? "Forgot to log? Type what you ate and it counts for that day."
                : "Snap your plate and we'll find the foods, or type it in a line."}
            </Text>
          </View>
          {/* Today: Snap first. A past day: Type first (the meal is long eaten). */}
          <View style={{ flexDirection: pastDay ? "row-reverse" : "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button
                variant={pastDay ? "ghostDark" : "primary"}
                icon={Camera}
                onPress={() => router.push({ pathname: "/log", params: logParams() })}
              >
                Snap
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant={pastDay ? "primary" : "ghostDark"}
                icon={Keyboard}
                onPress={() => router.push({ pathname: "/log/type", params: logParams() })}
              >
                Type
              </Button>
            </View>
          </View>
        </Card>
      )}

      {MEAL_TYPES.map((t) => {
        const meals = day.meals.filter((m) => m.mealType === t);
        if (meals.length === 0) return null;
        const kcal = meals.reduce((sum, m) => sum + (m.status === "CONFIRMED" ? m.totalKcal : 0), 0);
        return (
          <View key={t} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text weight={600}>{MEAL_LABEL[t]}</Text>
              <Text weight={600} size={13} color={c.ink3} tabular>
                {formatInt(kcal)} kcal
              </Text>
            </View>
            {meals.map((m) => (
              <MealRow
                key={m.id}
                onPress={() => router.push(`/log/${m.id}`)}
                photoUrl={m.photoUrl}
                meta={`${MEAL_LABEL[m.mealType]} · ${formatTime(m.createdAt, day.timezone)}`}
                title={mealTitle(
                  m.items.map((i) => i.name),
                  m.source === "TEXT" ? (m.inputText ?? "Typed meal") : "Photo",
                )}
                kcal={m.totalKcal}
                status={m.status}
              />
            ))}
          </View>
        );
      })}

      {day.meals.length > 0 && (
        <Button variant="dashed" icon={Plus} onPress={() => router.push({ pathname: logPath, params: logParams() })}>
          Log food
        </Button>
      )}
    </View>
  );
}
