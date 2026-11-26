import { useSyncExternalStore } from "react";

/**
 * The day Home and Meals are showing: null = today, else a past YYYY-MM-DD (a week back by swipe,
 * any earlier day from the calendar; read it through `viewableDay`). Shared so that saving a
 * forgotten meal (on any log screen) lands the user on that day, where the meal now shows.
 */
let viewDay: string | null = null;
const listeners = new Set<() => void>();

export function showDay(ymd: string | null) {
  if (ymd === viewDay) return;
  viewDay = ymd;
  listeners.forEach((l) => l());
}

/** The viewed day outside React (stable callbacks such as the day pager's). */
export function currentViewDay(): string | null {
  return viewDay;
}

export function useViewDay(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => viewDay,
  );
}
