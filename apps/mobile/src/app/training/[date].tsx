import type { TrainingDayDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Play } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { QueryError } from "@/components/query-error";
import { WorkoutSkeleton } from "@/components/skeletons";
import { Button, Card, Screen, Text } from "@/components/ui";
import { CoachTips } from "@/components/workout/coach-tips";
import { LogSheet } from "@/components/workout/log-sheet";
import { LoggedRow } from "@/components/workout/logged-row";
import { SessionBlocks } from "@/components/workout/session-blocks";
import { SessionTimer } from "@/components/workout/session-timer";
import { Stat } from "@/components/workout/stat";
import { StepList } from "@/components/workout/step-list";
import { track } from "@/lib/analytics";
import { recentDays } from "@/lib/meal-param";
import { trainingWeekQuery } from "@/lib/queries";
import { dayColors, DAY_LABEL, EFFORT_LABEL, kcalText, SESSION_VERB } from "@/lib/training";
import { makeStyles, useColors } from "@/lib/theme";

/** 16d: one day of the week (runs, rides, yoga, walks, rest) with a guided timer and "log it". */
export default function TrainingDayScreen() {
  const { date, start } = useLocalSearchParams<{ date: string; start?: string }>();
  const week = useQuery(trainingWeekQuery(date));
  const day = week.data?.days.find((d) => d.date === date);

  if (week.isPending)
    return (
      <Screen>
        <BackHeader />
        <WorkoutSkeleton />
      </Screen>
    );
  if (week.isError || !day)
    return (
      <Screen>
        <BackHeader />
        <QueryError error={week.error ?? new Error("That day isn't in your plan.")} onRetry={() => week.refetch()} />
      </Screen>
    );
  return <DayDetail day={day} today={week.data.today} autoStart={start === "1"} />;
}

function DayDetail({ day, today, autoStart }: { day: TrainingDayDto; today: string; autoStart: boolean }) {
  const c = useColors();
  const styles = useStyles();
  const col = dayColors(c, day.type);
  const verbs = SESSION_VERB[day.type];
  // Sessions can be done and logged today or on the last 7 days (the API's window).
  const loggable = recentDays().includes(day.date);
  const canStart = Boolean(verbs) && day.date === today && day.blocks.length > 0;
  const [timerOn, setTimerOn] = useState(autoStart && canStart);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    track("training_day_opened", { type: day.type, weekday: day.weekday });
  }, [day.type, day.weekday]);

  return (
    <Screen>
      <BackHeader>
        <View style={{ flexDirection: "row" }}>
          <View style={[styles.badge, { backgroundColor: col.soft }]}>
            <Text size={12} weight={700} color={col.fg}>
              {day.weekday} · {DAY_LABEL[day.type]}
            </Text>
          </View>
        </View>
      </BackHeader>

      <View style={{ gap: 6 }}>
        <Text variant="h1">{day.title}</Text>
        <Text color={c.ink2}>{day.why}</Text>
      </View>

      {day.type !== "rest" && (
        <Card style={{ flexDirection: "row", gap: 12 }}>
          <Stat label="Time" value={`${day.minutes} min`} />
          {day.distanceKm != null && <Stat label="Running" value={`~${day.distanceKm} km`} />}
          <Stat label={day.logs.length ? "Burned about" : "Burns about"} value={`${kcalText(day.kcal)} kcal`} />
          {day.distanceKm == null && <Stat label="Effort" value={EFFORT_LABEL[day.effort]} />}
        </Card>
      )}

      {timerOn ? (
        <SessionTimer day={day} onStop={() => setTimerOn(false)} />
      ) : (
        <>
          {day.blocks.length > 0 && <SessionBlocks day={day} />}
          <StepList steps={day.steps} />
        </>
      )}

      {day.tips.length > 0 && !timerOn && <CoachTips tips={day.tips} />}

      {day.logs.length > 0 && (
        <Card>
          <Text weight={700}>Done</Text>
          {day.logs.map((l) => (
            <LoggedRow key={l.id} log={l} />
          ))}
        </Card>
      )}

      {!timerOn && verbs && (
        <View style={{ gap: 10 }}>
          {canStart && (
            <Button icon={Play} onPress={() => setTimerOn(true)}>
              {verbs.start}
            </Button>
          )}
          {loggable ? (
            <Button variant="secondary" onPress={() => setLogOpen(true)}>
              {day.logs.length ? "Change what you logged" : verbs.did}
            </Button>
          ) : (
            <Text size={13} color={c.ink3} center>
              {day.date > today ? `This session is planned for ${day.weekday}.` : "This day is too long ago to log."}
            </Text>
          )}
        </View>
      )}
      {day.type === "rest" && (
        <Text size={13} color={c.ink3} center>
          Rest is part of the plan. Fancy a walk anyway? Log it from a walk day.
        </Text>
      )}

      <LogSheet open={logOpen} onClose={() => setLogOpen(false)} day={day} />
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
}));
