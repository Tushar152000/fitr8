import type { Experience } from "./types.js";

/**
 * The weekly training plan behind the Workout tab (spec "Workout unlock", screens 16b–16d): which
 * kind of session goes on which day, how long it is, how hard, and what it burns. Pure and
 * deterministic: the same inputs always give the same week. Gym days only get their template here
 * (Upper A, Lower A …); their exercises come from the strength engine (`buildWeek` with a schedule).
 */

/** What the user likes to train (16b). */
export const TRAINING_TYPES = ["gym", "run", "yoga", "walk", "home", "cycle"] as const;
export type TrainingType = (typeof TRAINING_TYPES)[number];

/** A day's kind, as the app colours and labels it. `hiit` = interval sessions. */
export const DAY_TYPES = ["gym", "run", "hiit", "yoga", "walk", "cycle", "rest"] as const;
export type DayType = (typeof DAY_TYPES)[number];

export const EFFORTS = ["easy", "moderate", "hard", "light", "recover"] as const;
export type Effort = (typeof EFFORTS)[number];

export const TRAINING_DAYS_PER_WEEK = [3, 4, 5, 6] as const;
export const SESSION_MINUTES = [30, 45, 60] as const;
export type SessionMinutes = (typeof SESSION_MINUTES)[number];

export type TrainingGoal = "lose" | "maintain" | "gain";

/** Strength templates the strength engine knows (split.ts `STRENGTH_TEMPLATES`). */
export type StrengthTemplate = "upper_a" | "upper_b" | "lower_a" | "lower_b" | "full_a" | "full_b";

/** kcal in 1 kg of body fat: the spec's "≈ extra fat" line (sum ÷ 7,700). */
export const KCAL_PER_KG_FAT = 7700;

/** One block of a timed session (warm-up, run, interval …); drives the session bar and the timer. */
export interface SessionBlock {
  label: string;
  minutes: number;
  intensity: "easy" | "steady" | "hard" | "rest";
}

export interface TrainingStep {
  name: string;
  detail: string;
}

export interface TrainingDay {
  date: string;
  type: DayType;
  title: string;
  /** One line from the coach: why this session sits on this day. */
  why: string;
  /** 0 on rest days. */
  minutes: number;
  /** Estimate (MET × kg × hours, nearest 5); 0 on rest days. */
  kcal: number;
  effort: Effort;
  /** 2–4 rows. Empty for gym days until the strength engine fills them. */
  steps: TrainingStep[];
  /** Counts towards "{n} sessions" (walks on a training week are active rest, not sessions). */
  session: boolean;
  /** Timed blocks for runs, rides, yoga and walks; empty for gym and rest. */
  blocks: SessionBlock[];
  /** Runs: about how far at the planned pace. */
  distanceKm: number | null;
  /** Runs: easy pace as "6:45–7:15/km", null for walk-run and non-runs. */
  pace: string | null;
  /** Coach tips for this session (runs); empty otherwise. */
  tips: string[];
  /** MET used for the estimate (the logged duration reuses it). */
  met: number;
  /** Strength days: which template the strength engine should build. */
  template: StrengthTemplate | null;
  /** Bodyweight strength (home training). */
  home: boolean;
}

export type WeekStyle = "mix" | "strength" | "cardio" | "yoga" | "walk";

export interface TrainingWeekInput {
  /** Monday, UTC midnight. */
  weekStart: Date;
  types: TrainingType[];
  daysPerWeek: number;
  sessionMinutes: number;
  goal: TrainingGoal;
  /** Eating below maintenance (limits hard cardio). */
  deficit: boolean;
  weightKg: number;
  experience: Experience;
  /** Medical flag or under 18: beginner plan, no intervals, "check with a professional" note. */
  restricted: boolean;
  /** Logged runs (newest first) for pace: minutes and km. */
  runs?: { minutes: number; distanceKm: number }[];
}

export interface TrainingWeek {
  style: WeekStyle;
  days: TrainingDay[];
  sessions: number;
  totalKcal: number;
  coachNote: string;
  /** Strength days for the strength engine: weekday 0 = Monday. */
  schedule: { weekday: number; template: StrengthTemplate }[];
}

// ── Templates ──────────────────────────────────────────────────────────────

/**
 * Abstract session tokens. Strength: UA/UB upper, LA/LB lower, FA/FB full body. Cardio: ER easy,
 * IV intervals, LR long. Yoga: YF flow, PY power, SY slow, MO mobility. BW brisk walk, LW long
 * walk, RE rest. Substitution (`resolve`) turns them into the user's own activities.
 */
