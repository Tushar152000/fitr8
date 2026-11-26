import type { TrainingDayDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Play } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { QueryError } from "@/components/query-error";
import { WorkoutSkeleton } from "@/components/skeletons";
import { Button, PageHeader, Screen, Text } from "@/components/ui";
import { CoachTips } from "@/components/workout/coach-tips";
import { LogSheet } from "@/components/workout/log-sheet";
import { LoggedRow } from "@/components/workout/logged-row";
import { SessionBlocks } from "@/components/workout/session-blocks";
import { SessionTimer } from "@/components/workout/session-timer";
import { Stat } from "@/components/workout/stat";
import { StepList } from "@/components/workout/step-list";
import { track } from "@/lib/analytics";
import { weekdayName } from "@/lib/dates";
import { recentDays } from "@/lib/meal-param";
import { trainingWeekQuery } from "@/lib/queries";
import { DAY_LABEL, EFFORT_LABEL, kcalText, SESSION_VERB } from "@/lib/training";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** 16d: one day of the week (runs, rides, yoga, walks, rest) with a guided timer and "log it". */
export default function TrainingDayScreen() {
  const { date, start } = useLocalSearchParams<{ date: string; start?: string }>();
  const week = useQuery(trainingWeekQuery(date));
  const day = week.data?.days.find((d) => d.date === date);
  // Until the day loads (or when it isn't in the plan), the header names the weekday of the link.
  const heading = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? weekdayName(date) : "Training";

  if (week.isPending)
    return (
      <Screen>
        <PageHeader eyebrow="Your training week" title={heading} />
        <WorkoutSkeleton />
      </Screen>
    );
  if (week.isError || !day)
    return (
      <Screen>
        <PageHeader eyebrow="Your training week" title={heading} />
        <QueryError error={week.error ?? new Error("That day isn't in your plan.")} onRetry={() => week.refetch()} />
      </Screen>
    );
  return <DayDetail day={day} today={week.data.today} autoStart={start === "1"} />;
}

function DayDetail({ day, today, autoStart }: { day: TrainingDayDto; today: string; autoStart: boolean }) {
  const c = useColors();
  const styles = useStyles();
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
      <View style={{ gap: 12 }}>
        <PageHeader eyebrow={`${day.weekday} · ${DAY_LABEL[day.type]}`} title={day.title} />
        <Text variant="bodySm" color={c.ink2}>
          {day.why}
        </Text>
      </View>

      {day.type !== "rest" && (
        <View style={styles.card}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Stat label="Time" value={`${day.minutes} min`} />
            {day.distanceKm != null && <Stat label="Running" value={`~${day.distanceKm} km`} />}
            <Stat label={day.logs.length ? "Burned about" : "Burns about"} value={`${kcalText(day.kcal)} kcal`} />
            {day.distanceKm == null && <Stat label="Effort" value={EFFORT_LABEL[day.effort]} />}
          </View>
        </View>
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
        <View style={[styles.card, { gap: 8 }]}>
          <Text variant="heading3">Done</Text>
          {day.logs.map((l) => (
            <LoggedRow key={l.id} log={l} />
          ))}
        </View>
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
            <Text variant="labelMedium" color={c.ink2} center>
              {day.date > today ? `This session is planned for ${day.weekday}.` : "This day is too long ago to log."}
            </Text>
          )}
        </View>
      )}
      {day.type === "rest" && (
        <Text variant="labelMedium" color={c.ink2} center>
          Rest is part of the plan. Fancy a walk anyway? Log it from a walk day.
        </Text>
      )}

      <LogSheet open={logOpen} onClose={() => setLogOpen(false)} day={day} />
    </Screen>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { padding: 16, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
}));
