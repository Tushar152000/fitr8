import { Injectable } from "@nestjs/common";
import type { CheckinInput } from "@fitr8/contracts";
import { notFound } from "../../common/errors.js";
import { localDate, parseDateOnly } from "@fitr8/domain/dates";
import { mergeBodyMetrics, withoutWeight, type BodyMeasures } from "@fitr8/domain/measurements";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { HAS_WEIGHT, weighed } from "./weigh-ins.js";

const VALUES = {
  weightKg: true,
  waistCm: true,
  neckCm: true,
  hipCm: true,
  chestCm: true,
  armCm: true,
  bodyFatPct: true,
} as const;

/**
 * Weigh-ins and body measurements (body_metrics). One row per user per date: a weigh-in
 * (POST /checkins) and Profile / Measurements (POST /measurements) both merge into that day's row
 * (domain `mergeBodyMetrics`), so neither wipes what the other saved. Body fat is recalculated.
 */
@Injectable()
export class CheckinsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs a weigh-in. The weekly adjustment rules (PRD section 8) are added in week 5;
   * for now this stores the metric so trends can be charted.
   */
  async logWeighIn(userId: string, { date: ymd, ...input }: CheckinInput) {
    const metric = await this.saveDay(userId, input, ymd);
    return { metric: { ...metric, weightKg: input.weightKg } };
  }

  /**
   * Merges measurements into the day's row (`ymd`, default today in the user's timezone) and
   * returns the saved row.
   */
  async saveDay(userId: string, input: Partial<BodyMeasures>, ymd?: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { sex: true, heightCm: true, timezone: true },
    });
    const date = ymd ? parseDateOnly(ymd) : localDate(profile?.timezone);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.bodyMetric.findUnique({
        where: { userId_date: { userId, date } },
        select: VALUES,
      });
      const data = mergeBodyMetrics(existing, input, profile);
      return tx.bodyMetric.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date, ...data },
        update: data,
      });
    });
  }

  /**
   * Corrects the weigh-in of `ymd` (PATCH /checkins/:date). 404 when the caller has no weigh-in that
   * day. Only the weight changes; the day's other measurements and body fat are merged as on save.
   */
  async updateWeighIn(userId: string, ymd: string, weightKg: number) {
    await this.findWeighIn(userId, ymd);
    const metric = await this.saveDay(userId, { weightKg }, ymd);
    return { metric: { ...metric, weightKg } };
  }

  /**
   * Deletes the weigh-in of `ymd` (DELETE /checkins/:date): clears the weight when the day's row also
   * holds other measurements, otherwise deletes the row (domain `withoutWeight`). 404 when none.
   */
  async removeWeighIn(userId: string, ymd: string) {
    const date = parseDateOnly(ymd);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.bodyMetric.findFirst({
        where: { userId, date, ...HAS_WEIGHT },
        select: VALUES,
      });
      if (!existing) throw notFound("Weigh-in");
      const rest = withoutWeight(existing);
      if (rest)
        await tx.bodyMetric.update({ where: { userId_date: { userId, date } }, data: rest });
      else await tx.bodyMetric.delete({ where: { userId_date: { userId, date } } });
    });
  }

  private async findWeighIn(userId: string, ymd: string) {
    const row = await this.prisma.bodyMetric.findFirst({
      where: { userId, date: parseDateOnly(ymd), ...HAS_WEIGHT },
      select: { id: true },
    });
    if (!row) throw notFound("Weigh-in");
    return row;
  }

  /** Weigh-ins only (rows with a weight), oldest first. */
  async list(userId: string) {
    const rows = await this.prisma.bodyMetric.findMany({
      where: { userId, ...HAS_WEIGHT },
      orderBy: { date: "asc" },
      take: 120,
    });
    return { metrics: weighed(rows) };
  }
}
