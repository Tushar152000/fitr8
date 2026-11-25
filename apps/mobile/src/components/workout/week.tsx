import type { TrainingDayDto, TrainingWeekDto } from "@fitr8/contracts";
import { router } from "expo-router";
import { SlidersHorizontal } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { IconButton, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { trainingWeekQuery } from "@/lib/queries";
import { dayEyebrow, dayTitle } from "@/lib/training-copy";
import { useColors } from "@/lib/theme";
import { DayHero } from "./day-hero";
import { TrainingStrip } from "./training-strip";
import { SessionList } from "./session-list";
import { WeekSummary } from "./week-summary";

const DAY_MS = 86_400_000;
const shiftDays = (ymd: string, days: number) =>
  new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
/** The Monday of a YYYY-MM-DD's week. */
const mondayOf = (ymd: string) => shiftDays(ymd, -((new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7));

/**
 * 16c in the Figma look ("Workout – Recover today"): eyebrow + title for the selected day with the
 * setup button, the M–S strip, the day's dark card, "Up next" with its list, then the week (arrows,
 * stats), recovery score and the coach's note.
 */
export function TrainingWeekView({
  week,
  onWeek,
}: {
  week: TrainingWeekDto;
  /** Open another week (null = this week). */
  onWeek: (start: string | null) => void;
}) {
  const c = useColors();
  const inWeek = week.days.some((d) => d.date === week.today);
  const [selected, setSelected] = useState(() => (inWeek ? week.today : week.days[0]!.date));
  const day = week.days.find((d) => d.date === selected) ?? week.days[0]!;
  const isToday = day.date === week.today;
  const hasGym = week.days.some((d) => d.type === "gym");
  const inThisWeek = week.days.find((d) => d.date > day.date && d.type !== "rest");
  // After the week's last session, look into the following week (the API serves up to one week
  // ahead, so not from next week's view). Same query as the week arrows: cached either way.
  const following = shiftDays(week.start, 7);
  const lookAhead = !inThisWeek && following <= shiftDays(mondayOf(week.today), 7);
  const nextWeek = useQuery({ ...trainingWeekQuery(following), enabled: lookAhead });
  const fromNextWeek = lookAhead ? nextWeek.data?.days.find((d) => d.type !== "rest") : undefined;
  const next = inThisWeek ?? fromNextWeek;

  function pick(d: TrainingDayDto) {
    setSelected(d.date);
    track("training_day_opened", { type: d.type, weekday: d.weekday });
  }

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="labelStrong" color={c.ink2} numberOfLines={1}>
            {dayEyebrow(day, isToday, week.plan)}
          </Text>
          <Text variant="title" accessibilityRole="header" numberOfLines={2}>
            {dayTitle(day, isToday)}
          </Text>
        </View>
        <IconButton
          label="Change your training setup"
          onPress={() => router.push("/training/setup")}
          icon={<SlidersHorizontal size={20} color={c.ink} strokeWidth={2} absoluteStrokeWidth />}
        />
      </View>

      <TrainingStrip days={week.days} today={week.today} selected={day.date} onSelect={pick} />

      <DayHero day={day} today={week.today} restDay={week.restDay} />

      {day.type === "gym" && day.exercises?.length ? (
        <SessionList day={day} eyebrow={`${isToday ? "Today" : day.weekday} · ${day.exercises.length} exercises`} />
      ) : null}

      {next && (
        <SessionList
          day={next}
          eyebrow={`Up next · ${next === fromNextWeek ? `Next ${next.weekday}` : next.weekday}`}
          briefing={hasGym}
        />
      )}

      <WeekSummary week={week} onWeek={onWeek} />
    </>
  );
}
