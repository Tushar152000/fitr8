import { Injectable } from "@nestjs/common";
import {
  MEASUREMENT_KEYS,
  type MeasurementAddInput,
  type MeasurementKey,
  type MeasurementsDto,
} from "@fitr8/contracts";
import { AppError } from "../../common/errors.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { CheckinsService } from "../progress/checkins.service.js";

/**
 * Profile / Measurements: each body measurement's newest value, and adding measurements. Rows are
 * body_metrics (owned by progress): writes go through CheckinsService.saveDay, which merges into
 * the day's row like a weigh-in and recalculates body fat.
 */
@Injectable()
export class MeasurementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checkins: CheckinsService,
  ) {}

  /** Per measurement, the newest body_metrics row that has it. 404 before onboarding. */
  async latest(userId: string): Promise<MeasurementsDto> {
    const rows = await Promise.all(MEASUREMENT_KEYS.map((key) => this.newest(userId, key)));
    // Onboarding always records a weight, so no weight means no onboarding yet.
    if (!rows[0]) throw new AppError(404, "Finish onboarding first");
    return Object.fromEntries(MEASUREMENT_KEYS.map((key, i) => [key, rows[i]])) as MeasurementsDto;
  }

  /** Saves the given measurements into today's row (with or without a weight), then the latest. */
  async add(userId: string, input: MeasurementAddInput): Promise<MeasurementsDto> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { userId: true },
    });
    if (!profile) throw new AppError(404, "Finish onboarding first");
    await this.checkins.saveDay(userId, input);
    return this.latest(userId);
  }

  private async newest(userId: string, key: MeasurementKey) {
    const row = await this.prisma.bodyMetric.findFirst({
      where: { userId, [key]: { not: null } },
      orderBy: { date: "desc" },
      select: { date: true, [key]: true } as { date: true } & Record<MeasurementKey, boolean>,
    });
    const value = row?.[key];
    return row && typeof value === "number"
      ? { value, date: row.date.toISOString().slice(0, 10) }
      : null;
  }
}