type Token =
  | "UA"
  | "UB"
  | "LA"
  | "LB"
  | "FA"
  | "FB"
  | "ER"
  | "IV"
  | "LR"
  | "YF"
  | "PY"
  | "SY"
  | "MO"
  | "BW"
  | "LW"
  | "RE";

type Week = [Token, Token, Token, Token, Token, Token, Token];

/**
 * Monday → Sunday per style and sessions a week. Built to the spec's rules: never two hard days
 * (lower body, intervals) back to back, an easy day after lower body, at most one interval
 * session, at least one full rest day, and 5–6 days add easy days rather than hard ones. The 4–6
 * day rows match the spec's templates; `weekProblems` checks every combination in the tests.
 */
const TEMPLATES: Record<WeekStyle, Record<3 | 4 | 5 | 6, Week>> = {
  mix: {
    3: ["FA", "BW", "ER", "RE", "FB", "LW", "RE"],
    4: ["UA", "ER", "BW", "LA", "YF", "LW", "RE"],
    5: ["UA", "ER", "YF", "LA", "BW", "IV", "RE"],
    6: ["UA", "ER", "YF", "LA", "SY", "IV", "RE"],
  },
  strength: {
    3: ["FA", "BW", "FB", "RE", "FA", "LW", "RE"],
    4: ["UA", "LA", "BW", "UB", "LB", "LW", "RE"],
    5: ["UA", "LA", "MO", "UB", "LB", "LW", "RE"],
    6: ["UA", "LA", "MO", "UB", "LB", "MO", "RE"],
  },
  cardio: {
    3: ["ER", "BW", "ER", "RE", "BW", "LR", "RE"],
    4: ["ER", "BW", "IV", "RE", "ER", "LR", "RE"],
    5: ["ER", "BW", "IV", "YF", "ER", "LR", "RE"],
    6: ["ER", "YF", "IV", "ER", "SY", "LR", "RE"],
  },
  yoga: {
    3: ["YF", "BW", "PY", "RE", "SY", "LW", "RE"],
    4: ["YF", "PY", "BW", "SY", "BW", "MO", "RE"],
    5: ["YF", "PY", "BW", "SY", "PY", "MO", "RE"],
    6: ["YF", "PY", "SY", "YF", "PY", "MO", "RE"],
  },
  walk: {
    3: ["BW", "RE", "BW", "RE", "RE", "LW", "RE"],
    4: ["BW", "BW", "RE", "BW", "RE", "LW", "RE"],
    5: ["BW", "BW", "BW", "RE", "BW", "LW", "RE"],
    6: ["BW", "BW", "BW", "BW", "BW", "LW", "RE"],
  },
};

/** The plan's shape from what the user picked (16b). */
export function weekStyle(types: readonly TrainingType[]): WeekStyle {
  const has = (t: TrainingType) => types.includes(t);
  const strength = has("gym") || has("home");
  const cardio = has("run") || has("cycle");
  if (strength && (cardio || has("yoga"))) return "mix";
  if (strength) return "strength";
  if (cardio) return "cardio";
  if (has("yoga")) return "yoga";
  return "walk";
}

// ── Durations, MET and kcal ────────────────────────────────────────────────

type Activity =
  | "strength"
  | "home_strength"
  | "easy_run"
  | "walk_run"
  | "intervals"
  | "long_run"
  | "long_walk_run"
  | "easy_ride"
  | "ride_intervals"
  | "long_ride"
  | "yoga_flow"
  | "power_yoga"
  | "slow_yoga"
  | "mobility"
  | "brisk_walk"
  | "long_walk"
  | "rest";

/**
 * MET per activity, from the Compendium of Physical Activities (spec "Calories burned"). Values not
 * in the spec's table: bodyweight circuit 3.8 (calisthenics, moderate), walk/run 6.0 (jog/walk
 * combination), cycling 6.8 (leisure, light) and 10.0 (vigorous), yoga flow 3.0, long walk 3.5
 * (moderate pace). Estimates only: the app always shows "~" or "about".
 */
export const MET: Record<Activity, number> = {
  strength: 5.0,
  home_strength: 3.8,
  easy_run: 8.3,
  walk_run: 6.0,
  intervals: 10.0,
  long_run: 8.3,
  long_walk_run: 6.0,
  easy_ride: 6.8,
  ride_intervals: 10.0,
  long_ride: 6.8,
  yoga_flow: 3.0,
  power_yoga: 4.0,
  slow_yoga: 2.5,
  mobility: 2.5,
  brisk_walk: 4.3,
  long_walk: 3.5,
  rest: 0,
};

