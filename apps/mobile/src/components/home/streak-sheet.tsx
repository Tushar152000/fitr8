import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { CalendarDays, Check } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { CalendarBody, MonthArrows, RoundButton, useCalendarMonth } from "@/components/calendar/calendar-sheet";
import { QueryError } from "@/components/query-error";
import { Sheet } from "@/components/sheet";
import { PillButton, Skeleton, Text } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { localYmd, viewableDay } from "@/lib/meal-param";
import { useReduceMotion } from "@/lib/motion";
import { atRiskTip, dotState, isPersonalBest, streakAtRisk, streakQuery, streakTip, weekdayLetter } from "@/lib/streak";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { showDay, useViewDay } from "@/lib/view-day";
import { StreakDrop, StreakFlame } from "./streak-flame";

type Mode = "streak" | "calendar";
const OUT_MS = 120;
const IN_MS = 200;
const HEIGHT_MS = 280;

/**
 * Figma "Sheet/Streak" (Home, from the streak pill): the longest streak on the flame drop, this
 * week Mon–Sun, a tip for today and "Log a meal" (today's camera). The calendar button (top right)
 * turns the same sheet into the month calendar (as on Meals): the content fades out, swaps, fades
 * back in while the panel's height glides to the new content; the button becomes a flame that goes
 * back. Reopening starts on the streak.
 */
