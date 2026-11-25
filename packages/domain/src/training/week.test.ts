import { describe, expect, it } from "vitest";
import {
  buildTrainingWeek,
  buildWeek,
  caloriePhase,
  restDayCardio,
  burnKcal,
  easyPace,
  fatKgFromKcal,
  formatPace,
  MET,
  scheduleKey,
  trainingPlanName,
  TRAINING_TYPES,
  weekProblems,
  weekStyle,
  weekdayName,
  type Experience,
  type TrainingType,
  type TrainingWeekInput,
} from "./index.js";

const monday = new Date("2026-11-23T00:00:00Z");

const base: TrainingWeekInput = {
  weekStart: monday,
  types: ["gym", "run", "yoga"],
  daysPerWeek: 5,
  sessionMinutes: 45,
  goal: "lose",
  deficit: false,
  weightKg: 80.6,
  experience: "INTERMEDIATE",
  restricted: false,
};

/** Every non-empty combination of the six training types. */
const ALL_TYPE_SETS: TrainingType[][] = [];
for (let mask = 1; mask < 1 << TRAINING_TYPES.length; mask++)
  ALL_TYPE_SETS.push(TRAINING_TYPES.filter((_, i) => mask & (1 << i)));

describe("burnKcal (spec 'Calories burned' table, 80.6 kg)", () => {
  it.each([
    ["strength 45 min", MET.strength, 45, 300],
    ["easy run 30 min", MET.easy_run, 30, 335],
    ["intervals 30 min", MET.intervals, 30, 405],
    ["long easy run 50 min", MET.long_run, 50, 555],
    ["slow yoga 30 min", MET.slow_yoga, 30, 100],
    ["power yoga 45 min", MET.power_yoga, 45, 240],
    ["brisk walk 30 min", MET.brisk_walk, 30, 175],
    ["mobility 20 min", MET.mobility, 20, 65],
  ])("%s → ~%i kcal", (_, met, minutes, kcal) => {
    expect(burnKcal(met, 80.6, minutes)).toBe(kcal);
  });
  it("is 0 for rest or missing inputs", () => {
    expect(burnKcal(0, 80, 30)).toBe(0);
    expect(burnKcal(5, 0, 30)).toBe(0);
    expect(burnKcal(5, 80, 0)).toBe(0);
    expect(burnKcal(Number.NaN, 80, 30)).toBe(0);
  });
  it("turns a week's burn into kg of fat to 2 dp", () => {
    expect(fatKgFromKcal(1540)).toBe(0.2);
    expect(fatKgFromKcal(1925)).toBe(0.25);
    expect(fatKgFromKcal(0)).toBe(0);
  });
});

describe("weekStyle", () => {
  it.each([
    [["gym", "run", "yoga"], "mix"],
    [["gym", "yoga"], "mix"],
    [["home", "cycle"], "mix"],
    [["gym"], "strength"],
    [["gym", "walk"], "strength"],
    [["home"], "strength"],
    [["run"], "cardio"],
    [["cycle", "yoga"], "cardio"],
    [["yoga", "walk"], "yoga"],
    [["walk"], "walk"],
  ] as [TrainingType[], string][])("%j → %s", (types, style) => {
    expect(weekStyle(types)).toBe(style);
  });
});

describe("buildTrainingWeek: the spec's templates", () => {
  const titles = (input: Partial<TrainingWeekInput>) =>
    buildTrainingWeek({ ...base, ...input }).days.map((d) => d.title);

  it("mix (gym + run + yoga)", () => {
    expect(titles({ daysPerWeek: 5 })).toEqual([
      "Upper body A",
      "Easy run",
      "Yoga flow",
      "Lower body A",
      "Brisk walk",
      "Intervals",
      "Rest",
    ]);
  });
  it("gym", () => {
    expect(titles({ types: ["gym"], daysPerWeek: 4 })).toEqual([
      "Upper body A",
      "Lower body A",
      "Brisk walk",
      "Upper body B",
      "Lower body B",
      "Long walk",
      "Rest",
    ]);
  });
  it("running", () => {
    expect(titles({ types: ["run"], daysPerWeek: 4 })).toEqual([
      "Easy run",
      "Brisk walk",
      "Intervals",
      "Rest",
      "Easy run",
      "Long run",
      "Rest",
    ]);
  });
  it("yoga", () => {
    expect(titles({ types: ["yoga"], daysPerWeek: 5 })).toEqual([
      "Yoga flow",
      "Power yoga",
      "Brisk walk",
      "Slow yoga",
      "Power yoga",
      "Mobility",
      "Rest",
    ]);
  });
  it("3 days a week is full body A/B plus walks", () => {
    expect(titles({ types: ["gym"], daysPerWeek: 3 })).toEqual([
      "Full body A",
      "Brisk walk",
      "Full body B",
      "Rest",
      "Full body A",
      "Long walk",
      "Rest",
    ]);
  });
});

