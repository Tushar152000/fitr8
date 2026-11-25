import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, onboard, type TestApp } from "./support/app.js";

/**
 * Profile / Measurements: GET /api/measurements (newest value per measurement) and POST (add
 * measurements to today's row, with or without a weight). Also: every weight reader ignores rows
 * without a weight, and a same-day weigh-in merges instead of wiping.
 */
describe("measurements", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("requires sign-in", async () => {
    await t.http().get("/api/measurements").expect(401);
    await t.http().post("/api/measurements").send({ chestCm: 100 }).expect(401);
  });

  it("404s before onboarding", async () => {
    const { agent } = await t.signIn();
    await agent.get("/api/measurements").expect(404, { error: "Finish onboarding first" });
    await agent
      .post("/api/measurements")
      .send({ chestCm: 100 })
      .expect(404, { error: "Finish onboarding first" });
  });

  it("validates: at least one measurement, sensible ranges, body fat is never typed", async () => {
    const { agent } = await t.signIn();
    await onboard(agent);
    await agent.post("/api/measurements").send({}).expect(400);
    // Unknown keys are dropped, so body fat alone is "nothing to add".
    await agent.post("/api/measurements").send({ bodyFatPct: 18 }).expect(400);
    for (const bad of [
      { chestCm: 49 },
      { chestCm: 201 },
      { armCm: 14 },
      { armCm: 71 },
      { neckCm: 19 },
      { weightKg: 251 },
      { waistCm: 39 },
      { hipCm: 201 },
      { waistCm: "90" },
    ]) {
      await agent.post("/api/measurements").send(bad).expect(400);
    }
  });

  it("returns each measurement's newest value and day, from whichever row has it", async () => {
    const { agent, userId } = await t.signIn();
    await onboard(agent);
    const stranger = await t.signIn();
    await onboard(stranger.agent);
    await stranger.agent
      .post("/api/checkins")
      .send({ weightKg: 99, waistCm: 120, neckCm: 45 })
      .expect(201);

    const first = await agent.get("/api/measurements").expect(200);
    const today = first.body.weightKg.date as string;
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.body).toEqual({
      weightKg: { value: 82, date: today },
      bodyFatPct: null,
      waistCm: null,
      chestCm: null,
      hipCm: null,
      armCm: null,
      neckCm: null,
    });

    // Older rows with circumferences, newer weigh-ins without them.
    await t.prisma.bodyMetric.createMany({
      data: [
        {
          userId,
          date: new Date("2026-01-05"),
          weightKg: 85,
          waistCm: 92,
          chestCm: 104,
          hipCm: 101,
          armCm: 34,
          bodyFatPct: 22.5,
        },
        { userId, date: new Date("2026-01-12"), weightKg: 84, waistCm: 90, armCm: 34.5 },
      ],
    });
    const res = await agent.get("/api/measurements").expect(200);
    expect(res.body).toEqual({
      weightKg: { value: 82, date: today },
      bodyFatPct: { value: 22.5, date: "2026-01-05" },
      waistCm: { value: 90, date: "2026-01-12" },
      chestCm: { value: 104, date: "2026-01-05" },
      hipCm: { value: 101, date: "2026-01-05" },
      armCm: { value: 34.5, date: "2026-01-12" },
      neckCm: null,
    });
  });

  it("adds measurements without a weight; weight readers keep using the last weigh-in", async () => {
    const { agent, userId } = await t.signIn();
    await onboard(agent);
    // Move the onboarding weigh-in back, so today has no row yet.
    await t.prisma.bodyMetric.updateMany({
      where: { userId },
      data: { date: new Date("2026-01-01") },
    });
    const planBefore = (await agent.get("/api/plan").expect(200)).body;

    const added = await agent
      .post("/api/measurements")
      .send({ chestCm: 102, armCm: 35.5, waistCm: 91, neckCm: 39 })
      .expect(201);
    const today = added.body.chestCm.date as string;
    expect(today).not.toBe("2026-01-01");
    expect(added.body).toEqual({
      weightKg: { value: 82, date: "2026-01-01" },
      bodyFatPct: { value: expect.any(Number), date: today },
      waistCm: { value: 91, date: today },
      chestCm: { value: 102, date: today },
      hipCm: null,
      armCm: { value: 35.5, date: today },
      neckCm: { value: 39, date: today },
    });
    const row = await t.prisma.bodyMetric.findFirstOrThrow({ where: { userId, chestCm: 102 } });
    expect(row.weightKg).toBeNull();

    // Every weight reader skips the row without a weight.
    const plan = (await agent.get("/api/plan").expect(200)).body;
    expect(plan.metric.weightKg).toBe(82);
    expect(plan.summary.target).toEqual(planBefore.summary.target);
    const progress = (await agent.get("/api/progress").expect(200)).body;
    expect(progress.latest).toEqual({ weightKg: 82, waistCm: null });
    expect(progress.points.map((p: { weightKg: number }) => p.weightKg)).toEqual([82]);
    const checkins = (await agent.get("/api/checkins").expect(200)).body;
    expect(checkins.metrics.map((m: { weightKg: number }) => m.weightKg)).toEqual([82]);
    const water = (await agent.get("/api/water").expect(200)).body;
    expect(water.targetMl).toBeGreaterThan(0);
    const health = (await agent.get("/api/health-data/summary").expect(200)).body;
    expect(health.bmi).toMatchObject({ weightKg: 82, weightFrom: "fitr8" });

    // A same-day weigh-in merges into the row: nothing saved that day is wiped.
    const checkin = await agent.post("/api/checkins").send({ weightKg: 81 }).expect(201);
    expect(checkin.body.metric).toMatchObject({
      weightKg: 81,
      chestCm: 102,
      armCm: 35.5,
      waistCm: 91,
      neckCm: 39,
      bodyFatPct: added.body.bodyFatPct.value,
    });
    // …and a measurement with a weight behaves like that weigh-in.
    const again = await agent.post("/api/measurements").send({ weightKg: 80.6 }).expect(201);
    expect(again.body.weightKg).toEqual({ value: 80.6, date: today });
    expect(again.body.chestCm).toEqual({ value: 102, date: today });
    expect((await agent.get("/api/progress").expect(200)).body.latest).toEqual({
      weightKg: 80.6,
      waistCm: 91,
    });
    expect(await t.prisma.bodyMetric.count({ where: { userId } })).toBe(2);
  });
});