/** Default MET for a logged session of a type that isn't the planned one. */
export const MET_BY_TYPE: Record<DayType, number> = {
  gym: MET.strength,
  run: MET.easy_run,
  hiit: MET.intervals,
  yoga: MET.yoga_flow,
  walk: MET.brisk_walk,
  cycle: MET.easy_ride,
  rest: 0,
};

/** `kcal = MET × weight_kg × hours`, rounded to the nearest 5 (spec). */
export function burnKcal(met: number, weightKg: number, minutes: number): number {
  if (!(met > 0) || !(weightKg > 0) || !(minutes > 0)) return 0;
  return Math.round((met * weightKg * (minutes / 60)) / 5) * 5;
}

/** "≈ extra fat" for a week's burn, kg to 2 decimal places (information, not a promise). */
export const fatKgFromKcal = (kcal: number) => Math.round((kcal / KCAL_PER_KG_FAT) * 100) / 100;

/** Minutes per activity for a 30 / 45 / 60-minute session setting (spec examples at 45). */
const MINUTES: Record<
  Exclude<Activity, "strength" | "home_strength" | "rest">,
  [number, number, number]
> = {
  easy_run: [25, 30, 40],
  walk_run: [25, 30, 35],
  intervals: [25, 30, 35],
  long_run: [40, 50, 60],
  long_walk_run: [35, 40, 45],
  easy_ride: [30, 40, 50],
  ride_intervals: [25, 30, 35],
  long_ride: [45, 60, 75],
  yoga_flow: [30, 40, 50],
  power_yoga: [30, 45, 60],
  slow_yoga: [25, 30, 45],
  mobility: [15, 20, 25],
  brisk_walk: [30, 30, 40],
  long_walk: [40, 45, 60],
};

function minutesFor(activity: Activity, session: number): number {
  if (activity === "rest") return 0;
  if (activity === "strength" || activity === "home_strength") return session;
  const i = session <= 30 ? 0 : session <= 45 ? 1 : 2;
  return MINUTES[activity][i];
}

// ── Running pace ───────────────────────────────────────────────────────────

/**
 * Easy pace in seconds per km, [fast, slow], or null for walk/run intervals. Beginners start at
 * walk/run (1 min run, 2 min walk); after 2 logged runs with a distance, the pace comes from the
 * user's own runs (median, plus up to 30 s slower) for every level (spec 16d).
 */
export function easyPace(
  experience: Experience,
  runs: { minutes: number; distanceKm: number }[] = [],
): [number, number] | null {
  const paces = runs
    .filter((r) => r.distanceKm >= 0.5 && r.minutes > 0)
    .map((r) => (r.minutes * 60) / r.distanceKm)
    .filter((p) => p >= 180 && p <= 900)
    .slice(0, 6)
    .sort((a, b) => a - b);
  if (paces.length >= 2) {
    const mid = paces.length >> 1;
    const median = paces.length % 2 ? paces[mid] : (paces[mid - 1] + paces[mid]) / 2;
    const fast = Math.round(median / 15) * 15;
    return [fast, fast + 30];
  }
  if (experience === "BEGINNER") return null;
  return experience === "ADVANCED" ? [345, 375] : [405, 435];
}

const clock = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
export const formatPace = (p: [number, number]) => `${clock(p[0])}–${clock(p[1])}/km`;

// ── Building the week ──────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const WEEKDAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const HARD: ReadonlySet<Token> = new Set(["LA", "LB", "IV"]);
const LOWER: ReadonlySet<Token> = new Set(["LA", "LB"]);
const STRENGTH: Record<"UA" | "UB" | "LA" | "LB" | "FA" | "FB", StrengthTemplate> = {
  UA: "upper_a",
  UB: "upper_b",
  LA: "lower_a",
  LB: "lower_b",
  FA: "full_a",
  FB: "full_b",
};
const STRENGTH_TITLE: Record<StrengthTemplate, string> = {
  upper_a: "Upper body A",
  upper_b: "Upper body B",
  lower_a: "Lower body A",
  lower_b: "Lower body B",
  full_a: "Full body A",
  full_b: "Full body B",
};

