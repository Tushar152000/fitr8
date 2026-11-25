import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { Prisma, TrainingProfile } from "@fitr8/db";
import { weekStart } from "@fitr8/domain/dates";
import { ageFromBirthDate } from "@fitr8/domain/nutrition";
import {
  buildTrainingWeek,
  caloriePhase,
  type TrainingGoal,
  type TrainingType,
  type TrainingWeek,
  type TrainingWeekInput,
} from "@fitr8/domain/training";
import { AppError } from "../../common/errors.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { TargetsService } from "../plan/targets.service.js";
import { UsersService } from "../users/users.service.js";

const GOAL: Record<string, TrainingGoal> = {
  FAT_LOSS: "lose",
  MUSCLE_GAIN: "gain",
  RECOMPOSITION: "maintain",
};

/**
 * Bump when `buildTrainingWeek`'s output changes for the same inputs (wording, templates), so this
 * week and later ones are rebuilt once; past weeks keep what was stored. 2: "deficit" wording
 * follows the deficit flag (2026-11-26).
 */
const WEEK_RULES = 2;

export const toTrainingTypes = (types: TrainingProfile["types"]): TrainingType[] =>
  types.map((t) => t.toLowerCase() as TrainingType);

/** The plan maths (profile, latest weigh-in, goal), as `TargetsService.computePlan` returns it. */
export type ComputedPlan = Awaited<ReturnType<TargetsService["computePlan"]>>;

/**
 * What one request already knows or will need more than once, so building a week doesn't re-read
 * it: the user's local today and the plan (the planner and the strength engine both need it).
 * Both are read lazily, at most once.
 */
export interface PlanningContext {
  today: () => Promise<Date>;
  plan: () => Promise<ComputedPlan>;
}

export function planningContext(
  deps: { targets: TargetsService; users: UsersService },
  userId: string,
  today?: Date,
): PlanningContext {
  let todayP: Promise<Date> | undefined = today ? Promise.resolve(today) : undefined;
  let planP: Promise<ComputedPlan> | undefined;
  return {
    today: () => (todayP ??= deps.users.today(userId)),
    plan: () => (planP ??= deps.targets.computePlan(userId)),
  };
}

export interface PlannedWeek {
  week: TrainingWeek;
  profile: TrainingProfile;
  goal: TrainingGoal;
  weightKg: number;
  /** Eating below maintenance this week (rest-day cardio and the hard-session cap follow it). */
  deficit: boolean;
}

/**
 * Builds the user's training week (Workout tab, 16c) from their training profile and plan, and
 * keeps it in `training_weeks`. This week and later weeks are rebuilt whenever an input changes
 * (profile, goal, weight, level, logged run pace); earlier weeks stay as they were built.
 */
@Injectable()
export class TrainingPlanner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly targets: TargetsService,
    private readonly users: UsersService,
  ) {}

  profile(userId: string) {
    return this.prisma.trainingProfile.findUnique({ where: { userId } });
  }

  /** The week starting `monday`, or null when the user hasn't set up training (16b). */
  async week(
    userId: string,
    monday: Date,
    ctx: PlanningContext = planningContext({ targets: this.targets, users: this.users }, userId),
  ): Promise<PlannedWeek | null> {
    const [profile, today] = await Promise.all([this.profile(userId), ctx.today()]);
    if (!profile) return null;
    const [input, stored] = await Promise.all([
      this.inputs(userId, profile, monday, today, ctx),
      this.prisma.trainingWeek.findUnique({
        where: { userId_weekStart: { userId, weekStart: monday } },
        select: { inputsKey: true, plan: true },
      }),
    ]);
    const inputsKey = createHash("sha256")
      .update(JSON.stringify({ rules: WEEK_RULES, input }))
      .digest("hex");
    const meta = { profile, goal: input.goal, weightKg: input.weightKg, deficit: input.deficit };

    const past = monday.getTime() < weekStart(today).getTime();
    if (stored && (stored.inputsKey === inputsKey || past)) {
      return { ...meta, week: stored.plan as unknown as TrainingWeek };
    }
    const week = buildTrainingWeek(input);
    const plan = week as unknown as Prisma.InputJsonValue;
    await this.prisma.trainingWeek.upsert({
      where: { userId_weekStart: { userId, weekStart: monday } },
      create: { userId, weekStart: monday, inputsKey, plan },
      update: { inputsKey, plan },
    });
    return { ...meta, week };
  }

  /** Everything the week depends on (also hashed: a change rebuilds the week). */
  private async inputs(
    userId: string,
    profile: TrainingProfile,
    monday: Date,
    today: Date,
    ctx: PlanningContext,
  ): Promise<TrainingWeekInput> {
    const [{ plan, profile: body, metric, goal }, target, runs] = await Promise.all([
      ctx.plan(),
      this.targets.targetForDay(userId, today),
      this.prisma.trainingLog.findMany({
        where: { userId, type: "RUN", distanceKm: { not: null } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: { minutes: true, distanceKm: true },
      }),
    ]);
    if (!target) throw new AppError(404, "Finish onboarding first");
    const restricted = body.medicalFlag || ageFromBirthDate(body.birthDate, today) < 18;
    return {
      weekStart: monday,
      types: toTrainingTypes(profile.types),
      daysPerWeek: profile.daysPerWeek,
      sessionMinutes: profile.sessionMinutes,
      goal: GOAL[goal.type] ?? "maintain",
      // Same rule as the strength engine's phase (caloriePhase), so gym and rest days agree.
      deficit: !restricted && caloriePhase(target.kcal, plan.tdee) === "deficit",
      weightKg: metric.weightKg,
      experience: body.experience,
      restricted,
      runs: runs.map((r) => ({ minutes: r.minutes, distanceKm: r.distanceKm ?? 0 })),
    };
  }
}
