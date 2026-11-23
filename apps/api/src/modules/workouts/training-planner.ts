import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { Prisma, TrainingProfile } from "@fitr8/db";
import { weekStart } from "@fitr8/domain/dates";
import { ageFromBirthDate } from "@fitr8/domain/nutrition";
import {
  buildTrainingWeek,
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

export const toTrainingTypes = (types: TrainingProfile["types"]): TrainingType[] =>
  types.map((t) => t.toLowerCase() as TrainingType);

export interface PlannedWeek {
  week: TrainingWeek;
  profile: TrainingProfile;
  goal: TrainingGoal;
  weightKg: number;
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
  async week(userId: string, monday: Date): Promise<PlannedWeek | null> {
    const profile = await this.profile(userId);
    if (!profile) return null;
    const today = await this.users.today(userId);
    const input = await this.inputs(userId, profile, monday, today);
    const inputsKey = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const meta = { profile, goal: input.goal, weightKg: input.weightKg };

    const stored = await this.prisma.trainingWeek.findUnique({
      where: { userId_weekStart: { userId, weekStart: monday } },
    });
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
  ): Promise<TrainingWeekInput> {
    const [{ plan, profile: body, metric, goal }, target, runs] = await Promise.all([
      this.targets.computePlan(userId),
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
      deficit: !restricted && target.kcal < plan.tdee * 0.95,
      weightKg: metric.weightKg,
      experience: body.experience,
      restricted,
      runs: runs.map((r) => ({ minutes: r.minutes, distanceKm: r.distanceKm ?? 0 })),
    };
  }
}