const RUN_TIPS = [
  "Have a small snack 60–90 minutes before: a banana, toast or a few dates.",
  "Run early in the morning, when the air quality (AQI) is usually better.",
  "If a joint hurts, stop running and walk the rest. Pain is a signal, not a challenge.",
];

/**
 * Applies the safety rules to the template: restricted users (medical flag, under 18) get full
 * body only and no intervals; beginners and anyone in a deficit with intervals beyond one get easy
 * runs instead.
 */
function safeTokens(week: Week, input: TrainingWeekInput): Token[] {
  const beginner = input.restricted || input.experience === "BEGINNER";
  let intervals = 0;
  let full = 0;
  return week.map((t) => {
    if (input.restricted && t in STRENGTH) return full++ % 2 === 0 ? "FA" : "FB";
    if (t === "IV") {
      intervals++;
      if (beginner || (input.deficit && intervals > 1)) return "ER";
    }
    return t;
  });
}

/** Every rule the spec sets for a week, as readable problems (empty = valid). Used by the tests. */
export function weekProblems(
  days: Pick<TrainingDay, "type" | "title" | "effort" | "session">[],
): string[] {
  const problems: string[] = [];
  const hard = days.map((d) => d.effort === "hard");
  const lower = days.map((d) => d.type === "gym" && d.title.startsWith("Lower"));
  for (let i = 1; i < days.length; i++) {
    if (hard[i] && hard[i - 1]) problems.push(`two hard days in a row (${i - 1}, ${i})`);
    if (lower[i - 1] && !["run", "yoga", "walk", "cycle", "rest"].includes(days[i].type))
      problems.push(`day after lower body is not easy (${i})`);
    if (lower[i - 1] && days[i].effort === "hard")
      problems.push(`hard day after lower body (${i})`);
  }
  if (days.filter((d) => d.type === "hiit").length > 1)
    problems.push("more than one interval session");
  if (!days.some((d) => d.type === "rest")) problems.push("no full rest day");
  return problems;
}

/** Builds the user's week (16c). */
export function buildTrainingWeek(input: TrainingWeekInput): TrainingWeek {
  const style = weekStyle(input.types);
  const n = Math.min(6, Math.max(3, Math.round(input.daysPerWeek))) as 3 | 4 | 5 | 6;
  const tokens = safeTokens(TEMPLATES[style][n], input);
  const has = (t: TrainingType) => input.types.includes(t);
  const pace = easyPace(input.restricted ? "BEGINNER" : input.experience, input.runs);
  const walkRun = pace == null;
  let cardioIndex = 0;

  const days: TrainingDay[] = tokens.map((token, i) => {
    const date = ymd(new Date(input.weekStart.getTime() + i * DAY_MS));
    const prev = i > 0 ? tokens[i - 1] : null;
    const afterLower = prev != null && LOWER.has(prev);
    const base = {
      date,
      distanceKm: null,
      pace: null,
      tips: [] as string[],
      template: null,
      home: false,
    };

    // Strength
    if (token in STRENGTH) {
      const template = STRENGTH[token as keyof typeof STRENGTH];
      const home = !has("gym") && has("home");
      const activity: Activity = home ? "home_strength" : "strength";
      const minutes = minutesFor(activity, input.sessionMinutes);
      return {
        ...base,
        type: "gym",
        title: STRENGTH_TITLE[template],
        why: strengthWhy(template, input, n, home),
        minutes,
        kcal: burnKcal(MET[activity], input.weightKg, minutes),
        effort: LOWER.has(token) ? "hard" : "moderate",
        steps: [],
        session: true,
        blocks: [],
        met: MET[activity],
        template,
        home,
      };
    }

    // Cardio: run and cycle alternate when both are picked; without either it becomes a walk,
    // yoga or mobility (whatever the user does).
    if (token === "ER" || token === "IV" || token === "LR") {
      const mode = cardioMode(input.types, cardioIndex++);
      if (mode === "run" || mode === "cycle")
        return cardioDay(token, mode, { input, base, prev, pace, walkRun, afterLower });
      // It takes a session's place, so it counts as one.
      const sub: Token =
        mode === "walk" ? (token === "LR" ? "LW" : "BW") : mode === "yoga" ? "SY" : "MO";
      return easyDay(sub, input, base, true, afterLower, prev);
    }

    if (token === "RE") return restDay(base, afterLower);
    const isSession = token === "BW" || token === "LW" ? style === "walk" : true;
    // Yoga slots for someone who doesn't do yoga become mobility.
    const sub = ["YF", "PY", "SY"].includes(token) && !has("yoga") ? "MO" : token;
    return easyDay(sub, input, base, isSession, afterLower, prev);
  });

  const sessions = days.filter((d) => d.session).length;
  return {
    style,
    days,
    sessions,
    totalKcal: days.reduce((s, d) => s + d.kcal, 0),
    coachNote: coachNote(style, n, input, days),
    schedule: days.flatMap((d, i) => (d.template ? [{ weekday: i, template: d.template }] : [])),
  };
}

