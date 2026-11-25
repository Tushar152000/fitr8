import { Injectable } from "@nestjs/common";
import type { PlanName } from "@fitr8/contracts";
import { localDate, startOfLocalDay } from "@fitr8/domain/dates";
import { AppError } from "../../common/errors.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { BillingService } from "../billing/billing.service.js";
import { UsersService } from "../users/users.service.js";
import { proRequired } from "../billing/pro-required.js";

/** Typed meals are free; this only stops runaway use. Not shown to users. */
const TEXT_DAILY_CAP = 60;

/** The user's local midnight, and the next one (when today's scans reset). */
function dayStart(tz: string) {
  const since = startOfLocalDay(tz);
  // 26 h later is always inside the next local day, even across a DST change.
  const resetsAt = startOfLocalDay(tz, new Date(since.getTime() + 26 * 60 * 60 * 1000));
  return { since, resetsAt };
}

function usageOf(used: number, limit: number, resetsAt: Date, plan: PlanName) {
  return {
    used,
    limit,
    left: Math.max(0, limit - used),
    resetsAt: resetsAt.toISOString(),
    plan,
  };
}

/** Per-user AI quotas, counted from AiCall rows within the user's local day (design 9c); limits by plan. */
@Injectable()
export class ScanQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly billing: BillingService,
  ) {}

  /**
   * GET /usage: photo scans used today, plus meals typed today and this month. One timezone
   * read, then the plan and every count in parallel.
   */
  async usage(userId: string) {
    const tz = await this.users.timezone(userId);
    const { since, resetsAt } = dayStart(tz);
    const [{ plan, scans: limit }, used, typedMeals] = await Promise.all([
      this.billing.limits(userId),
      this.scansSince(userId, since),
      this.typedMealsOn(userId, localDate(tz)),
    ]);
    return { ...usageOf(used, limit, resetsAt, plan), typedMeals };
  }

  /**
   * Photo scans used today (local day). Only successful photo/label reads of real food count:
   * typed meals, "usuals", not-food results and our own failures never do.
   */
  async scanUsage(userId: string) {
    const tz = await this.users.timezone(userId);
    const { since, resetsAt } = dayStart(tz);
    const [{ plan, scans: limit }, used] = await Promise.all([
      this.billing.limits(userId),
      this.scansSince(userId, since),
    ]);
    return usageOf(used, limit, resetsAt, plan);
  }

  /**
   * Throws 402 (Premium) when photo scans aren't in the user's plan, or 429 with the usage in
   * `details` (for the 9c sheet) when today's scans are used up.
   */
  async assertCanScanPhoto(userId: string) {
    const usage = await this.scanUsage(userId);
    if (usage.limit === 0) {
      throw proRequired("photo_scan", "Scanning food with a photo is part of FITR8 Premium.");
    }
    if (usage.left <= 0) {
      throw new AppError(
        429,
        `You've used today's ${usage.limit} photo scans. They reset at midnight.`,
        usage,
      );
    }
    return usage;
  }

  /** Meals logged by typing today and this calendar month (the user's local dates). */
  async typedMeals(userId: string) {
    return this.typedMealsOn(userId, await this.users.today(userId));
  }

  async assertWithinTextCap(userId: string) {
    const { since } = dayStart(await this.users.timezone(userId));
    const count = await this.prisma.aiCall.count({
      where: { userId, type: "MEAL_TEXT", createdAt: { gte: since } },
    });
    if (count >= TEXT_DAILY_CAP) {
      throw new AppError(429, "That's a lot of typed meals for one day. Try again tomorrow.");
    }
  }

  private scansSince(userId: string, since: Date) {
    return this.prisma.aiCall.count({
      where: { userId, countsAsScan: true, createdAt: { gte: since } },
    });
  }

  private async typedMealsOn(userId: string, today: Date) {
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const where = { userId, source: "TEXT" as const };
    const [todayCount, thisMonth] = await Promise.all([
      this.prisma.mealLog.count({ where: { ...where, date: today } }),
      this.prisma.mealLog.count({ where: { ...where, date: { gte: monthStart, lte: today } } }),
    ]);
    return { today: todayCount, thisMonth };
  }
}

export type ScanUsage = Awaited<ReturnType<ScanQuotaService["scanUsage"]>>;
