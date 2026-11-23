import { Injectable } from "@nestjs/common";
import type {
  HealthConnectInput,
  HealthConnectionDto,
  HealthDailyInput,
  HealthPlatform,
  HealthSampleInput,
  HealthStatusDto,
  HealthSummaryDto,
  HealthSyncInput,
  HealthSyncResultDto,
} from "@fitr8/contracts";
import type { Prisma } from "@fitr8/db";
import { localYmd, parseDateOnly, ymdOf, zonedMidnight } from "@fitr8/domain/dates";
import {
  baseline,
  BASELINE_DAYS,
  bmiFrom,
  isPlausible,
  nightWindow,
  recoveryScore,
  sleepSummary,
  STEPS_GOAL,
} from "@fitr8/domain/health";
import { AppError } from "../../common/errors.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { TargetsService } from "../plan/targets.service.js";
import { UsersService } from "../users/users.service.js";

const DAY_MS = 86_400_000;
const addDays = (ymd: string, n: number) =>
  ymdOf(new Date(parseDateOnly(ymd).getTime() + n * DAY_MS));

/** How far back the summary may look (and the oldest record a sync may send). */
const MAX_DAYS_BACK = 400;

type Row = {
  type: string;
  startAt: Date;
  endAt: Date;
  value: number | null;
  data: Prisma.JsonValue;
};

/**
 * Apple Health / Health Connect data (docs/HEALTH.md). Owns `health_connections`, `health_samples`
 * and `health_daily`. Stores every record the phone sends; computes the six summaries the app shows.
 */