function cardioMode(
  types: readonly TrainingType[],
  index: number,
): "run" | "cycle" | "walk" | "yoga" | "mobility" {
  const run = types.includes("run");
  const cycle = types.includes("cycle");
  if (run && cycle) return index % 2 === 0 ? "run" : "cycle";
  if (run) return "run";
  if (cycle) return "cycle";
  if (types.includes("walk")) return "walk";
  if (types.includes("yoga")) return "yoga";
  return "mobility";
}

type Base = Pick<TrainingDay, "date" | "distanceKm" | "pace" | "tips" | "template" | "home">;

function cardioDay(
  token: "ER" | "IV" | "LR",
  mode: "run" | "cycle",
  ctx: {
    input: TrainingWeekInput;
    base: Base;
    prev: Token | null;
    pace: [number, number] | null;
    walkRun: boolean;
    afterLower: boolean;
  },
): TrainingDay {
  const { input, base, prev, pace, walkRun } = ctx;
  const kg = input.weightKg;
  const prevTitle = prev ? tokenTitle(prev) : null;

  if (mode === "cycle") {
    const activity: Activity =
      token === "IV" ? "ride_intervals" : token === "LR" ? "long_ride" : "easy_ride";
    const minutes = minutesFor(activity, input.sessionMinutes);
    const blocks =
      token === "IV"
        ? intervalBlocks(minutes, "Easy spin", "Hard effort", "Easy spin")
        : [
            { label: "Easy spin", minutes: 5, intensity: "easy" as const },
            {
              label: token === "LR" ? "Long steady ride" : "Steady ride",
              minutes: minutes - 10,
              intensity: "steady" as const,
            },
            { label: "Cool-down spin", minutes: 5, intensity: "easy" as const },
          ];
    return {
      ...base,
      type: token === "IV" ? "hiit" : "cycle",
      title: token === "IV" ? "Ride intervals" : token === "LR" ? "Long ride" : "Easy ride",
      why:
        token === "IV"
          ? "One hard session a week lifts your fitness fastest; the days around it stay easy."
          : token === "LR"
            ? "Your longest ride of the week, at a pace where you can still talk."
            : ctx.afterLower
              ? `Yesterday was ${prevTitle?.toLowerCase()}, so today's ride stays easy and spins your legs out.`
              : "An easy ride builds your engine without tiring your legs for the next session.",
      minutes,
      kcal: burnKcal(MET[activity], kg, minutes),
      effort: token === "IV" ? "hard" : token === "LR" ? "moderate" : "easy",
      steps: stepsFromBlocks(blocks),
      session: true,
      blocks,
      met: MET[activity],
    };
  }

  // Running
  if (token === "IV") {
    const minutes = minutesFor("intervals", input.sessionMinutes);
    const blocks = intervalBlocks(minutes, "Warm-up jog", "Fast run", "Easy jog");
    return {
      ...base,
      type: "hiit",
      title: "Intervals",
      why: "One hard session a week lifts your fitness fastest; the day before and after stay easy.",
      minutes,
      kcal: burnKcal(MET.intervals, kg, minutes),
      effort: "hard",
      steps: stepsFromBlocks(blocks),
      session: true,
      blocks,
      tips: RUN_TIPS,
      met: MET.intervals,
    };
  }

  const long = token === "LR";
  const activity: Activity = walkRun
    ? long
      ? "long_walk_run"
      : "walk_run"
    : long
      ? "long_run"
      : "easy_run";
  const minutes = minutesFor(activity, input.sessionMinutes);
  const main = minutes - 10;
  let blocks: SessionBlock[];
  let runMinutes: number;
  if (walkRun) {
    // 1 min run, 2 min walk, repeated (spec 16d: how beginners start).
    const rounds = Math.max(1, Math.floor(main / 3));
    blocks = [{ label: "Warm-up walk", minutes: 5, intensity: "easy" }];
    for (let r = 0; r < rounds; r++) {
      blocks.push({ label: "Run", minutes: 1, intensity: "steady" });
      blocks.push({ label: "Walk", minutes: 2, intensity: "easy" });
    }
    const left = main - rounds * 3;
    if (left > 0) blocks.push({ label: "Walk", minutes: left, intensity: "easy" });
    blocks.push({ label: "Cool-down walk", minutes: 5, intensity: "easy" });
    runMinutes = rounds;
  } else {
    blocks = [
      { label: "Warm-up walk", minutes: 5, intensity: "easy" },
      { label: long ? "Long easy run" : "Easy run", minutes: main, intensity: "steady" },
      { label: "Cool-down walk", minutes: 5, intensity: "easy" },
    ];
    runMinutes = main;
  }
  const paceText = !walkRun && pace ? formatPace(pace) : null;
  const distanceKm =
    !walkRun && pace ? Math.round(((runMinutes * 60) / ((pace[0] + pace[1]) / 2)) * 10) / 10 : null;
  const why = walkRun
    ? "Walk/run builds you up safely: 1 minute running, 2 minutes walking. Keep the running easy."
    : long
      ? "Your longest run of the week, all at an easy, conversational pace."
      : prev != null && prev in STRENGTH
        ? `Yesterday was ${prevTitle?.toLowerCase()}, so today stays easy. Run at a pace where you can still talk in full sentences.`
        : "Easy running builds your engine. Run at a pace where you can still talk in full sentences.";
  return {
    ...base,
    type: "run",
    title: walkRun ? (long ? "Long walk/run" : "Easy walk/run") : long ? "Long run" : "Easy run",
    why,
    minutes,
    kcal: burnKcal(MET[activity], kg, minutes),
    effort: long ? "moderate" : "easy",
    steps: walkRun
      ? [
          { name: "Warm-up walk", detail: "5 min" },
          { name: "Run 1 min, walk 2 min", detail: `${Math.max(1, Math.floor(main / 3))} rounds` },
          { name: "Cool-down walk", detail: "5 min" },
        ]
      : [
          { name: "Warm-up walk", detail: "5 min" },
          {
            name: long ? "Long easy run" : "Easy run",
            detail: `${main} min${paceText ? ` at ${paceText}` : ""}`,
          },
          { name: "Cool-down walk", detail: "5 min" },
        ],
    session: true,
    blocks,
    distanceKm,
    pace: paceText,
    tips: RUN_TIPS,
    met: MET[activity],
  };
}

