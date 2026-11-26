import { Injectable } from "@nestjs/common";
import type { HistoryDayDto } from "@fitr8/contracts";
import { localYmd, parseDateOnly } from "@fitr8/domain/dates";
import { mealTitle } from "@fitr8/domain/format";
import { monthCalendar, onTargetShare, trackingStart } from "@fitr8/domain/progress";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { TargetsService } from "../plan/targets.service.js";
import { UsersService } from "../users/users.service.js";

const DAY = 86_400_000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly targets: TargetsService,
    private readonly users: UsersService,
  ) {}

  /**
   * Design 12: daily totals for the last `days` days ending `today` (a local-date UTC midnight),
   * with each day's target and confirmed meals. Averages use full days only (today is excluded).
   */
  async getHistory(userId: string, days: 7 | 30, today: Date) {
    const from = new Date(today.getTime() - (days - 1) * DAY);
    const [meals, { kcalOn: targetOn }] = await Promise.all([
      this.prisma.mealLog.findMany({
        where: { userId, status: "CONFIRMED", date: { gte: from, lte: today } },
        select: {
          id: true,
          date: true,
          mealType: true,
          inputText: true,
          totalKcal: true,
          totalProtein: true,
          createdAt: true,
          items: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      // Days before the first plan (backfilled before onboarding) use that first plan, like the dashboard.
      this.targets.kcalForDays(userId),
    ]);

    const result: HistoryDayDto[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(from.getTime() + i * DAY);
      const key = ymd(date);
      const dayMeals = meals.filter((m) => ymd(m.date) === key);
      result.push({
        date: key,
        kcal: Math.round(dayMeals.reduce((s, m) => s + m.totalKcal, 0)),
        proteinG: Math.round(dayMeals.reduce((s, m) => s + m.totalProtein, 0)),
        target: targetOn(date),
        logged: dayMeals.length > 0,
        isToday: key === ymd(today),
        meals: dayMeals.map((m) => ({
          id: m.id,
          mealType: m.mealType,
          title: mealTitle(
            m.items.map((it) => it.name),
            m.inputText ?? "Meal",
          ),
          kcal: Math.round(m.totalKcal),
          createdAt: m.createdAt.toISOString(),
        })),
      });
    }

    const full = result.filter((d) => d.logged && !d.isToday);
    return {
      days: result,
      daysLogged: result.filter((d) => d.logged).length,
      avgKcalFullDays: full.length
        ? Math.round(full.reduce((s, d) => s + d.kcal, 0) / full.length)
        : null,
    };
  }

  /**
   * GET /calendar?month=YYYY-MM (default this month): each day on/over target, missed or none,
   * and the "20 of 22 days logged · 16 on target" summary. Rules: `@fitr8/domain/progress`.
   */
  async month(userId: string, month?: string) {
    const timezone = await this.users.timezone(userId);
    const today = localYmd(timezone, new Date());
    const m = month ?? today.slice(0, 7);
    const first = parseDateOnly(`${m}-01`);
    const next = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
    const [days, timeline] = await Promise.all([
      this.dayKcal(userId, { gte: first, lt: next }),
      this.targets.kcalForDays(userId),
    ]);
    const start = await this.startDate(userId, timezone, timeline.firstPlanAt);
    const eaten = new Map(
      days.map((d) => [ymd(d.date), { kcal: d.kcal, target: timeline.kcalOn(d.date) }]),
    );
    return monthCalendar({ month: m, today, startDate: start, eaten });
  }

  /** Share of logged days (before today) on target, ever: the Progress "On target" tile. */
  async onTarget(userId: string, today: Date) {
    const [days, { kcalOn }] = await Promise.all([
      this.dayKcal(userId, { lt: today }),
      this.targets.kcalForDays(userId),
    ]);
    return onTargetShare(days.map((d) => ({ kcal: d.kcal, target: kcalOn(d.date) })));
  }

  /** When the user started tracking (local date): the earlier of their first plan and first meal. */
  async startDate(userId: string, timezone: string, firstPlanAt?: Date | null) {
    const [planAt, firstMeal] = await Promise.all([
      firstPlanAt !== undefined
        ? firstPlanAt
        : this.targets.kcalForDays(userId).then((t) => t.firstPlanAt),
      this.prisma.mealLog.findFirst({
        where: { userId, status: "CONFIRMED" },
        orderBy: { date: "asc" },
        select: { date: true },
      }),
    ]);
    return trackingStart(planAt && localYmd(timezone, planAt), firstMeal && ymd(firstMeal.date));
  }

  /** Confirmed kcal per logged day in a date range. */
  private async dayKcal(userId: string, date: { gte?: Date; lt: Date }): Promise<DayKcal[]> {
    const rows = await this.prisma.mealLog.groupBy({
      by: ["date"],
      where: { userId, status: "CONFIRMED", date },
      _sum: { totalKcal: true },
      orderBy: { date: "asc" },
    });
    return rows.map((r) => ({ date: r.date, kcal: r._sum.totalKcal ?? 0 }));
  }
}

/** Confirmed kcal per logged day, oldest first. */
type DayKcal = { date: Date; kcal: number };

export type History = Awaited<ReturnType<HistoryService["getHistory"]>>;
