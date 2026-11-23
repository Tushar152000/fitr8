import type { TrainingDayDto, TrainingWeekDto } from "@fitr8/contracts";
import { router } from "expo-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  HeartPulse,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button, Card, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { dayColors, DAY_LABEL, EFFORT_LABEL, GOAL_LABEL, kcalText, weekdayLetter, weekOf } from "@/lib/training";
import { makeStyles, radius, useColors } from "@/lib/theme";

const DAY_MS = 86_400_000;
const shiftWeek = (start: string, weeks: number) =>
  new Date(Date.parse(`${start}T00:00:00Z`) + weeks * 7 * DAY_MS).toISOString().slice(0, 10);

/** 16c: the week. Summary, a 7-day strip, the selected day and one line from the coach. */
export function TrainingWeekView({
  week,
  onWeek,
}: {
  week: TrainingWeekDto;
  /** Open another week (null = this week). */
  onWeek: (start: string | null) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const inWeek = week.days.some((d) => d.date === week.today);
  const [selected, setSelected] = useState(() => (inWeek ? week.today : week.days[0]!.date));
  const day = week.days.find((d) => d.date === selected) ?? week.days[0]!;
  const thisWeek = inWeek;
  const isNext = week.start > week.today;

  function pick(d: TrainingDayDto) {
    setSelected(d.date);
    track("training_day_opened", { type: d.type, weekday: d.weekday });
  }

  return (
    <>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="meta" style={{ flex: 1 }} tabular>
            Week of {weekOf(week.start)} · {GOAL_LABEL[week.goal]}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change your training setup"
            onPress={() => router.push("/training/setup")}
            hitSlop={8}
            style={styles.iconButton}
          >
            <SlidersHorizontal size={20} color={c.ink2} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text variant="h1" style={{ flex: 1 }}>
            {thisWeek ? "Your week" : isNext ? "Next week" : "Past week"}
          </Text>
          <View style={styles.premium}>
            <Crown size={12} color={c.brandText} />
            <Text size={12} weight={700} color={c.brandText}>
              Premium
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.weekNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => onWeek(shiftWeek(week.start, -1))}
          style={styles.iconButton}
        >
          <ChevronLeft size={22} color={c.ink2} />
        </Pressable>
        <Pressable accessibilityRole="button" disabled={thisWeek} onPress={() => onWeek(null)} style={{ flex: 1 }}>
          <Text size={13} weight={600} color={thisWeek ? c.ink3 : c.brandText} center>
            {thisWeek ? "This week" : "Back to this week"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          disabled={isNext}
          onPress={() => onWeek(shiftWeek(week.start, 1))}
          style={[styles.iconButton, isNext && { opacity: 0.3 }]}
        >
          <ChevronRight size={22} color={c.ink2} />
        </Pressable>
      </View>

      {week.recovery?.advice && (
        <View style={styles.recovery}>
          <HeartPulse size={18} color={c.cautionText} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text weight={700} size={14} color={c.cautionText}>
              Recovery {week.recovery.score}/100
            </Text>
            <Text size={13} color={c.ink2}>
              {week.recovery.advice}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.stats}>
        <Stat label="Sessions" value={`${week.sessions} + rest`} />
        <Stat label="Burn this week" value={`${kcalText(week.totalKcal)} kcal`} />
        <Stat label="≈ extra fat" value={`${week.fatKg.toFixed(2)} kg`} />
      </View>

      <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="tablist">
        {week.days.map((d) => {
          const col = dayColors(c, d.type);
          const on = d.date === day.date;
          return (
            <Pressable
              key={d.date}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${d.weekday}: ${DAY_LABEL[d.type]}, ${d.title}${d.status === "done" ? ", done" : d.status === "missed" ? ", missed" : ""}`}
              onPress={() => pick(d)}
              style={[styles.day, on && { backgroundColor: col.soft, borderColor: col.fg }]}
            >
              <Text weight={700} size={12} color={d.date === week.today ? c.brandText : c.ink2}>
                {weekdayLetter(d.date)}
              </Text>
              {d.status === "done" ? (
                <View style={[styles.doneDot, { backgroundColor: col.fg }]}>
                  <Check size={10} color={c.surface} strokeWidth={3.5} />
                </View>
              ) : (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: d.status === "missed" ? "transparent" : col.fg, borderColor: col.fg },
                  ]}
                />
              )}
              <Text size={9} weight={700} color={col.fg} numberOfLines={1}>
                {DAY_LABEL[d.type]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DayCard day={day} today={week.today} />

      <Card>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <MessageCircle size={18} color={c.brandText} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text weight={700} size={14}>
              Why this week looks like this
            </Text>
            <Text size={14} color={c.ink2}>
              {week.coachNote}
            </Text>
          </View>
        </View>
      </Card>
      <Text size={12} color={c.ink3} center>
        Calories burned are estimates. Your food target already counts your training, so don&apos;t eat them back.
      </Text>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text size={12} weight={600} color={c.ink3}>
        {label}
      </Text>
      <Text weight={700} size={16} tabular>
        {value}
      </Text>
    </View>
  );
}

/** The selected day: what, why, how long, and the one action for its type. */
function DayCard({ day, today }: { day: TrainingDayDto; today: string }) {
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
        <View style={styles.stats}>
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

      {day.steps.length > 0 && (
        <View style={{ borderRadius: radius.input, backgroundColor: c.sunken }}>
          {day.steps.map((s, i) => (
            <View key={`${s.name}-${i}`} style={[styles.step, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
              <Text weight={600} size={14} style={{ flex: 1 }}>
                {s.name}
              </Text>
              <Text size={13} color={c.ink3} tabular style={{ flexShrink: 1, textAlign: "right" }}>
                {s.detail}
              </Text>
            </View>
          ))}
        </View>
      )}

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

const useStyles = makeStyles((c) => ({
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  premium: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.premiumLine,
    backgroundColor: c.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weekNav: { flexDirection: "row", alignItems: "center", marginVertical: -12 },
  recovery: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: c.cautionSoft,
  },
  stats: { flexDirection: "row", gap: 12 },
  day: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  doneDot: { width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  step: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
}));
