import { describe, expect, it } from "vitest";
import {
  currentStreak,
  dayTargetStatus,
  isMonth,
  isOverTarget,
  longestStreak,
  monthCalendar,
  monthDays,
  onTargetShare,
  OVER_TARGET_TOLERANCE,
  trackingStart,
  streakDetails,
  streakWeek,
  weeklyWeighIns,
} from "./progress.js";

// 2026-11-26 is a Thursday; its week runs Mon 23 – Sun 29 Nov.
const TODAY = "2026-11-26";

describe("currentStreak", () => {
  it("counts back from today when today is logged", () => {
    expect(currentStreak(new Set(["2026-11-24", "2026-11-25", TODAY]), TODAY)).toBe(3);
  });

  it("counts back from yesterday before today is logged", () => {
    expect(currentStreak(new Set(["2026-11-24", "2026-11-25"]), TODAY)).toBe(2);
  });

  it("is 0 when neither today nor yesterday is logged", () => {
    expect(currentStreak(new Set(["2026-11-24"]), TODAY)).toBe(0);
    expect(currentStreak(new Set(), TODAY)).toBe(0);
  });

  it("stops at the first gap and crosses month ends", () => {
    const days = new Set(["2026-10-29", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(currentStreak(days, "2026-11-02")).toBe(3);
  });
});

describe("longestStreak", () => {
  it("finds the longest run anywhere, ignoring order and duplicates", () => {
    const days = [
      "2026-11-05",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-02",
      "2026-11-10",
    ];
    expect(longestStreak(days)).toBe(3);
  });

  it("is 0 with no days and 1 with one", () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(["2026-11-01"])).toBe(1);
  });
});

describe("streakWeek", () => {
  it("marks Mon–Sun as logged, missed, today (not logged yet) and future", () => {
    const week = streakWeek(new Set(["2026-11-23", "2026-11-25"]), TODAY, "2026-11-01");
    expect(week).toEqual([
      { date: "2026-11-23", state: "logged" },
      { date: "2026-11-24", state: "missed" },
      { date: "2026-11-25", state: "logged" },
      { date: "2026-11-26", state: "today" },
      { date: "2026-11-27", state: "future" },
      { date: "2026-11-28", state: "future" },
      { date: "2026-11-29", state: "future" },
    ]);
  });

  it("shows a logged today as logged, and a Sunday as the week's last day", () => {
    expect(streakWeek(new Set([TODAY]), TODAY)[3]).toEqual({ date: TODAY, state: "logged" });
    const sunday = streakWeek(new Set(), "2026-11-29");
    expect(sunday[0].date).toBe("2026-11-23");
    expect(sunday[6]).toEqual({ date: "2026-11-29", state: "today" });
  });
});

describe("streakDetails", () => {
  it("returns current, longest, loggedToday and the week", () => {
    const days = [
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-24",
      "2026-11-25",
    ];
    const d = streakDetails(days, TODAY);
    expect(d).toMatchObject({ current: 2, longest: 4, loggedToday: false });
    expect(d.week).toHaveLength(7);
  });

  it("never reports a best streak shorter than the current one", () => {
    expect(streakDetails([], TODAY)).toMatchObject({ current: 0, longest: 0 });
    expect(streakDetails(["2026-11-25", TODAY], TODAY)).toMatchObject({
      current: 2,
      longest: 2,
      loggedToday: true,
    });
  });
});

describe("weeklyWeighIns", () => {
  it("takes each Mon–Sun week's latest weigh-in, oldest week first", () => {
    const weeks = weeklyWeighIns(
      [
        { date: "2026-11-09", weightKg: 75.6 },
        { date: "2026-11-12", weightKg: 75.4 },
        { date: "2026-11-16", weightKg: 75.2 },
        { date: "2026-11-23", weightKg: 75.0 },
        { date: "2026-10-01", weightKg: 80 }, // outside the window
      ],
      TODAY,
      3,
    );
    expect(weeks).toEqual([
      { weekStart: "2026-11-09", weeksAgo: 2, date: "2026-11-12", weightKg: 75.4 },
      { weekStart: "2026-11-16", weeksAgo: 1, date: "2026-11-16", weightKg: 75.2 },
      { weekStart: "2026-11-23", weeksAgo: 0, date: "2026-11-23", weightKg: 75.0 },
    ]);
  });

  it("defaults to 8 weeks, null for weeks without a weigh-in, and ignores future dates", () => {
    const weeks = weeklyWeighIns([{ date: "2026-11-28", weightKg: 70 }], TODAY);
    expect(weeks).toHaveLength(8);
    expect(weeks[0].weekStart).toBe("2026-10-05");
    expect(weeks.every((w) => w.weightKg === null && w.date === null)).toBe(true);
  });
});

