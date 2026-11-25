import { Injectable, Logger } from "@nestjs/common";
import type {
  TrainingDayDto,
  TrainingDayStatus,
  TrainingLogDto,
  TrainingLogInput,
  TrainingProfileDto,
  TrainingProfileInput,
  TrainingStateDto,
  TrainingWeekDto,
} from "@fitr8/contracts";
import type {
  Prisma,
  TrainingLog,
  TrainingProfile,
  TrainingSessionType,
  TrainingType as DbTrainingType,
} from "@fitr8/db";
import { MEAL_BACKFILL_DAYS, parseDateOnly, weekStart, ymdOf } from "@fitr8/domain/dates";
import { recoveryAdvice } from "@fitr8/domain/health";
import {
  burnKcal,
  fatKgFromKcal,
  MET_BY_TYPE,
  restDayCardio,
  trainingPlanName,
  weekdayName,
  WeekPlanSchema,
  type DayType,
  type PlanDay,
  type TrainingType,
} from "@fitr8/domain/training";
import { AppError } from "../../common/errors.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { proRequired } from "../billing/pro-required.js";
import { BillingService } from "../billing/billing.service.js";
import { HealthDataService } from "../health-data/health-data.service.js";
import { TargetsService } from "../plan/targets.service.js";
import { UsersService } from "../users/users.service.js";
import { planningContext, toTrainingTypes, TrainingPlanner } from "./training-planner.js";
import { WorkoutsService } from "./workouts.service.js";

const DAY_MS = 86_400_000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
/** How far back a week can be opened. */
const MAX_WEEKS_BACK = 52;

type LoggedType = Exclude<DayType, "rest">;
const toDbSession = (t: LoggedType) => t.toUpperCase() as TrainingSessionType;
const fromDbSession = (t: TrainingSessionType) => t.toLowerCase() as LoggedType;

/**
 * The Workout tab (spec "Workout unlock" 16b–16d): training profile, the week with what was done,
 * and session logs. Premium only, checked here so every route is gated server-side.
 */
