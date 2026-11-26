import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { MEAL_TYPES, mealTypeForHour, type MealType } from "./format";

/**
 * How many days back a forgotten meal can be logged. Same rule as the API
 * (`@fitr8/domain/dates` MEAL_BACKFILL_DAYS); the server has the final say.
 */
export const MEAL_BACKFILL_DAYS = 7;

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-16" for a device-local date. */
export function localYmd(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today first, then each earlier day the API still accepts. */
export function recentDays(now = new Date()): string[] {
  return Array.from({ length: MEAL_BACKFILL_DAYS + 1 }, (_, i) =>
    localYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)),
  );
}

const ymdRe = /^\d{4}-\d{2}-\d{2}$/;

/** Whole days from `ymd` back to today (0 = today, negative = future). Local calendar days. */
export function daysAgo(ymd: string, now = new Date()): number {
  const [y, m, d] = ymd.split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

/**
 * A past day Home / Meals can show (any day before today, e.g. picked in the calendar, but not
 * before `startedOn`, the user's first day: `/me` `startedOn`), or null = today. Unlike
 * `dayFromParam` this isn't limited to the logging window: older days are read-only.
 */
export function viewableDay(value: string | null | undefined, now = new Date(), startedOn?: string): string | null {
  if (!value || !ymdRe.test(value)) return null;
  if (startedOn && value < startedOn) return null;
  return daysAgo(value, now) > 0 ? value : null;
}

/**
 * The days the Home / Meals pager steps through, today first: the logging window (a week back),
 * stretched back to `viewDay` when the calendar jumped further, and never before `startedOn` (the
 * user's first day in the app, user decision 2026-11-26).
 */
export function pagerDays(viewDay: string | null, now = new Date(), startedOn?: string): string[] {
  let back = Math.max(MEAL_BACKFILL_DAYS, viewDay ? daysAgo(viewDay, now) : 0);
  if (startedOn && ymdRe.test(startedOn)) back = Math.min(back, Math.max(0, daysAgo(startedOn, now)));
  return Array.from({ length: back + 1 }, (_, i) =>
    localYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)),
  );
}

/** Meals can still be added to this day (today or up to MEAL_BACKFILL_DAYS back; the API's rule). */
export function canLogOn(ymd: string, now = new Date()): boolean {
  const back = daysAgo(ymd, now);
  return back >= 0 && back <= MEAL_BACKFILL_DAYS;
}

/** "Today", "Yesterday", else "Sat 15 Nov". Long form adds the weekday in full. */
export function dayLabel(ymd: string, now = new Date()): string {
  const [today, yesterday] = recentDays(now);
  if (ymd === today) return "Today";
  if (ymd === yesterday) return "Yesterday";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(y, m - 1, d),
  );
}

/** `?meal=DINNER` from a route, or null when the user hasn't chosen one yet. */
export function mealFromParam(value: string | string[] | undefined): MealType | null {
  const v = typeof value === "string" ? value.toUpperCase() : "";
  return MEAL_TYPES.includes(v as MealType) ? (v as MealType) : null;
}

/** `?date=YYYY-MM-DD` when it is a past day still in the window; null means today. */
export function dayFromParam(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") return null;
  const days = recentDays();
  return days.includes(value) && value !== days[0] ? value : null;
}

/** Route params that carry the choice to the next log screen. */
export function choiceParams(mealType: MealType | null, date: string | null): { meal?: string; date?: string } {
  return { ...(mealType ? { meal: mealType } : {}), ...(date ? { date } : {}) };
}

/**
 * Which meal and which day the user is logging. The meal is the one the route asked for ("Add lunch"
 * on Today), else the slot for the time of day, so logging never stops to ask; the user can change
 * it here or later on the meal. `mealChosen` says whether it came from the user or the route (a
 * relogged usual keeps its own slot unless one was chosen). The day is never asked: it is the day
 * the user was on in Today (`?date=` for a past day, else today).
 */
export function useMealChoice() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const fromRoute = mealFromParam(params.meal);
  const [mealChosen, setMealChosen] = useState(fromRoute != null);
  const [mealType, setMealTypeState] = useState<MealType>(() => fromRoute ?? mealTypeForHour(new Date().getHours()));
  const [date] = useState<string | null>(() => dayFromParam(params.date));

  // Keep the route in step, so switching Type / Photo / Barcode keeps the choice.
  const setMealType = (m: MealType) => {
    setMealTypeState(m);
    setMealChosen(true);
    router.setParams({ meal: m });
  };

  return {
    mealType,
    mealChosen,
    setMealType,
    date,
    /** Spread into an API body: `{ date }` for a past day, nothing for today. */
    dateBody: date ? { date } : {},
    /** Carries the meal on only once chosen, so the next screen can still use its own default. */
    params: choiceParams(mealChosen ? mealType : null, date),
  };
}