describe("streakWeek before the user started", () => {
  it("marks unlogged past days before the start as before, not missed", () => {
    const week = streakWeek(new Set(["2026-11-25"]), TODAY, "2026-11-25");
    expect(week.slice(0, 4).map((d) => d.state)).toEqual(["before", "before", "logged", "today"]);
    // Start date on a later day of the week.
    expect(
      streakWeek(new Set(), TODAY, "2026-11-24")
        .slice(0, 3)
        .map((d) => d.state),
    ).toEqual(["before", "missed", "missed"]);
    // Never started: every past day is before.
    expect(
      streakWeek(new Set(), TODAY)
        .slice(0, 3)
        .every((d) => d.state === "before"),
    ).toBe(true);
    expect(streakDetails([], TODAY, null).week[0].state).toBe("before");
  });
});

describe("trackingStart", () => {
  it("is the earlier of the first plan and the first meal", () => {
    expect(trackingStart("2026-11-10", "2026-11-05")).toBe("2026-11-05");
    expect(trackingStart("2026-11-03", "2026-11-05")).toBe("2026-11-03");
    expect(trackingStart(null, "2026-11-05")).toBe("2026-11-05");
    expect(trackingStart("2026-11-03", null)).toBe("2026-11-03");
    expect(trackingStart(null, null)).toBeNull();
  });
});

describe("calorie target per day", () => {
  it("is over only above target × 1.05; under and within count as on target", () => {
    expect(OVER_TARGET_TOLERANCE).toBe(0.05);
    expect(isOverTarget(2100, 2000)).toBe(false); // exactly +5%
    expect(isOverTarget(2101, 2000)).toBe(true);
    expect(isOverTarget(900, 2000)).toBe(false);
    expect(isOverTarget(5000, null)).toBe(false); // no plan
    expect(dayTargetStatus(2101, 2000)).toBe("over_target");
    expect(dayTargetStatus(1200, 2000)).toBe("on_target");
  });

  it("shares on-target days among logged days", () => {
    expect(
      onTargetShare([
        { kcal: 1900, target: 2000 },
        { kcal: 2500, target: 2000 },
        { kcal: 2000, target: 2000 },
      ]),
    ).toEqual({ days: 2, logged: 3, pct: 67 });
    expect(onTargetShare([])).toEqual({ days: 0, logged: 0, pct: null });
  });
});

describe("monthCalendar", () => {
  it("validates and lists a month's days, leap years included", () => {
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-1")).toBe(false);
    expect(monthDays("2026-11")).toHaveLength(30);
    expect(monthDays("2028-02").at(-1)).toBe("2028-02-29");
    expect(monthDays("2026-02")).toHaveLength(28);
  });

  it("marks on/over/missed/none and counts past days only", () => {
    const eaten = new Map([
      ["2026-11-03", { kcal: 1800, target: 2000 }],
      ["2026-11-04", { kcal: 2300, target: 2000 }],
      ["2026-11-10", { kcal: 2050, target: 2000 }],
    ]);
    const cal = monthCalendar({
      month: "2026-11",
      today: "2026-11-10",
      startDate: "2026-11-03",
      eaten,
    });
    const status = Object.fromEntries(cal.days.map((d) => [d.date, d.status]));
    expect(cal.days).toHaveLength(30);
    expect(status["2026-11-02"]).toBe("none"); // before the start
    expect(status["2026-11-03"]).toBe("on_target");
    expect(status["2026-11-04"]).toBe("over_target");
    expect(status["2026-11-05"]).toBe("missed");
    expect(status["2026-11-10"]).toBe("on_target"); // today, logged
    expect(status["2026-11-11"]).toBe("none"); // future
    // Past days 3–9 = 7 elapsed; 2 logged; 1 on target. Today is not counted.
    expect(cal.summary).toEqual({ daysElapsed: 7, daysLogged: 2, daysOnTarget: 1 });
  });

  it("shows today as none until something is logged, and nothing before any start", () => {
    const today = monthCalendar({
      month: "2026-11",
      today: "2026-11-10",
      startDate: "2026-11-01",
      eaten: new Map(),
    });
    expect(today.days[9]).toEqual({ date: "2026-11-10", status: "none" });
    expect(today.summary).toEqual({ daysElapsed: 9, daysLogged: 0, daysOnTarget: 0 });
    const never = monthCalendar({
      month: "2026-11",
      today: "2026-11-10",
      startDate: null,
      eaten: new Map(),
    });
    expect(never.days.every((d) => d.status === "none")).toBe(true);
    expect(never.summary.daysElapsed).toBe(0);
  });

  it("is all past for an earlier month and all none for a later one", () => {
    const oct = monthCalendar({
      month: "2026-10",
      today: "2026-11-10",
      startDate: "2026-10-01",
      eaten: new Map(),
    });
    expect(oct.summary.daysElapsed).toBe(31);
    expect(oct.days.every((d) => d.status === "missed")).toBe(true);
    const dec = monthCalendar({
      month: "2026-12",
      today: "2026-11-10",
      startDate: "2026-10-01",
      eaten: new Map(),
    });
    expect(dec.days.every((d) => d.status === "none")).toBe(true);
  });
});