export function StreakSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReduceMotion();
  const streak = useQuery({ ...streakQuery, enabled: open });
  const s = streak.data;
  // Evening nudge: after 8 pm with nothing logged the fire dies down (still, dimmed).
  const atRisk = s ? streakAtRisk(s) : false;
  const best = s && !atRisk ? isPersonalBest(s) : false;
  const lit = (s?.current ?? 0) > 0 && !atRisk;
  const selected = viewableDay(useViewDay(), undefined, useMe().startedOn) ?? localYmd();
  const [mode, setMode] = useState<Mode>("streak");
  const cal = useCalendarMonth(selected, open && mode === "calendar");
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMode("streak");
      cal.reset();
    }
  }

  // Cross-fade through the swap, and the content box's height (null until first measured).
  const fade = useSharedValue(1);
  const height = useSharedValue(-1);
  useEffect(() => {
    fade.set(withTiming(1, { duration: reduce ? 0 : IN_MS }));
  }, [mode, reduce, fade]);
  const switchTo = (next: Mode) => {
    if (reduce) return setMode(next);
    fade.set(
      withTiming(0, { duration: OUT_MS }, (finished) => {
        if (finished) scheduleOnRN(setMode, next);
      }),
    );
  };
  const box = useAnimatedStyle(() => (height.get() < 0 ? {} : { height: height.get(), overflow: "hidden" }));
  const content = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const measure = (h: number) => {
    if (height.get() < 0 || reduce || !open) height.set(h);
    else height.set(withTiming(h, { duration: HEIGHT_MS, easing: Easing.out(Easing.cubic) }));
  };

  const calendarMode = mode === "calendar";
  // One way in: the calendar button on the streak. The calendar has only its month arrows (user
  // decision 2026-11-27: no flame "back to streak" button there); the sheet's close button leaves.
  const toggle = (
    <RoundButton label="Open the calendar" onPress={() => switchTo("calendar")}>
      <CalendarDays size={20} color={c.ink} strokeWidth={2} />
    </RoundButton>
  );

  return (
    <Sheet open={open} onClose={onClose} figma bare title={calendarMode ? cal.title : "Your streak"}>
      <Animated.View style={box}>
        <Animated.View style={content} onLayout={(e) => measure(e.nativeEvent.layout.height)}>
          {calendarMode ? (
            <View style={{ gap: 18 }}>
              <Header title={cal.title} subtitle={cal.subtitle}>
                <MonthArrows month={cal.month} setMonth={cal.setMonth} />
              </Header>
              <CalendarBody
                month={cal.month}
                cal={cal.cal}
                selected={selected}
                onPick={(ymd) => {
                  showDay(ymd === localYmd() ? null : ymd);
                  onClose();
                }}
              />
            </View>
          ) : (
            <View style={{ gap: 20 }}>
              <Header title="Your streak" subtitle="Log something every day to keep it going">
                {toggle}
              </Header>
              {streak.isError ? (
                <QueryError error={streak.error} onRetry={() => streak.refetch()} />
              ) : !s ? (
                <Skeleton height={128} radius={radius.card} />
              ) : (
                <>
                  <View style={styles.card}>
                    <View style={styles.badge}>
                      <View
                        accessible
                        accessibilityLabel={`Current streak ${s.current} days`}
                        style={atRisk ? { opacity: 0.5 } : undefined}
                      >
                        <StreakDrop lit={lit} best={best}>
                          <View style={styles.value}>
                            <Text variant="stat" color={c.white} tabular style={{ marginBottom: -3, letterSpacing: 0 }}>
                              {s.current}
                            </Text>
                            <Text weight={600} size={10} color={c.white} style={{ letterSpacing: 0.8 }}>
                              DAYS
                            </Text>
                          </View>
                        </StreakDrop>
                      </View>
                      <Text variant="captionStrong" color={c.ink2}>
                        Current streak
                      </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={{ flex: 1, gap: 14 }}>
                      <View style={{ gap: 2 }}>
                        <Text variant="heading2" color={c.brandText}>
                          Best: {s.longest} {s.longest === 1 ? "day" : "days"}
                        </Text>
                        <Text variant="caption" color={c.ink2}>
                          {best
                            ? "You're on your best streak ever"
                            : s.longest > s.current
                              ? `${s.longest - s.current} more to beat it`
                              : "Start today to build it"}
                        </Text>
                      </View>
                      <View style={styles.days}>
                        {s.week.map((d) => (
                          <WeekDot key={d.date} date={d.date} state={d.state} />
                        ))}
                      </View>
                    </View>
                  </View>
                  <View style={[styles.tip, atRisk && { backgroundColor: c.cautionSoft }]}>
                    <View style={atRisk ? { opacity: 0.5 } : undefined}>
                      <StreakFlame lit={lit} best={best} />
                    </View>
                    <Text variant="labelMedium" color={c.ink} style={{ flex: 1, lineHeight: 18 }}>
                      {atRisk ? atRiskTip(s.current) : streakTip(s)}
                    </Text>
                  </View>
                </>
              )}
              <PillButton
                label="Log a meal"
                onPress={() => {
                  onClose();
                  router.push("/log");
                }}
              />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Sheet>
  );
}

/** The sheet's title row (Heading/H1 + Label/Medium subtitle, round buttons on the right). */
function Header({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="heading1" accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="labelMedium" color={c.ink2} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** Figma "Streak Day": Done = olive with a tick, Today = dashed olive ring with a lime dot, else grey. Missed = hollow ring. */
function WeekDot({ date, state }: { date: string; state: string }) {
  const c = useColors();
  const styles = useStyles();
  const kind = dotState(state);
  const label = { logged: "logged", today: "today, not logged yet", missed: "missed", future: "" }[kind];
  return (
    <View style={styles.day} accessible accessibilityLabel={`${date}${label ? `, ${label}` : ""}`}>
      <View
        style={[
          styles.marker,
          kind === "logged" && { backgroundColor: c.brand },
          kind === "today" && styles.today,
          kind === "missed" && styles.missed,
          kind === "future" && { backgroundColor: c.track },
        ]}
      >
        {kind === "logged" && <Check size={12} color={c.white} strokeWidth={2.57} absoluteStrokeWidth />}
        {kind === "today" && <View style={styles.todayDot} />}
      </View>
      <Text
        variant="captionStrong"
        color={kind === "today" ? c.ink : kind === "logged" || kind === "missed" ? c.ink2 : c.ink3}
      >
        {weekdayLetter(date)}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: c.ground,
  },
  badge: { alignItems: "center", gap: 6 },
  value: { position: "absolute", left: 0, right: 0, top: 36, alignItems: "center" },
  divider: { width: 1, height: 96, backgroundColor: c.track },
  days: { flexDirection: "row", gap: 4 },
  day: { alignItems: "center", gap: 6 },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  today: { backgroundColor: c.surface, borderWidth: 2, borderStyle: "dashed", borderColor: c.brand },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.highlight,
    borderWidth: 1.5,
    borderColor: c.brand,
  },
  missed: { borderWidth: 1.5, borderColor: c.lineStrong },
  tip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 14,
    paddingRight: 16,
    paddingVertical: 14,
    borderRadius: radius.box,
    backgroundColor: c.brandSoft,
  },
}));