function intervalBlocks(minutes: number, warm: string, hard: string, easy: string): SessionBlock[] {
  const reps = Math.max(3, Math.floor((minutes - 10) / 3));
  const blocks: SessionBlock[] = [{ label: warm, minutes: 5, intensity: "easy" }];
  for (let r = 0; r < reps; r++) {
    blocks.push({ label: hard, minutes: 1, intensity: "hard" });
    blocks.push({ label: easy, minutes: 2, intensity: "easy" });
  }
  blocks.push({
    label: "Cool-down",
    minutes: Math.max(5, minutes - 5 - reps * 3),
    intensity: "easy",
  });
  return blocks;
}

/** Collapses a block list into 2–4 readable rows (repeats become "6 × …"). */
function stepsFromBlocks(blocks: SessionBlock[]): TrainingStep[] {
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  const middle = blocks.slice(1, -1);
  const hard = middle.filter((b) => b.intensity === "hard");
  const rows: TrainingStep[] = [{ name: first.label, detail: `${first.minutes} min` }];
  if (hard.length) {
    const rest = middle.find((b) => b.intensity !== "hard");
    rows.push({
      name: `${hard.length} × ${hard[0].label.toLowerCase()}`,
      detail: `${hard[0].minutes} min hard, ${rest?.minutes ?? 2} min easy`,
    });
  } else {
    for (const b of middle) rows.push({ name: b.label, detail: `${b.minutes} min` });
  }
  rows.push({ name: last.label, detail: `${last.minutes} min` });
  return rows;
}

const YOGA: Record<
  "YF" | "PY" | "SY" | "MO",
  { title: string; activity: Activity; effort: Effort; why: string; steps: TrainingStep[] }
