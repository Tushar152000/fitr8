import type { CalendarDto } from "@fitr8/contracts";
import { api } from "./api";
import { localYmd } from "./meal-param";

/** GET /api/calendar?month=YYYY-MM: the month sheet on Home / Meals. Refreshed with the day (lib/query refreshDay). */
export const calendarQuery = (month: string) => ({
  queryKey: ["calendar", month],
  queryFn: () => api<CalendarDto>(`/api/calendar?month=${month}`),
});

export type CalendarStatus = CalendarDto["days"][number]["status"];

/** "2026-11" for a YYYY-MM-DD (or today). */
export const monthOf = (ymd: string = localYmd()) => ymd.slice(0, 7);

/** The month `delta` months from "YYYY-MM". */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const TITLE = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

/** "November 2026". */
export function monthTitle(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return TITLE.format(new Date(y, m - 1, 1));
}

/**
 * The month as Mon-first weeks of YYYY-MM-DD (null = padding before the 1st / after the last day),
 * always 6 rows (empty rows at the end) so the sheet keeps its height from month to month.
 */
export function monthWeeks(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= count; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length < 42) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

/** "20 of 22 days logged · 16 on target" (Figma calendar sheet). */
export function calendarSummary(s: CalendarDto["summary"]): string {
  if (s.daysElapsed === 0) return "Nothing to count yet this month";
  return `${s.daysLogged} of ${s.daysElapsed} days logged · ${s.daysOnTarget} on target`;
}
