import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { History } from "lucide-react-native";
import { View } from "react-native";
import { DaySwitcher } from "@/components/home/day-switcher";
import { DayMeals } from "@/components/meals/day-meals";
import { QueryError } from "@/components/query-error";
import { TodaySkeleton } from "@/components/skeletons";
import { FadeIn, PressableScale, Screen, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { dayFromParam, recentDays } from "@/lib/meal-param";
import { dayQueryFor } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { makeStyles, useColors } from "@/lib/theme";
import { usePullRefresh } from "@/lib/use-pull-refresh";
import { showDay, useViewDay } from "@/lib/view-day";

/**
 * Meals tab (v2): the day's meals by meal, "Log food", and Past logs. Shares the viewed day with
 * Home, so switching to yesterday on one shows yesterday on the other.
 */
export default function MealsScreen() {
  const c = useColors();
  const styles = useStyles();
  const viewDay = dayFromParam(useViewDay() ?? undefined);
  const days = recentDays();
  const index = viewDay ? Math.max(0, days.indexOf(viewDay)) : 0;
  const go = (i: number) => showDay(i <= 0 ? null : days[Math.min(i, days.length - 1)]);
  const isToday = index === 0;
  // Keep the last day on screen (dimmed) while the next one loads, instead of flashing a skeleton.
  const day = useQuery({ ...dayQueryFor(isToday ? null : days[index]), placeholderData: keepPreviousData });
  const pull = usePullRefresh(() => queryClient.invalidateQueries({ queryKey: ["day"] }));

  const eaten = day.data?.eaten.kcal ?? 0;
  const target = day.data?.target?.kcal;

  return (
    <Screen tabBar refreshing={pull.refreshing} onRefresh={pull.onRefresh} contentStyle={{ gap: 16 }}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h1" size={26}>
            Meals
          </Text>
          {day.data && (
            <Text weight={600} size={13} color={c.ink3} tabular>
              {formatInt(eaten)}
              {target ? ` of ${formatInt(target)}` : ""} kcal
            </Text>
          )}
        </View>
        <PressableScale
          accessibilityRole="link"
          accessibilityLabel="Past logs"
          onPress={() => router.push("/history")}
          hitSlop={8}
          style={({ pressed }) => [styles.pastLogs, pressed && { backgroundColor: c.sunken }]}
        >
          <History size={16} color={c.brandText} strokeWidth={2.25} />
          <Text weight={600} size={15} color={c.brandText}>
            Past logs
          </Text>
        </PressableScale>
      </View>

      <DaySwitcher
        day={days[index]}
        canOlder={index < days.length - 1}
        canNewer={index > 0}
        onOlder={() => go(index + 1)}
        onNewer={() => go(index - 1)}
        onToday={() => go(0)}
      />

      {day.isPending ? (
        <TodaySkeleton />
      ) : day.isError ? (
        <QueryError error={day.error} onRetry={() => day.refetch()} />
      ) : (
        <FadeIn style={day.isPlaceholderData && { opacity: 0.6 }}>
          <DayMeals day={day.data} pastDay={isToday ? null : days[index]} />
        </FadeIn>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  pastLogs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: c.brandSoft,
  },
}));