> = {
  YF: {
    title: "Yoga flow",
    activity: "yoga_flow",
    effort: "light",
    why: "Moves every joint through its full range and helps your muscles recover.",
    steps: [
      { name: "Breathing and warm-up", detail: "5 min" },
      { name: "Sun salutations", detail: "6 rounds, one breath per move" },
      { name: "Standing poses", detail: "Warrior I and II, triangle, 5 breaths each side" },
      { name: "Floor and rest", detail: "Bridge, seated forward fold, savasana" },
    ],
  },
  PY: {
    title: "Power yoga",
    activity: "power_yoga",
    effort: "moderate",
    why: "Builds strength and balance without loading your joints.",
    steps: [
      { name: "Warm-up flow", detail: "5 min" },
      { name: "Sun salutation B", detail: "5 rounds" },
      { name: "Strength holds", detail: "Chair, plank, warrior III: 30–45 s each" },
      { name: "Cool-down and savasana", detail: "5 min" },
    ],
  },
  SY: {
    title: "Slow yoga",
    activity: "slow_yoga",
    effort: "light",
    why: "Long, slow holds to recover and to help you sleep well.",
    steps: [
      { name: "Gentle breathing", detail: "5 min" },
      { name: "Cat-cow, child's pose, low lunge", detail: "1 min each" },
      { name: "Long holds", detail: "Pigeon, butterfly, supine twist: 2 min each" },
      { name: "Savasana", detail: "5 min" },
    ],
  },
  MO: {
    title: "Mobility",
    activity: "mobility",
    effort: "recover",
    why: "A short mobility session makes your lifts and runs feel smoother.",
    steps: [
      { name: "Hips: 90/90 switches", detail: "2 × 8" },
      { name: "Upper back: open books", detail: "2 × 8 each side" },
      { name: "Ankles: knee-to-wall", detail: "2 × 10 each side" },
      { name: "Hamstrings: leg swings", detail: "2 × 12 each leg" },
    ],
  },
};

function easyDay(
  token: Token,
  input: TrainingWeekInput,
  base: Base,
  session: boolean,
  afterLower: boolean,
  prev: Token | null,
): TrainingDay {
  const kg = input.weightKg;
  if (token === "BW" || token === "LW") {
    const activity: Activity = token === "LW" ? "long_walk" : "brisk_walk";
    const minutes = minutesFor(activity, input.sessionMinutes);
    const blocks: SessionBlock[] = [
      { label: token === "LW" ? "Long, easy walk" : "Brisk walk", minutes, intensity: "steady" },
    ];
    return {
      ...base,
      type: "walk",
      title: token === "LW" ? "Long walk" : "Brisk walk",
      why: afterLower
        ? "Yesterday was lower body, so today is an easy walk: it helps your legs recover."
        : session
          ? token === "LW"
            ? "Your longest walk of the week: easy pace, good for your heart and your calorie burn."
            : "A brisk walk, a little faster than talking pace. Every step adds up."
          : "Active rest: an easy walk helps recovery and adds to your daily steps.",
      minutes,
      kcal: burnKcal(MET[activity], kg, minutes),
      effort: token === "LW" ? "easy" : "light",
      steps:
        token === "LW"
          ? [
              { name: "Long walk", detail: `${minutes} min at an easy pace` },
              { name: "Steps", detail: "Aim for 8–10k across the day" },
            ]
          : [
              { name: "Brisk walk", detail: `${minutes} min, a little faster than talking pace` },
              { name: "Steps", detail: "Aim for 8–10k across the day" },
            ],
      session,
      blocks,
      met: MET[activity],
    };
  }
  const y = YOGA[token as keyof typeof YOGA];
  const minutes = minutesFor(y.activity, input.sessionMinutes);
  const why = afterLower
    ? `Yesterday was lower body, so today is gentle on your legs. ${y.why}`
    : prev === "IV"
      ? `An easy day after yesterday's intervals. ${y.why}`
      : y.why;
  return {
    ...base,
    type: "yoga",
    title: y.title,
    why,
    minutes,
    kcal: burnKcal(MET[y.activity], kg, minutes),
    effort: y.effort,
    steps: y.steps,
    session,
    blocks: yogaBlocks(y.steps, minutes),
    met: MET[y.activity],
  };
}

