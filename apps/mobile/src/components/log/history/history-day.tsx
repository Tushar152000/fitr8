import type { HistoryDayDto } from "@fitr8/contracts";
import { router } from "expo-router";
import { View } from "react-native";
import { MealRow } from "@/components/meals/meal-row";
import { Card, Text } from "@/components/ui";
import { formatYmd } from "@/lib/dates";
import { formatInt, formatTime, MEAL_LABEL, type MealType } from "@/lib/format";
import { useColors } from "@/lib/theme";

/** Screen 12: the picked day's kcal against its target and its meals (each opens meal review). */
export function HistoryDay({ day }: { day: HistoryDayDto }) {
  const c = useColors();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text variant="h2">
          {day.isToday ? "Today" : formatYmd(day.date, { weekday: "long", day: "numeric", month: "short" })}
        </Text>
        <Text variant="meta" tabular>
          {formatInt(day.kcal)}
          {day.target ? ` / ${formatInt(day.target)}` : ""} kcal
        </Text>
      </View>
      {day.meals.length ? (
        day.meals.map((m) => (
          <MealRow
            key={m.id}
            onPress={() => router.push(`/log/${m.id}`)}
            meta={`${MEAL_LABEL[m.mealType as MealType]} · ${formatTime(m.createdAt)}`}
            title={m.title}
            kcal={m.kcal}
          />
        ))
      ) : (
        <Card>
          <Text color={c.ink3}>Nothing logged this day.</Text>
        </Card>
      )}
    </View>
  );
}
