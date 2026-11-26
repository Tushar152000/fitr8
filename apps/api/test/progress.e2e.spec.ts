import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, onboard, type TestApp } from "./support/app.js";

const DAY = 86_400_000;
/** Local "today" for Asia/Kolkata (the onboarding payload's timezone), as a UTC-midnight Date. */
const localToday = () =>
  new Date(
    `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())}T00:00:00.000Z`,
  );
const ymd = (d: Date) => d.toISOString().slice(0, 10);

describe("progress", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const confirmedMeal = (userId: string, date: Date, kcal: number, photoKey?: string) =>
    t.prisma.mealLog.create({
      data: {
        userId,
        date,
        mealType: "LUNCH",
        source: photoKey ? "PHOTO" : "TEXT",
        photoKey,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        totalKcal: kcal,
        totalProtein: 20,
        aiRaw: { secret: true },
        items: {
          create: [
            {
              name: "dal tadka",
              quantity: 1,
              unit: "katori",
              grams: 150,
              kcal,
              proteinG: 20,
              carbsG: 0,
              fatG: 0,
            },
          ],
        },
      },
    });

  it("requires sign-in", async () => {
    await t.http().get("/api/checkins").expect(401);
    await t.http().post("/api/checkins").send({ weightKg: 80 }).expect(401);
    await t.http().get("/api/dashboard").expect(401);
    await t.http().get("/api/history").expect(401);
    await t.http().get("/api/progress").expect(401);
  });

  it("logs weigh-ins (one per day) and lists only the caller's", async () => {
    const { userId, agent } = await t.signIn();
    await onboard(agent);
    const stranger = await t.signIn();

    await agent.post("/api/checkins").send({ weightKg: 10 }).expect(400);
    const res = await agent
      .post("/api/checkins")
      .send({ date: "2026-01-05", weightKg: 81, waistCm: 90, neckCm: 38 })
      .expect(201);
    expect(res.body.metric).toMatchObject({
      userId,
      date: "2026-01-05T00:00:00.000Z",
      weightKg: 81,
      bodyFatPct: expect.any(Number),
    });
    await agent.post("/api/checkins").send({ date: "2026-01-05", weightKg: 80.5 }).expect(201);

    const list = await agent.get("/api/checkins").expect(200);
    expect(list.body.metrics.map((m: { weightKg: number }) => m.weightKg)).toEqual([80.5, 82]);
    expect((await stranger.agent.get("/api/checkins").expect(200)).body.metrics).toEqual([]);
  });

  it("edits and deletes a day's weigh-in, keeping that day's other measurements", async () => {
    await t.http().patch("/api/checkins/2026-01-05").send({ weightKg: 80 }).expect(401);
    await t.http().delete("/api/checkins/2026-01-05").expect(401);

    const { userId, agent } = await t.signIn();
    await onboard(agent);
    const stranger = await t.signIn();
    await agent.post("/api/checkins").send({ date: "2026-01-05", weightKg: 81 }).expect(201);
    await agent
      .post("/api/checkins")
      .send({ date: "2026-01-12", weightKg: 80.6, waistCm: 90, neckCm: 38 })
      .expect(201);

    // Bad input: not a date, impossible date, weight out of range.
    await agent.patch("/api/checkins/yesterday").send({ weightKg: 80 }).expect(400);
    await agent.patch("/api/checkins/2026-02-31").send({ weightKg: 80 }).expect(400);
    await agent.patch("/api/checkins/2026-01-05").send({ weightKg: 10 }).expect(400);
    await agent.delete("/api/checkins/2026-13-01").expect(400);
    // No weigh-in that day, or someone else's day.
    await agent.patch("/api/checkins/2026-01-06").send({ weightKg: 80 }).expect(404);
    await agent.delete("/api/checkins/2026-01-06").expect(404);
    await stranger.agent.patch("/api/checkins/2026-01-05").send({ weightKg: 70 }).expect(404);
    await stranger.agent.delete("/api/checkins/2026-01-05").expect(404);

    const edited = await agent
      .patch("/api/checkins/2026-01-12")
      .send({ weightKg: 80.2 })
      .expect(200);
    expect(edited.body.metric).toMatchObject({
      userId,
      date: "2026-01-12T00:00:00.000Z",
      weightKg: 80.2,
      waistCm: 90,
      bodyFatPct: expect.any(Number),
    });

    // A weight-only day goes; a day with a tape measure keeps its row without the weight.
    await agent.delete("/api/checkins/2026-01-05").expect(204);
    await agent.delete("/api/checkins/2026-01-12").expect(204);
    const rows = await t.prisma.bodyMetric.findMany({
      where: { userId, date: { in: [new Date("2026-01-05"), new Date("2026-01-12")] } },
    });
    expect(rows).toEqual([
      expect.objectContaining({
        weightKg: null,
        waistCm: 90,
        neckCm: 38,
        bodyFatPct: expect.any(Number),
      }),
    ]);
    const list = await agent.get("/api/checkins").expect(200);
    expect(list.body.metrics.map((m: { date: string }) => m.date.slice(0, 10))).not.toContain(
      "2026-01-12",
    );
    await agent.delete("/api/checkins/2026-01-12").expect(404);
  });

  it("builds the Today dashboard with a streak, photo links and no raw AI output", async () => {
    const { userId, agent } = await t.signIn();
    const plan = await onboard(agent);
    const stranger = await t.signIn();
    const today = localToday();
    await confirmedMeal(userId, today, 500, `meals/${userId}/p.jpg`);
    await confirmedMeal(userId, new Date(today.getTime() - DAY), 400);
    await confirmedMeal(stranger.userId, today, 999);

    const res = await agent.get("/api/dashboard").expect(200);
    expect(res.body).toEqual({
      date: ymd(today),
      target: plan.target,
      eaten: { kcal: 500, proteinG: 20, carbsG: expect.any(Number), fatG: expect.any(Number) },
      meals: [expect.any(Object)],
      streak: 2,
      timezone: "Asia/Kolkata",
    });
    // Only what the day's meal list reads: no owner, photo key, raw AI output or other totals.
    const [meal] = res.body.meals;
    expect(meal).toEqual({
      id: expect.any(String),
      date: `${ymd(today)}T00:00:00.000Z`,
      mealType: "LUNCH",
      source: "PHOTO",
      inputText: null,
      status: "CONFIRMED",
      totalKcal: 500,
      createdAt: expect.any(String),
      items: [
        { name: "dal tadka", quantity: 1, unit: "katori", grams: 150, kcal: 500, isLiquid: false },
      ],
      photoUrl: expect.stringContaining(`meals/${userId}/p.jpg`),
    });

    const yesterday = await agent
      .get(`/api/dashboard?date=${ymd(new Date(today.getTime() - DAY))}`)
      .expect(200);
    expect(yesterday.body).toMatchObject({ eaten: { kcal: 400 }, streak: 2 });
  });

  it("measures days before onboarding against the first plan, not 'no target'", async () => {
    const { agent } = await t.signIn();
    const plan = await onboard(agent); // first target starts today
    const yesterday = ymd(new Date(localToday().getTime() - DAY));
    const res = await agent.get(`/api/dashboard?date=${yesterday}`).expect(200);
    expect(res.body).toMatchObject({
      date: yesterday,
      target: { kcal: plan.target.kcal },
      eaten: { kcal: 0 },
    });
    const week = await agent.get("/api/history").expect(200);
    expect(
      week.body.days.every((d: { target: number | null }) => d.target === plan.target.kcal),
    ).toBe(true);
  });

  it("has no target at all before any plan exists", async () => {
    const { agent } = await t.signIn();
    const res = await agent.get("/api/dashboard").expect(200);
    expect(res.body.target).toBeNull();
  });

  it("returns 7 or 30 days of history", async () => {
    const { userId, agent } = await t.signIn();
    await onboard(agent);
    const today = localToday();
    await confirmedMeal(userId, new Date(today.getTime() - 2 * DAY), 1800);

    const week = await agent.get("/api/history").expect(200);
    expect(week.body.days).toHaveLength(7);
    expect(week.body).toMatchObject({ daysLogged: 1, avgKcalFullDays: 1800 });
    const day = week.body.days[4];
    expect(day).toMatchObject({
      kcal: 1800,
      logged: true,
      isToday: false,
      meals: [{ title: "Dal tadka", kcal: 1800 }],
    });
    expect(week.body.days[6]).toMatchObject({
      date: ymd(today),
      isToday: true,
      target: expect.any(Number),
    });

    expect((await agent.get("/api/history?days=30").expect(200)).body.days).toHaveLength(30);
  });

  it("shows the weigh-in trend against the plan", async () => {
    const { userId, agent } = await t.signIn();
    await onboard(agent);
    await confirmedMeal(userId, localToday(), 1700);
    const res = await agent.get("/api/progress").expect(200);
    expect(res.body).toMatchObject({
      points: [{ weightKg: 82, avg7: 82 }],
      plan: { startWeightKg: 82, targetWeightKg: 76, goalType: "FAT_LOSS" },
      weeklyChange: null,
      avgIntake: 1700,
      daysLogged: 1,
    });
    // Only what the check-in form and the target line read.
    expect(res.body.latest).toEqual({ weightKg: 82, waistCm: null });
    expect(res.body.target).toEqual({ kcal: expect.any(Number) });
  });

  it("trends the newest weigh-ins once there are more than it shows", async () => {
    const { userId, agent } = await t.signIn();
    await onboard(agent);
    const today = localToday();
    // 130 older weigh-ins (more than the 120 shown), then today's at onboarding (82 kg).
    await t.prisma.bodyMetric.createMany({
      data: Array.from({ length: 130 }, (_, i) => ({
        userId,
        date: new Date(today.getTime() - (i + 1) * DAY),
        weightKg: 90 + (i % 3),
      })),
    });
    await agent.post("/api/checkins").send({ weightKg: 79.5, waistCm: 88 }).expect(201);

    const res = await agent.get("/api/progress").expect(200);
    expect(res.body.points).toHaveLength(120);
    // Oldest first, ending with today's weigh-in.
    expect(res.body.points.at(-1)).toMatchObject({ date: ymd(today), weightKg: 79.5 });
    expect(res.body.points[0].date).toBe(ymd(new Date(today.getTime() - 119 * DAY)));
    expect(res.body.latest).toEqual({ weightKg: 79.5, waistCm: 88 });
  });
});
