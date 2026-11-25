import type { TrainingDayDto } from "@fitr8/contracts";
import { router } from "expo-router";
import { View } from "react-native";
import { Button, Card, Text } from "@/components/ui";
import { dayColors, DAY_LABEL, EFFORT_LABEL, kcalText } from "@/lib/training";
import { makeStyles, useColors } from "@/lib/theme";
import { StepList } from "./step-list";

/** The selected day: what, why, how long, and the one action for its type. */
export function DayCard({ day, today }: { day: TrainingDayDto; today: string }) {
  const c = useColors();
  const styles = useStyles();
  const col = dayColors(c, day.type);
  const isToday = day.date === today;
  const logged = day.logs.length > 0;

  const cta = (() => {
    switch (day.type) {
      case "gym":
        return isToday ? { label: "Start workout", onPress: () => router.push("/workout-session") } : null;
      case "run":
      case "hiit":
        return { label: "See run details", onPress: () => router.push(`/training/${day.date}`) };
      case "cycle":
        return { label: "See ride details", onPress: () => router.push(`/training/${day.date}`) };
      case "yoga":
        return {
          label: day.title === "Mobility" ? "Start mobility" : "Start flow",
          onPress: () => router.push({ pathname: "/training/[date]", params: { date: day.date, start: "1" } }),
        };
      default:
        return {
          label: day.type === "walk" ? "See walk plan" : "See rest-day plan",
          onPress: () => router.push(`/training/${day.date}`),
        };
    }
  })();

  return (
    <Card style={{ borderWidth: 1, borderColor: col.soft }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={[styles.badge, { backgroundColor: col.soft }]}>
          <Text size={12} weight={700} color={col.fg}>
            {DAY_LABEL[day.type]}
          </Text>
        </View>
        <Text variant="meta">
          {day.weekday}
          {isToday ? " · Today" : ""}
        </Text>
        {day.status === "done" && (
          <View style={[styles.badge, { backgroundColor: c.proteinSoft, marginLeft: "auto" }]}>
            <Text size={12} weight={700} color={c.protein}>
              Done
            </Text>
          </View>
        )}
      </View>
      <View style={{ gap: 4 }}>
        <Text variant="h2" size={22}>
          {day.title}
        </Text>
        <Text size={14} color={c.ink2}>
          {day.why}
        </Text>
      </View>

      {day.type !== "rest" && (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text size={12} weight={600} color={c.ink3}>
              Time
            </Text>
            <Text weight={700} tabular>
              {day.minutes} min
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text size={12} weight={600} color={c.ink3}>
              {logged ? "Burned about" : "Burns about"}
            </Text>
            <Text weight={700} tabular>
              {kcalText(day.kcal)} kcal
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text size={12} weight={600} color={c.ink3}>
              Effort
            </Text>
            <Text weight={700}>{EFFORT_LABEL[day.effort]}</Text>
          </View>
        </View>
      )}

      {day.steps.length > 0 && <StepList steps={day.steps} inset />}

      {logged && (
        <Text size={13} color={c.protein} weight={600}>
          Logged:{" "}
          {day.logs
            .map((l) => `${DAY_LABEL[l.type]} ${l.minutes} min${l.distanceKm ? `, ${l.distanceKm} km` : ""}`)
            .join(" · ")}
        </Text>
      )}
      {cta ? (
        <Button variant={isToday && !logged ? "primary" : "secondary"} onPress={cta.onPress}>
          {cta.label}
        </Button>
      ) : (
        <Text size={13} color={c.ink3} center>
          {day.date > today
            ? `Your ${day.title.toLowerCase()} session opens on ${day.weekday}.`
            : "Gym sessions are logged on the day."}
        </Text>
      )}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
}));
