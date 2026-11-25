/**
 * Calendar-date labels for API dates (YYYY-MM-DD). They are calendar days, not instants, so they are
 * read and formatted in UTC: the label never shifts by a day with the phone's time zone. Formatters
 * are built once per option set (Intl.DateTimeFormat is costly to construct, and lists render many).
 */
const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" });
    cache.set(key, f);
  }
  return f;
}

/** Midnight UTC of a YYYY-MM-DD, in ms. A full ISO timestamp (some DTO dates are one) is read as is. */
export const ymdTime = (date: string) => Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date);

/** Any label for a YYYY-MM-DD (or a UTC-midnight timestamp). */
export const formatYmd = (date: string | number, opts: Intl.DateTimeFormatOptions) =>
  formatter(opts).format(typeof date === "number" ? date : ymdTime(date));

/** "23 Nov 2026". */
export const longDate = (date: string | number) => formatYmd(date, { day: "numeric", month: "short", year: "numeric" });
/** "23 Nov". */
export const shortDate = (date: string | number) => formatYmd(date, { day: "numeric", month: "short" });
/** "Monday" (long) or "M" (narrow). */
export const weekdayName = (date: string | number, style: "long" | "short" | "narrow" = "long") =>
  formatYmd(date, { weekday: style });