describe("buildTrainingWeek: rules hold for every combination", () => {
  const experiences: Experience[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
  const cases: TrainingWeekInput[] = [];
  for (const types of ALL_TYPE_SETS)
    for (const daysPerWeek of [3, 4, 5, 6])
      for (const sessionMinutes of [30, 45, 60])
        for (const experience of experiences)
          for (const restricted of [false, true])
            for (const deficit of [false, true])
              cases.push({
                ...base,
                types,
                daysPerWeek,
                sessionMinutes,
                experience,
                restricted,
                deficit,
              });

  it(`checks ${cases.length} weeks`, () => {
    const failures: string[] = [];
    const dates = [
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ];
    for (const input of cases) {
      const week = buildTrainingWeek(input);
      const fail = (what: string) =>
        failures.push(`${what}: ${JSON.stringify({ ...input, weekStart: undefined })}`);
      if (week.days.length !== 7) fail("not 7 days");
      for (const p of weekProblems(week.days)) fail(p);
      if (week.sessions !== input.daysPerWeek) fail(`sessions ${week.sessions}`);
      if (week.days.some((d, i) => d.date !== dates[i])) fail("dates");
      if (week.totalKcal !== week.days.reduce((s, d) => s + d.kcal, 0)) fail("total kcal");
      for (const d of week.days) {
        if (d.type === "rest") {
          if (d.minutes !== 0 || d.kcal !== 0) fail("rest with minutes");
        } else {
          if (!(d.minutes > 0)) fail(`no minutes on ${d.title}`);
          if (d.kcal % 5 !== 0) fail("kcal not rounded to 5");
          if (d.steps.length !== 0 && (d.steps.length < 2 || d.steps.length > 4))
            fail(`steps on ${d.title}`);
        }
        if (d.type === "gym") {
          if (!d.template || d.blocks.length) fail("gym day shape");
        } else if (d.type !== "rest" && d.blocks.reduce((t, b) => t + b.minutes, 0) !== d.minutes)
          fail(`blocks don't add up on ${d.title}`);
      }
      // Beginners and restricted users: no intervals. Restricted: full body only + a note.
      if (
        (input.experience === "BEGINNER" || input.restricted) &&
        week.days.some((d) => d.type === "hiit")
      )
        fail("intervals for a beginner");
      if (input.restricted) {
        if (week.days.some((d) => d.template && !d.template.startsWith("full")))
          fail("split for restricted");
        if (!/check with a professional/.test(week.coachNote)) fail("no professional note");
      }
      // Only what the user picked (plus walks and mobility as active rest).
      const picked = new Set(input.types);
      for (const d of week.days) {
        if (d.type === "gym" && !picked.has("gym") && !picked.has("home")) fail("gym not picked");
        if (d.type === "run" && !picked.has("run")) fail("run not picked");
        if (d.type === "cycle" && !picked.has("cycle")) fail("cycle not picked");
        if (d.type === "yoga" && d.title !== "Mobility" && !picked.has("yoga"))
          fail("yoga not picked");
      }
      const schedule = week.days.flatMap((d, i) =>
        d.template ? [{ weekday: i, template: d.template }] : [],
      );
      if (JSON.stringify(schedule) !== JSON.stringify(week.schedule)) fail("schedule");
    }
    expect(failures.slice(0, 20)).toEqual([]);
  });

  it("keeps ~80% of running time easy in a running week", () => {
    const week = buildTrainingWeek({ ...base, types: ["run"], daysPerWeek: 5 });
    const runs = week.days.filter((d) => d.type === "run" || d.type === "hiit");
    const total = runs.reduce((t, d) => t + d.minutes, 0);
    const hard = runs
      .flatMap((d) => d.blocks)
      .filter((b) => b.intensity === "hard")
      .reduce((t, b) => t + b.minutes, 0);
    expect(hard / total).toBeLessThanOrEqual(0.2);
  });
});

describe("buildTrainingWeek: details", () => {
  it("runs and rides alternate when both are picked", () => {
    const week = buildTrainingWeek({ ...base, types: ["run", "cycle"], daysPerWeek: 4 });
    expect(week.days.map((d) => d.type)).toEqual([
      "run",
      "walk",
      "hiit",
      "rest",
      "run",
      "cycle",
      "rest",
    ]);
    expect(week.days[2].title).toBe("Ride intervals");
    expect(week.days[5].title).toBe("Long ride");
  });
  it("gives beginners walk/run intervals instead of runs", () => {
    const week = buildTrainingWeek({
      ...base,
      types: ["run"],
      daysPerWeek: 4,
      experience: "BEGINNER",
    });
    expect(week.days[0].title).toBe("Easy walk/run");
    expect(week.days[0].pace).toBeNull();
    expect(week.days[0].steps[1].name).toBe("Run 1 min, walk 2 min");
    expect(week.days[2].type).toBe("run"); // intervals → easy
  });
  it("shows distance and pace on an easy run (spec 16d: 20 min easy ≈ 2.9 km)", () => {
    const run = buildTrainingWeek({ ...base, types: ["run"], daysPerWeek: 4 }).days[0];
    expect(run.minutes).toBe(30);
    expect(run.kcal).toBe(335);
    expect(run.pace).toBe("6:45–7:15/km");
    expect(run.distanceKm).toBe(2.9);
    expect(run.blocks.map((b) => [b.label, b.minutes])).toEqual([
      ["Warm-up walk", 5],
      ["Easy run", 20],
      ["Cool-down walk", 5],
    ]);
    expect(run.tips).toHaveLength(3);
  });
  it("explains an easy run after a strength day", () => {
    const week = buildTrainingWeek(base);
    expect(week.days[1].why).toBe(
      "Yesterday was upper body, so today stays easy. Run at a pace where you can still talk in full sentences.",
    );
  });
  it("trains at home without equipment when only home is picked", () => {
    const day = buildTrainingWeek({ ...base, types: ["home"], daysPerWeek: 4 }).days[0];
    expect(day.home).toBe(true);
    expect(day.met).toBe(MET.home_strength);
    expect(day.why).toMatch(/No equipment needed/);
  });
  it("swaps yoga for mobility when yoga wasn't picked", () => {
    const week = buildTrainingWeek({ ...base, types: ["gym"], daysPerWeek: 5 });
    expect(week.days[2].title).toBe("Mobility");
    expect(week.days[2].session).toBe(true);
  });
  it("counts walks as sessions only in a walking week", () => {
    expect(buildTrainingWeek({ ...base, types: ["walk"], daysPerWeek: 3 }).sessions).toBe(3);
    const gym = buildTrainingWeek({ ...base, types: ["gym"], daysPerWeek: 4 });
    expect(gym.days.filter((d) => d.type === "walk").every((d) => !d.session)).toBe(true);
  });
  it("names the weekday", () => {
    expect(weekdayName("2026-11-23")).toBe("Monday");
    expect(weekdayName("2026-11-29")).toBe("Sunday");
  });
});

describe("weekProblems", () => {
  const day = (type: string, title: string, effort: string) =>
    ({ type, title, effort, session: true }) as never;
  it("flags back-to-back hard days, hard after legs, two interval days and no rest", () => {
    expect(
      weekProblems([
        day("gym", "Lower body A", "hard"),
        day("hiit", "Intervals", "hard"),
        day("hiit", "Intervals", "hard"),
      ]),
    ).toEqual([
      "two hard days in a row (0, 1)",
      "day after lower body is not easy (1)",
      "hard day after lower body (1)",
      "two hard days in a row (1, 2)",
      "more than one interval session",
      "no full rest day",
    ]);
  });
});

describe("easyPace", () => {
  it("starts beginners at walk/run and others at a level pace", () => {
    expect(easyPace("BEGINNER")).toBeNull();
    expect(easyPace("INTERMEDIATE")).toEqual([405, 435]);
    expect(easyPace("ADVANCED")).toEqual([345, 375]);
  });
  it("uses the user's own pace after 2 logged runs", () => {
    const runs = [
      { minutes: 30, distanceKm: 4.5 }, // 6:40
      { minutes: 32, distanceKm: 4.6 }, // ~6:57
    ];
    expect(easyPace("BEGINNER", runs)).toEqual([405, 435]);
    expect(easyPace("INTERMEDIATE", runs.slice(0, 1))).toEqual([405, 435]);
  });
  it("ignores impossible runs", () => {
    expect(
      easyPace("BEGINNER", [
        { minutes: 1, distanceKm: 10 },
        { minutes: 30, distanceKm: 0.1 },
      ]),
    ).toBeNull();
  });
  it("formats pace", () => expect(formatPace([405, 435])).toBe("6:45–7:15/km"));
});

describe("buildWeek with a training schedule", () => {
  it("puts strength sessions on the training week's gym days", () => {
    const training = buildTrainingWeek(base);
    const week = buildWeek({
      weekStart: monday,
      weekIndex: 0,
      experience: "INTERMEDIATE",
      equipment: "FULL_GYM",
      daysPerWeek: 4,
      sessionMinutes: 45,
      injuries: [],
      medicalFlag: false,
      ageYears: 30,
      bodyweightKg: 80,
      targetKcal: 2000,
      tdee: 2500,
      schedule: training.schedule,
    });
    expect(week.days.map((d) => [d.date, d.name])).toEqual([
      ["2026-11-23", "Upper body A"],
      ["2026-11-26", "Lower body A"],
    ]);
    expect(week.scheduleKey).toBe(scheduleKey(training.schedule));
    expect(week.scheduleKey).toBe("0:upper_a,3:lower_a");
  });
  it("builds no sessions for a week without gym days", () => {
    const week = buildWeek({
      weekStart: monday,
      weekIndex: 0,
      experience: "INTERMEDIATE",
      equipment: "FULL_GYM",
      daysPerWeek: 4,
      sessionMinutes: 45,
      injuries: [],
      medicalFlag: false,
      ageYears: 30,
      bodyweightKg: 80,
      targetKcal: 2000,
      tdee: 2500,
      schedule: [],
    });
    expect(week.days).toEqual([]);
    expect(week.scheduleKey).toBe("");
  });
});

describe("trainingPlanName (Workout tab eyebrow)", () => {
  const week = (types: TrainingType[], daysPerWeek = 4) =>
    buildTrainingWeek({ ...base, types, daysPerWeek }).days;

  it("names the strength split; more than one kind of training is a mixed plan", () => {
    expect(trainingPlanName(week(["gym"], 4))).toBe("Upper / lower");
    expect(trainingPlanName(week(["gym"], 3))).toBe("Full body A/B");
    expect(trainingPlanName(week(["gym", "run", "yoga"], 5))).toBe("Mixed plan");
    expect(trainingPlanName(week(["run", "cycle"], 4))).toBe("Mixed plan");
  });

  it("names weeks without strength by what they train", () => {
    expect(trainingPlanName(week(["run"], 4))).toBe("Running");
    expect(trainingPlanName(week(["yoga"], 3))).toBe("Yoga");
    expect(trainingPlanName(week(["walk"], 3))).toBe("Walking");
  });

  it("handles one full-body day and mixed templates", () => {
    expect(
      trainingPlanName([
        { type: "gym", template: "full_a" },
        { type: "rest", template: null },
      ]),
    ).toBe("Full body");
    expect(
      trainingPlanName([
        { type: "gym", template: "full_a" },
        { type: "gym", template: "upper_a" },
      ]),
    ).toBe("Strength");
    expect(trainingPlanName([{ type: "rest", template: null }])).toBe("Rest");
  });
});

describe("deficit wording follows the deficit flag (one source of truth)", () => {
  const upperWhy = (input: TrainingWeekInput) =>
    buildTrainingWeek({ ...input, types: ["gym"], daysPerWeek: 4 }).days.find(
      (d) => d.template === "upper_a",
    )!.why;

  it("says 'deficit' only when the plan eats below 95 % of maintenance, like the rest-day cardio", () => {
    // A slow fat-loss plan (2,299 of 2,396 kcal = 96 %): not a deficit phase.
    const slow = {
      ...base,
      goal: "lose" as const,
      deficit: caloriePhase(2299, 2396) === "deficit",
    };
    expect(slow.deficit).toBe(false);
    expect(upperWhy(slow)).toBe("Keeps your strength while you slowly lose fat.");
    expect(restDayCardio(slow.deficit ? "deficit" : "maintenance").noHiit).toBe(false);

    const cut = { ...base, goal: "lose" as const, deficit: caloriePhase(1900, 2396) === "deficit" };
    expect(cut.deficit).toBe(true);
    expect(upperWhy(cut)).toBe("Keeps your strength while you eat in a deficit.");
    expect(restDayCardio("deficit").noHiit).toBe(true);
  });
});