@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planner: TrainingPlanner,
    private readonly workouts: WorkoutsService,
    private readonly billing: BillingService,
    private readonly targets: TargetsService,
    private readonly users: UsersService,
    private readonly health: HealthDataService,
  ) {}

  private async requirePremium(userId: string) {
    if (!(await this.billing.limits(userId)).workouts)
      throw proRequired("workouts", "Workouts are part of FITR8 Premium.");
  }

  /** GET /training: the profile (null before 16b), 16b's defaults and its onboarding summary. */
  async state(userId: string): Promise<TrainingStateDto> {
    await this.requirePremium(userId);
    const [profile, { profile: body, metric, goal }] = await Promise.all([
      this.planner.profile(userId),
      this.targets.computePlan(userId),
    ]);
    const where: TrainingType[] = body.equipment === "FULL_GYM" ? ["gym"] : ["home"];
    return {
      profile: profile ? profileDto(profile) : null,
      defaults: profile
        ? {
            types: toTrainingTypes(profile.types),
            daysPerWeek: profile.daysPerWeek,
            sessionMinutes: profile.sessionMinutes,
          }
        : { types: where, daysPerWeek: 4, sessionMinutes: 45 },
      summary: {
        goal: goal.type === "FAT_LOSS" ? "lose" : goal.type === "MUSCLE_GAIN" ? "gain" : "maintain",
        weightKg: metric.weightKg,
        activityLevel: body.activityLevel,
      },
    };
  }

  /** POST /training/profile (16b "Build my week"): saves the answers and returns this week. */
  async saveProfile(userId: string, input: TrainingProfileInput): Promise<TrainingWeekDto> {
    await this.requirePremium(userId);
    // Onboarding first: the week needs the goal and weight.
    await this.targets.computePlan(userId);
    const data = {
      types: input.types.map((t) => t.toUpperCase() as DbTrainingType),
      daysPerWeek: input.daysPerWeek,
      sessionMinutes: input.sessionMinutes,
    };
    const [, today] = await Promise.all([
      this.prisma.trainingProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      }),
      this.users.today(userId),
    ]);
    return this.weekDto(userId, weekStart(today), today);
  }

  /** GET /training/week?start=: the week containing `start` (default this week). */
  async week(userId: string, start?: string): Promise<TrainingWeekDto> {
    await this.requirePremium(userId);
    const today = await this.users.today(userId);
    let monday = weekStart(today);
    if (start) {
      const date = parseDateOnly(start);
      if (Number.isNaN(date.getTime()) || ymdOf(date) !== start)
        throw new AppError(400, "Use a real date (YYYY-MM-DD)");
      monday = weekStart(date);
      const thisWeek = weekStart(today).getTime();
      if (monday.getTime() > thisWeek + 7 * DAY_MS)
        throw new AppError(400, "You can look one week ahead");
      if (monday.getTime() < thisWeek - MAX_WEEKS_BACK * 7 * DAY_MS)
        throw new AppError(400, "Pick a week within the last year");
    }
    return this.weekDto(userId, monday, today);
  }

  /**
   * POST /training/logs: a session done ("I already ran", the run/yoga timer, focus mode). One per
   * type per day: logging it again replaces it. kcal from the logged minutes (spec: the estimate is
   * replaced once logged).
   */
  async log(userId: string, input: TrainingLogInput): Promise<TrainingLogDto> {
    await this.requirePremium(userId);
    const today = await this.users.today(userId);
    const date = parseDateOnly(input.date);
    if (Number.isNaN(date.getTime()) || ymdOf(date) !== input.date)
      throw new AppError(400, "Use a real date (YYYY-MM-DD)");
    const daysBack = Math.round((today.getTime() - date.getTime()) / DAY_MS);
    if (daysBack < 0) throw new AppError(400, "You can't log a session for a future day");
    if (daysBack > MEAL_BACKFILL_DAYS)
      throw new AppError(
        400,
        `You can log sessions for today or up to ${MEAL_BACKFILL_DAYS} days back`,
      );

    const [planned, body] = await Promise.all([
      this.planner.week(
        userId,
        weekStart(date),
        planningContext({ targets: this.targets, users: this.users }, userId, today),
      ),
      this.targets.bodyBasics(userId, date),
    ]);
    const day = planned?.week.days.find((d) => d.date === input.date);
    const met = day && day.type === input.type ? day.met : MET_BY_TYPE[input.type];
    const weightKg = body.weightKg ?? planned?.weightKg ?? 0;
    const data = {
      minutes: input.minutes,
      distanceKm: input.distanceKm ?? null,
      kcal: burnKcal(met, weightKg, input.minutes),
      exercises: (input.exercises ?? null) as Prisma.InputJsonValue | null,
    };
    const type = toDbSession(input.type);
    const row = await this.prisma.trainingLog.upsert({
      where: { userId_date_type: { userId, date, type } },
      create: { userId, date, type, ...data, exercises: data.exercises ?? undefined },
      update: { ...data, exercises: data.exercises ?? undefined },
    });
    return logDto(row);
  }

  /** DELETE /training/logs/:id (undo). */
  async deleteLog(userId: string, id: string) {
    await this.requirePremium(userId);
    const { count } = await this.prisma.trainingLog.deleteMany({ where: { id, userId } });
    if (!count) throw new AppError(404, "Session not found");
  }

  /** One week for the Workout tab; `today` is the user's local today (read once per request). */
  private async weekDto(userId: string, monday: Date, today: Date): Promise<TrainingWeekDto> {
    // One context: the planner and the strength engine share the plan maths and today.
    const ctx = planningContext({ targets: this.targets, users: this.users }, userId, today);
    const planned = await this.planner.week(userId, monday, ctx);
    if (!planned) throw new AppError(404, "Set up your training first");
    const { week, profile, goal, deficit } = planned;
    const todayKey = ymdOf(today);
    const end = addDays(monday, 7);
    const isCurrentOrLater = monday.getTime() >= weekStart(today).getTime();
    const todayPlanned = week.days.find((d) => d.date === todayKey);

    const [logs, setLogs, gymPlan, recovery] = await Promise.all([
      this.prisma.trainingLog.findMany({
        where: { userId, date: { gte: monday, lt: end } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.workoutLog.findMany({
        where: { userId, completed: true, date: { gte: monday, lt: end } },
        select: { date: true, exerciseSlug: true },
      }),
      week.schedule.length
        ? this.gymPlan(userId, monday, isCurrentOrLater, { ctx, schedule: week.schedule })
        : Promise.resolve(null),
      todayPlanned ? this.recovery(userId, todayPlanned.effort === "hard") : Promise.resolve(null),
    ]);

    const logsByDate = new Map<string, TrainingLog[]>();
    for (const l of logs)
      logsByDate.set(ymdOf(l.date), [...(logsByDate.get(ymdOf(l.date)) ?? []), l]);
    const setsByDate = new Map<string, Set<string>>();
    for (const l of setLogs) {
      const key = ymdOf(l.date);
      if (!setsByDate.has(key)) setsByDate.set(key, new Set());
      setsByDate.get(key)!.add(l.exerciseSlug);
    }
    const createdOn = ymdOf(profile.createdAt);

    const days: TrainingDayDto[] = week.days.map((d) => {
      const dayLogs = logsByDate.get(d.date) ?? [];
      const gymDay = d.type === "gym" ? gymPlan?.find((p) => p.date === d.date) : undefined;
      const setsDone = setsByDate.get(d.date)?.size ?? 0;
      const gymFinished = gymDay ? setsDone >= gymDay.exercises.length : false;
      const done =
        dayLogs.length > 0 ||
        (d.type === "gym" ? gymFinished || (d.date < todayKey && setsDone > 0) : false);
      let status: TrainingDayStatus;
      if (d.date === todayKey) status = done ? "done" : "today";
      else if (d.date > todayKey) status = "planned";
      else if (done) status = "done";
      else status = d.type === "rest" || d.date < createdOn ? "planned" : "missed";

      return {
        date: d.date,
        weekday: weekdayName(d.date),
        type: d.type,
        title: d.title,
        why: d.why,
        minutes: dayLogs.length ? dayLogs.reduce((t, l) => t + l.minutes, 0) : d.minutes,
        kcal: dayLogs.length ? dayLogs.reduce((t, l) => t + l.kcal, 0) : d.kcal,
        effort: d.effort,
        steps: gymDay ? gymSteps(gymDay) : d.steps,
        status,
        session: d.session,
        blocks: d.blocks,
        distanceKm: d.distanceKm,
        pace: d.pace,
        tips: d.tips,
        home: d.home,
        logs: dayLogs.map(logDto),
        gym:
          d.type === "gym" ? { exercises: gymDay?.exercises.length ?? 0, logged: setsDone } : null,
        exercises: gymDay
          ? gymDay.exercises.map((e) => ({
              name: e.name,
              sets: e.sets,
              repMin: e.repMin,
              repMax: e.repMax,
              timed: e.timed,
              targetKg: e.targetKg,
            }))
          : null,
      };
    });

    const totalKcal = days.reduce((t, d) => t + d.kcal, 0);
    return {
      start: ymdOf(monday),
      today: todayKey,
      goal,
      style: week.style,
      totalKcal,
      fatKg: fatKgFromKcal(totalKcal),
      sessions: week.sessions,
      coachNote: week.coachNote,
      days,
      profile: profileDto(profile),
      recovery,
      plan: trainingPlanName(week.days),
      restDay: restDayCardio(deficit ? "deficit" : "maintenance"),
    };
  }

  /** The strength engine's days for this week (gym exercises). Past weeks: only a plan that exists. */
  private async gymPlan(
    userId: string,
    monday: Date,
    create: boolean,
    opts: Parameters<WorkoutsService["getOrCreateWeek"]>[2],
  ): Promise<PlanDay[] | null> {
    if (create) return (await this.workouts.getOrCreateWeek(userId, monday, opts)).week.days;
    const row = await this.prisma.workoutPlan.findFirst({
      where: { userId, weekStart: monday },
      orderBy: { version: "desc" },
      select: { plan: true },
    });
    return row ? WeekPlanSchema.parse(row.plan).days : null;
  }

  /** Today's recovery from the health apps; a health-data problem never breaks the week. */
  private async recovery(userId: string, hard: boolean): Promise<TrainingWeekDto["recovery"]> {
    try {
      const r = (await this.health.summary(userId)).recovery;
      return r ? { score: r.score, level: r.level, advice: recoveryAdvice(r.level, hard) } : null;
    } catch (err) {
      this.logger.warn({ err }, "recovery unavailable");
      return null;
    }
  }
}

/** 2–4 rows for a gym day: its first exercises with sets × reps × kg. */
function gymSteps(day: PlanDay) {
  const rows = day.exercises.slice(0, 4).map((e) => ({
    name: e.name,
    detail: `${e.sets} × ${e.repMin}–${e.repMax}${e.timed ? " s" : ""}${e.targetKg != null ? ` · ${e.targetKg} kg` : ""}`,
  }));
  const more = day.exercises.length - rows.length;
  if (more > 0)
    rows[rows.length - 1] = {
      ...rows[rows.length - 1],
      detail: `${rows[rows.length - 1].detail} · +${more} more`,
    };
  return rows;
}

function profileDto(p: TrainingProfile): TrainingProfileDto {
  return {
    types: toTrainingTypes(p.types),
    daysPerWeek: p.daysPerWeek,
    sessionMinutes: p.sessionMinutes,
    updatedAt: p.updatedAt.toISOString(),
  };
}

function logDto(l: TrainingLog): TrainingLogDto {
  return {
    id: l.id,
    date: ymdOf(l.date),
    type: fromDbSession(l.type),
    minutes: l.minutes,
    distanceKm: l.distanceKm,
    kcal: l.kcal,
  };
}