@Injectable()
export class HealthDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly targets: TargetsService,
  ) {}

  /** GET /health-data: connected platforms and how many records are stored. */
  async status(userId: string): Promise<HealthStatusDto> {
    const [connections, samples] = await Promise.all([
      this.prisma.healthConnection.findMany({ where: { userId }, orderBy: { connectedAt: "asc" } }),
      this.prisma.healthSample.count({ where: { userId } }),
    ]);
    return { connections: connections.map(connectionDto), samples };
  }

  /** POST /health-data/connect: the user allowed access on the phone (repeat-safe). */
  async connect(userId: string, input: HealthConnectInput): Promise<HealthConnectionDto> {
    const permissions = [...new Set(input.permissions)];
    const row = await this.prisma.healthConnection.upsert({
      where: { userId_platform: { userId, platform: input.platform } },
      create: { userId, platform: input.platform, permissions },
      update: { permissions },
    });
    return connectionDto(row);
  }

  /**
   * DELETE /health-data/connections/:platform: stop syncing. With `deleteData` every record from
   * that platform is deleted too. 404 if it wasn't connected and there is nothing to delete.
   */
  async disconnect(userId: string, platform: HealthPlatform, deleteData: boolean) {
    const counts = await this.prisma.$transaction(async (tx) => {
      const removed = await tx.healthConnection.deleteMany({ where: { userId, platform } });
      if (!deleteData) return { removed: removed.count, data: 0 };
      const samples = await tx.healthSample.deleteMany({ where: { userId, platform } });
      const daily = await tx.healthDaily.deleteMany({ where: { userId, platform } });
      return { removed: removed.count, data: samples.count + daily.count };
    });
    if (!counts.removed && !counts.data) throw new AppError(404, "That health app isn't connected");
  }

  /**
   * POST /health-data/sync: upserts a batch of records and daily totals. Idempotent: the phone
   * re-reads an overlap every time, and a record seen again is updated in place (by its platform id).
   */
  async sync(
    userId: string,
    input: HealthSyncInput,
    now = new Date(),
  ): Promise<HealthSyncResultDto> {
    const connection = await this.prisma.healthConnection.findUnique({
      where: { userId_platform: { userId, platform: input.platform } },
      select: { userId: true },
    });
    if (!connection) throw new AppError(409, "Connect the health app first");

    const oldest = now.getTime() - MAX_DAYS_BACK * DAY_MS;
    const future = now.getTime() + DAY_MS;
    const tooOld = input.samples.find(
      (s) => Date.parse(s.start) < oldest || Date.parse(s.start) > future,
    );
    if (tooOld) throw new AppError(400, `Records must be from the last ${MAX_DAYS_BACK} days`);

    const samples = await this.upsertSamples(userId, input.platform, input.samples);
    const daily = await this.upsertDaily(userId, input.platform, input.daily);
    const lastSyncAt = now;
    await this.prisma.healthConnection.update({
      where: { userId_platform: { userId, platform: input.platform } },
      data: { lastSyncAt },
    });
    return { samples, daily, lastSyncAt: lastSyncAt.toISOString() };
  }

  /** One statement per batch; duplicates in the batch collapse to the last one sent. */
  private async upsertSamples(
    userId: string,
    platform: HealthPlatform,
    input: HealthSampleInput[],
  ) {
    if (!input.length) return 0;
    const byId = new Map<string, HealthSampleInput>();
    for (const s of input) byId.set(s.id, s);
    const rows = [...byId.values()].map((s) => ({
      externalId: s.id,
      type: s.type,
      // UTC wall time: the columns are timestamp without time zone, read back as UTC by Prisma.
      startAt: new Date(s.start).toISOString(),
      endAt: new Date(s.end).toISOString(),
      value: s.value ?? null,
      unit: s.unit ?? null,
      origin: s.origin ?? null,
      device: s.device ?? null,
      data: s.data ?? null,
    }));
    return this.prisma.$executeRaw`
      INSERT INTO "health_samples"
        ("userId", "platform", "externalId", "type", "startAt", "endAt", "value", "unit", "origin", "device", "data", "updatedAt")
      SELECT ${userId}, ${platform}::"HealthPlatform", x."externalId", x."type",
             x."startAt" AT TIME ZONE 'UTC', x."endAt" AT TIME ZONE 'UTC',
             x."value", x."unit", x."origin", x."device", x."data", now()
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(
        "externalId" text, "type" text, "startAt" timestamptz, "endAt" timestamptz,
        "value" double precision, "unit" text, "origin" text, "device" text, "data" jsonb)
      ON CONFLICT ("userId", "platform", "externalId") DO UPDATE SET
        "type" = EXCLUDED."type", "startAt" = EXCLUDED."startAt", "endAt" = EXCLUDED."endAt",
        "value" = EXCLUDED."value", "unit" = EXCLUDED."unit", "origin" = EXCLUDED."origin",
        "device" = EXCLUDED."device", "data" = EXCLUDED."data", "updatedAt" = now()
      WHERE ("health_samples"."type", "health_samples"."startAt", "health_samples"."endAt",
             "health_samples"."value", "health_samples"."unit", "health_samples"."origin",
             "health_samples"."device", "health_samples"."data")
        IS DISTINCT FROM
            (EXCLUDED."type", EXCLUDED."startAt", EXCLUDED."endAt", EXCLUDED."value", EXCLUDED."unit",
             EXCLUDED."origin", EXCLUDED."device", EXCLUDED."data")`;
  }

  private async upsertDaily(userId: string, platform: HealthPlatform, input: HealthDailyInput[]) {
    if (!input.length) return 0;
    const byKey = new Map<string, HealthDailyInput>();
    for (const d of input) {
      const parsed = parseDateOnly(d.date);
      // "2026-02-31" parses (as 3 March) in JavaScript; the round trip catches it.
      if (Number.isNaN(parsed.getTime()) || ymdOf(parsed) !== d.date)
        throw new AppError(400, "Use a real date (YYYY-MM-DD)");
      byKey.set(`${d.date}|${d.metric}`, d);
    }
    const rows = [...byKey.values()];
    return this.prisma.$executeRaw`
      INSERT INTO "health_daily" ("userId", "platform", "date", "metric", "value", "updatedAt")
      SELECT ${userId}, ${platform}::"HealthPlatform", x."date", x."metric", x."value", now()
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x("date" date, "metric" text, "value" double precision)
      ON CONFLICT ("userId", "platform", "date", "metric") DO UPDATE SET
        "value" = EXCLUDED."value", "updatedAt" = now()
      WHERE "health_daily"."value" IS DISTINCT FROM EXCLUDED."value"`;
  }

  /**
   * GET /health-data/summary?date=: steps, heart rate, BMI, SpO2, sleep and recovery for one local
   * day (default today). Each is null when there's no data for it.
   */
  async summary(userId: string, ymd?: string): Promise<HealthSummaryDto> {
    const tz = await this.users.timezone(userId);
    const today = localYmd(tz, new Date());
    const date = ymd ?? today;
    const parsed = parseDateOnly(date);
    if (Number.isNaN(parsed.getTime()) || ymdOf(parsed) !== date)
      throw new AppError(400, "Use a real date (YYYY-MM-DD)");
    if (date > today) throw new AppError(400, "That day hasn't happened yet");
    if (parsed.getTime() < parseDateOnly(today).getTime() - MAX_DAYS_BACK * DAY_MS)
      throw new AppError(400, `Pick a day in the last ${MAX_DAYS_BACK} days`);

    const dayStart = zonedMidnight(date, tz);
    const dayEnd = zonedMidnight(addDays(date, 1), tz);
    const night = nightWindow(dayStart);
    const historyFrom = zonedMidnight(addDays(date, -BASELINE_DAYS), tz);

    const [connections, steps, rows, history, body, healthWeight, healthHeight] = await Promise.all(
      [
        this.prisma.healthConnection.findMany({ where: { userId }, select: { lastSyncAt: true } }),
        this.prisma.healthDaily.findMany({
          where: {
            userId,
            metric: "steps",
            date: { gte: parseDateOnly(addDays(date, -6)), lte: parsed },
          },
          select: { date: true, value: true },
        }),
        // Today's readings, and last night's sleep.
        this.prisma.healthSample.findMany({
          where: {
            userId,
            OR: [
              {
                type: {
                  in: [
                    "heart_rate",
                    "resting_heart_rate",
                    "oxygen_saturation",
                    "hrv_rmssd",
                    "hrv_sdnn",
                  ],
                },
                startAt: { gte: night.from, lt: dayEnd },
              },
              {
                type: { in: ["sleep_session", "sleep_stage"] },
                endAt: { gt: night.from, lte: night.to },
              },
            ],
          },
          select: { type: true, startAt: true, endAt: true, value: true, data: true },
          orderBy: { startAt: "asc" },
        }),
        // The previous days, for the user's usual resting heart rate and HRV.
        this.prisma.healthSample.findMany({
          where: {
            userId,
            type: { in: ["resting_heart_rate", "hrv_rmssd", "hrv_sdnn"] },
            startAt: { gte: historyFrom, lt: dayStart },
          },
          select: { type: true, startAt: true, value: true },
          orderBy: { startAt: "desc" },
        }),
        this.targets.bodyBasics(userId, parsed),
        this.prisma.healthSample.findFirst({
          where: { userId, type: "weight", startAt: { lt: dayEnd } },
          orderBy: { startAt: "desc" },
          select: { value: true, startAt: true },
        }),
        this.prisma.healthSample.findFirst({
          where: { userId, type: "height", startAt: { lt: dayEnd } },
          orderBy: { startAt: "desc" },
          select: { value: true },
        }),
      ],
    );

    const lastSyncAt = connections.reduce<Date | null>(
      (max, c) => (c.lastSyncAt && (!max || c.lastSyncAt > max) ? c.lastSyncAt : max),
      null,
    );

    // Steps: the platform's de-duplicated daily total (the highest if two phones sent one).
    const stepsByDate = new Map<string, number>();
    for (const s of steps) {
      const key = ymdOf(s.date);
      if (isPlausible("steps", s.value))
        stepsByDate.set(key, Math.max(stepsByDate.get(key) ?? 0, s.value));
    }
    const todaySteps = stepsByDate.get(date);
    const stepsDto =
      todaySteps == null && !stepsByDate.size
        ? null
        : {
            count: Math.round(todaySteps ?? 0),
            goal: STEPS_GOAL,
            week: Array.from({ length: 7 }, (_, i) => {
              const d = addDays(date, i - 6);
              const v = stepsByDate.get(d);
              return { date: d, count: v == null ? null : Math.round(v) };
            }),
          };

    const inDay = (r: Row) => r.startAt >= dayStart && r.startAt < dayEnd;
    const valuesOf = (type: string, rs: Row[] = rows) =>
      rs.filter((r) => r.type === type && inDay(r) && isPlausible(type, r.value));

    // Heart rate
    const hr = valuesOf("heart_rate");
    const resting = valuesOf("resting_heart_rate");
    const restingNow = resting.length ? resting[resting.length - 1].value! : null;
    const heartRate =
      hr.length || resting.length
        ? {
            avg: hr.length ? Math.round(hr.reduce((t, r) => t + r.value!, 0) / hr.length) : null,
            min: hr.length ? Math.round(Math.min(...hr.map((r) => r.value!))) : null,
            max: hr.length ? Math.round(Math.max(...hr.map((r) => r.value!))) : null,
            resting: restingNow == null ? null : Math.round(restingNow),
            latest: hr.length
              ? {
                  bpm: Math.round(hr[hr.length - 1].value!),
                  at: hr[hr.length - 1].startAt.toISOString(),
                }
              : null,
          }
        : null;

    // SpO2
    const ox = valuesOf("oxygen_saturation");
    const spo2 = ox.length
      ? {
          avg: Math.round((ox.reduce((t, r) => t + r.value!, 0) / ox.length) * 10) / 10,
          min: Math.round(Math.min(...ox.map((r) => r.value!)) * 10) / 10,
          latest: Math.round(ox[ox.length - 1].value! * 10) / 10,
          at: ox[ox.length - 1].startAt.toISOString(),
        }
      : null;

    // BMI: the newer of a health-app weight and a FITR8 weigh-in, the profile height.
    const fitr8At = body.weightDate ? zonedMidnight(ymdOf(body.weightDate), tz) : null;
    const useHealth =
      healthWeight?.value != null &&
      isPlausible("weight", healthWeight.value) &&
      (!fitr8At || healthWeight.startAt >= fitr8At);
    const weightKg = useHealth ? healthWeight!.value! : body.weightKg;
    const heightCm = body.heightCm ?? healthHeight?.value ?? null;
    const bmiValue = bmiFrom(weightKg, heightCm);
    const bmi =
      bmiValue && weightKg != null && heightCm != null
        ? {
            ...bmiValue,
            weightKg: Math.round(weightKg * 10) / 10,
            heightCm: Math.round(heightCm),
            weightFrom: useHealth ? ("health" as const) : ("fitr8" as const),
          }
        : null;

    // Sleep (the night that ended on this day)
    const sleepRows = rows.filter((r) => r.type === "sleep_session" || r.type === "sleep_stage");
    const night0 = sleepSummary({
      sessions: sleepRows
        .filter((r) => r.type === "sleep_session")
        .map((r) => ({ start: r.startAt, end: r.endAt })),
      stages: sleepRows
        .filter((r) => r.type === "sleep_stage")
        .map((r) => ({ start: r.startAt, end: r.endAt, stage: stageOf(r.data) })),
    });
    const sleep = night0
      ? {
          asleepMinutes: night0.asleepMinutes,
          inBedMinutes: night0.inBedMinutes,
          start: night0.start.toISOString(),
          end: night0.end.toISOString(),
          deepMinutes: night0.deepMinutes,
          remMinutes: night0.remMinutes,
          lightMinutes: night0.lightMinutes,
          awakeMinutes: night0.awakeMinutes,
        }
      : null;

    // Recovery: sleep, resting HR and HRV against the user's own previous days.
    const perDay = (type: string) => {
      const days = new Map<string, number[]>();
      for (const r of history) {
        if (r.type !== type || !isPlausible(type, r.value)) continue;
        const d = localYmd(tz, r.startAt);
        days.set(d, [...(days.get(d) ?? []), r.value!]);
      }
      return [...days.values()].map((v) => v.reduce((t, x) => t + x, 0) / v.length);
    };
    // HRV is measured overnight: last night counts for today.
    const hrvToday = (type: string) => {
      const v = rows.filter(
        (r) => r.type === type && r.startAt >= night.from && isPlausible(type, r.value),
      );
      return v.length ? v.reduce((t, r) => t + r.value!, 0) / v.length : null;
    };
    const hrvType = hrvToday("hrv_rmssd") != null ? "hrv_rmssd" : "hrv_sdnn";
    const recovery = recoveryScore({
      sleepMinutes: sleep?.asleepMinutes ?? null,
      restingHr: restingNow,
      restingHrBaseline: baseline(perDay("resting_heart_rate")),
      hrv: hrvToday(hrvType),
      hrvBaseline: baseline(perDay(hrvType)),
    });

    return {
      date,
      connected: connections.length > 0,
      lastSyncAt: lastSyncAt?.toISOString() ?? null,
      steps: stepsDto,
      heartRate,
      bmi,
      spo2,
      sleep,
      recovery,
    };
  }
}

function connectionDto(row: {
  platform: HealthPlatform;
  connectedAt: Date;
  lastSyncAt: Date | null;
  permissions: string[];
}): HealthConnectionDto {
  return {
    platform: row.platform,
    connectedAt: row.connectedAt.toISOString(),
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    permissions: row.permissions,
  };
}

/** A stored sleep stage ("deep", "rem" …); unknown or missing counts as plain "asleep". */
function stageOf(data: Prisma.JsonValue): string {
  const stage =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>).stage
      : null;
  return typeof stage === "string" ? stage : "asleep";
}
