import { Injectable } from "@nestjs/common";
import { streakDetails, weeklyWeighIns } from "@fitr8/domain/progress";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { TargetsService } from "../plan/targets.service.js";
import { UsersService } from "../users/users.service.js";
import { DashboardService } from "./dashboard.service.js";
import { HistoryService } from "./history.service.js";
import { HAS_WEIGHT, weighed } from "./weigh-ins.js";

const DAY = 86_400_000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export interface TrendPoint {
  date: string;
  weightKg: number;
  avg7: number; // mean of weigh-ins in the 7 days ending on `date`
}

/** Mean weight of weigh-ins in the 7 days ending on each weigh-in. */
export function sevenDayAverages(metrics: { date: Date; weightKg: number }[]): TrendPoint[] {
  return metrics.map((m) => {
    const from = m.date.getTime() - 6 * DAY;
    const window = metrics.filter(
      (o) => o.date.getTime() >= from && o.date.getTime() <= m.date.getTime(),
    );
    const avg7 = window.reduce((s, o) => s + o.weightKg, 0) / window.length;
    return { date: ymd(m.date), weightKg: m.weightKg, avg7: Math.round(avg7 * 10) / 10 };
  });
}

/** Mean weigh-in within [end − 6 days, end], or null with no data. */
function weekMean(metrics: { date: Date; weightKg: number }[], end: number) {
  const w = metrics.filter((m) => m.date.getTime() <= end && m.date.getTime() > end - 7 * DAY);
  return w.length ? w.reduce((s, m) => s + m.weightKg, 0) / w.length : null;
}

/** Screen 11: weigh-in trend (7-day averages) vs plan, and the last 7 days' stats. */
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly targets: TargetsService,
    private readonly users: UsersService,
    private readonly dashboard: DashboardService,
    private readonly history: HistoryService,
  ) {}

  /**
   * GET /progress for the user's local today: only what the Progress screen and card read, plus
   * the stat tiles (weight change since the plan's start, % of logged days on target, streaks) and the last 8 weeks' weigh-ins.
   */
  async get(userId: string) {
    const today = await this.users.today(userId);
    const [p, days, onTarget] = await Promise.all([
      this.getProgress(userId, today),
      this.dashboard.loggedDays(userId, undefined, today),
      this.history.onTarget(userId, today),
    ]);
    const { current, longest } = streakDetails(days, ymd(today));
    return {
      ...p,
      latest: p.latest && { weightKg: p.latest.weightKg, waistCm: p.latest.waistCm },
      target: p.target && { kcal: p.target.kcal },
      weightChangeKg: p.latest
        ? Math.round((p.latest.weightKg - p.plan.startWeightKg) * 10) / 10
        : null,
      streak: { current, longest },
      onTarget,
      // The newest 120 weigh-ins (at most one a day) always cover the 8 weeks.
      weeks: weeklyWeighIns(p.points, ymd(today), 8),
    };
  }

  /** The coach's view: the same, with the latest measurements and the target's reason. */
  async details(userId: string) {
    return this.getProgress(userId, await this.users.today(userId));
  }

  /** Weigh-ins (the newest 120, oldest first), plan line, weekly trend vs plan, last-7-day intake. */
  async getProgress(userId: string, today: Date) {
    const since7 = new Date(today.getTime() - 6 * DAY);
    const [newestFirst, { plan, goal }, target, meals] = await Promise.all([
      this.prisma.bodyMetric.findMany({
        where: { userId, ...HAS_WEIGHT },
        orderBy: { date: "desc" },
        take: 120,
        select: {
          date: true,
          weightKg: true,
          waistCm: true,
          neckCm: true,
          hipCm: true,
          bodyFatPct: true,
        },
      }),
      this.targets.computePlan(userId),
      this.targets.currentTarget(userId, today),
      this.prisma.mealLog.groupBy({
        by: ["date"],
        where: { userId, status: "CONFIRMED", date: { gte: since7, lte: today } },
        _sum: { totalKcal: true },
      }),
    ]);
    const metrics = weighed(newestFirst.reverse());

    const points = sevenDayAverages(metrics);
    const thisWeek = weekMean(metrics, today.getTime());
    const lastWeek = weekMean(metrics, today.getTime() - 7 * DAY);
    const weeklyChange = thisWeek != null && lastWeek != null ? thisWeek - lastWeek : null;

    const daysLogged = meals.length;
    const avgIntake = daysLogged
      ? meals.reduce((s, m) => s + (m._sum.totalKcal ?? 0), 0) / daysLogged
      : null;

    return {
      points,
      latest: metrics.at(-1) ?? null,
      plan: {
        startDate: ymd(goal.startDate),
        targetDate: ymd(goal.targetDate),
        startWeightKg: goal.startWeightKg,
        targetWeightKg: plan.targetWeightKg,
        weeklyChangeKg: Math.round(plan.weeklyChangeKg * 100) / 100,
        goalType: goal.type,
      },
      weeklyChange: weeklyChange == null ? null : Math.round(weeklyChange * 100) / 100,
      target: target && {
        kcal: target.kcal,
        reason: target.reason,
        effectiveFrom: ymd(target.effectiveFrom),
      },
      avgIntake: avgIntake == null ? null : Math.round(avgIntake),
      daysLogged,
    };
  }
}

export type Progress = Awaited<ReturnType<ProgressService["getProgress"]>>;
