import type { ReminderRuleDto } from "@fitr8/contracts";

// Schedule helpers for the reminder sheet. The API has the final say: it validates and re-describes
// the cron.

/** The one shape the sheet edits directly: days of the week + time(s). */
export type WeeklySchedule = NonNullable<ReminderRuleDto["weekly"]>;

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "9:05 am" from a 24-hour hour and a minute. */
export function clock(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

/** The cron the API stores for a weekly schedule. */
export function toCron(s: WeeklySchedule): string {
  const days = s.weekdays.length === 7 ? "*" : s.weekdays.join(",");
  return `${s.minute} ${s.hours.join(",")} * * ${days}`;
}

/** Same wording as the API's summary, for live feedback while editing. */
export function describe(s: WeeklySchedule): string {
  const w = s.weekdays;
  const days =
    w.length === 7
      ? "Every day"
      : w.join() === "1,2,3,4,5"
        ? "Weekdays"
        : w.join() === "0,6"
          ? "Weekends"
          : w.length === 0
            ? "No days picked"
            : w.length === 1
              ? `Every ${DAY_SHORT[w[0]!]}`
              : [...w]
                  .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
                  .map((d) => DAY_SHORT[d])
                  .join(", ");
  const { hours, minute } = s;
  const times = hours.map((h) => clock(h, minute));
  if (times.length === 1) return `${days} at ${times[0]}`;
  const step = hours[1]! - hours[0]!;
  if (hours.length >= 3 && hours.every((h, i) => i === 0 || h - hours[i - 1]! === step)) {
    return `${days}, ${step === 1 ? "every hour" : `every ${step} hours`} from ${times[0]} to ${times.at(-1)}`;
  }
  return `${days} at ${times.slice(0, -1).join(", ")} and ${times.at(-1)}`;
}

/** When a reminder rings next: "today, 9:00 am", "tomorrow, …", a weekday, or a short date. */
export function formatNext(d: Date): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const time = clock(d.getHours(), d.getMinutes());
  if (d.toDateString() === now.toDateString()) return `today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow, ${time}`;
  const inAWeek = d.getTime() - now.getTime() < 6 * 86_400_000;
  const day = new Intl.DateTimeFormat(
    "en-IN",
    inAWeek ? { weekday: "long" } : { weekday: "short", day: "numeric", month: "short" },
  ).format(d);
  return `${day}, ${time}`;
}