/** Splits a yoga/mobility session's minutes over its steps for the timer. */
function yogaBlocks(steps: TrainingStep[], minutes: number): SessionBlock[] {
  const fixed = steps.map((s) =>
    /^\d+ min$/.test(s.detail) ? Number.parseInt(s.detail, 10) : null,
  );
  const fixedTotal = fixed.reduce<number>((t, m) => t + (m ?? 0), 0);
  const open = fixed.filter((m) => m == null).length;
  const each = open ? Math.max(1, Math.floor((minutes - fixedTotal) / open)) : 0;
  const blocks = steps.map((s, i) => ({
    label: s.name,
    minutes: fixed[i] ?? each,
    intensity: "steady" as const,
  }));
  const total = blocks.reduce((t, b) => t + b.minutes, 0);
  if (total !== minutes && blocks.length) {
    const j = fixed.findIndex((m) => m == null);
    const k = j >= 0 ? j : blocks.length - 1;
    blocks[k] = { ...blocks[k], minutes: Math.max(1, blocks[k].minutes + minutes - total) };
  }
  return blocks;
}

function restDay(base: Base, afterLower: boolean): TrainingDay {
  return {
    ...base,
    type: "rest",
    title: "Rest",
    why: afterLower
      ? "A full rest day after lower body. Your muscles get stronger while they recover."
      : "A full rest day. Your body gets stronger while it recovers.",
    minutes: 0,
    kcal: 0,
    effort: "recover",
    steps: [
      { name: "Sleep", detail: "7–9 hours tonight" },
      { name: "Move a little", detail: "An easy 15-minute walk if you feel stiff" },
      { name: "Eat your protein", detail: "Some at every meal helps you recover" },
    ],
    session: false,
    blocks: [],
    met: 0,
  };
}

function tokenTitle(t: Token): string {
  // "Upper body A" → "upper body": the A/B variant means nothing in a sentence.
  if (t in STRENGTH)
    return STRENGTH_TITLE[STRENGTH[t as keyof typeof STRENGTH]].replace(/ [AB]$/, "");
  const titles: Partial<Record<Token, string>> = {
    ER: "an easy run",
    IV: "intervals",
    LR: "a long run",
    BW: "a walk",
    LW: "a long walk",
    RE: "rest",
  };
  return titles[t] ?? YOGA[t as keyof typeof YOGA]?.title ?? "";
}

function strengthWhy(
  template: StrengthTemplate,
  input: TrainingWeekInput,
  n: number,
  home: boolean,
): string {
  const where = home ? " No equipment needed: bodyweight moves you can do at home." : "";
  if (input.restricted)
    return `Beginner full-body training at an easy effort. Please check with a professional before pushing harder.${where}`;
  if (template.startsWith("full"))
    return `Every main muscle in one session: the best use of ${n} days a week.${where}`;
  if (template.startsWith("lower"))
    return `Legs and hips, the biggest muscles you have. The hardest session of the week, so tomorrow stays easy.${where}`;
  const goal =
    input.goal === "lose"
      ? "Keeps your strength while you eat in a deficit."
      : input.goal === "gain"
        ? "Gives the extra food a job: building upper-body muscle."
        : "Builds upper-body strength while your weight holds steady.";
  return `${goal}${where}`;
}

function coachNote(
  style: WeekStyle,
  n: number,
  input: TrainingWeekInput,
  days: TrainingDay[],
): string {
  const hard = days.filter((d) => d.effort === "hard").length;
  const rest = days.filter((d) => d.type === "rest").length;
  const restText = rest === 1 ? "one full rest day" : `${rest} full rest days`;
  let note: string;
  switch (style) {
    case "mix":
      note =
        n === 3
          ? `Full body twice with cardio between, plus walks and ${restText}.`
          : `Strength, cardio and recovery days take turns, so the hard days are never back to back. ${capitalize(restText)} to recover.`;
      break;
    case "strength":
      note =
        n === 3
          ? `Full body ${n} times with a day off between, so every session starts fresh.`
          : `Upper and lower days alternate, each muscle trains twice, and the day after legs is always easy.`;
      break;
    case "cardio":
      note = `About 80% of your running is easy${hard ? `, with one hard session` : ""} and one long session to build endurance.`;
      break;
    case "yoga":
      note = `Yoga ${n} times a week, from strong to slow, with walks and ${restText} between.`;
      break;
    default:
      note = `${n} walks a week, one of them long, with ${restText}. Steady walking adds up fast.`;
  }
  if (input.restricted)
    note +=
      " Because of your age or a medical flag this is a beginner plan with no intervals. Please check with a professional before training harder.";
  else if (input.deficit && hard)
    note += " You're eating in a deficit, so there is at most one hard cardio session.";
  return note;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Monday" for a date in a week (UTC date-only). */
export const weekdayName = (date: string) =>
  WEEKDAY[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];
