import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, onboard, type TestApp } from "./support/app.js";

const DAY = 86_400_000;
/** Local "today" for Asia/Kolkata (the onboarding payload's timezone), as a UTC-midnight Date. */
const localToday = () =>
  new Date(
    `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())}T00:00:00.000Z`,
  );
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(localToday().getTime() - n * DAY);

type Item = { name: string; quantity: number; unit: string; kcal: number; proteinG: number };

describe("insights: streak, meal suggestion, progress stats", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const meal = (
    userId: string,
    date: Date,
    items: Item[],
    opts: {
      mealType?: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
      status?: "CONFIRMED" | "READY";
    } = {},
  ) =>
    t.prisma.mealLog.create({
      data: {
        userId,
        date,
        mealType: opts.mealType ?? "LUNCH",
        source: "TEXT",
        status: opts.status ?? "CONFIRMED",
        confirmedAt: new Date(),
        totalKcal: items.reduce((s, i) => s + i.kcal, 0),
        totalProtein: items.reduce((s, i) => s + i.proteinG, 0),
        items: {
          create: items.map((i) => ({ ...i, grams: 100, carbsG: 0, fatG: 0 })),
        },
      },
    });
  const dal: Item = { name: "dal tadka", quantity: 1, unit: "katori", kcal: 300, proteinG: 12 };

  it("requires sign-in", async () => {
    await t.http().get("/api/streak").expect(401);
    await t.http().get("/api/meals/suggestion?mealType=DINNER").expect(401);
    await t.http().get("/api/calendar").expect(401);
  });

  describe("GET /api/streak", () => {
    it("returns current and best streak, today's status and the Mon–Sun week", async () => {
      const { userId, agent } = await t.signIn();
      const stranger = await t.signIn();
      // Best: 4 days, 20–17 days ago. Current: yesterday and the day before (today not logged).
      for (const n of [20, 19, 18, 17, 2, 1]) await meal(userId, daysAgo(n), [dal]);
      // Not confirmed, and someone else's: neither counts.
      await meal(userId, localToday(), [dal], { status: "READY" });
      await meal(stranger.userId, localToday(), [dal]);

      const res = await agent.get("/api/streak").expect(200);
      expect(res.body).toMatchObject({ current: 2, longest: 4, loggedToday: false });
      expect(res.body.week).toHaveLength(7);
      expect(new Date(`${res.body.week[0].date}T00:00:00Z`).getUTCDay()).toBe(1); // Monday
      const today = res.body.week.find((d: { date: string }) => d.date === ymd(localToday()));
      expect(today).toEqual({ date: ymd(localToday()), state: "today" });
      const yesterday = res.body.week.find((d: { date: string }) => d.date === ymd(daysAgo(1)));
      if (yesterday) expect(yesterday.state).toBe("logged");
      const states = new Set(res.body.week.map((d: { state: string }) => d.state));
      for (const s of states)
        expect(["logged", "today", "missed", "future", "before"]).toContain(s);

      // Matches the dashboard's streak.
      expect((await agent.get("/api/dashboard").expect(200)).body.streak).toBe(2);

      await meal(userId, localToday(), [dal]);
      const after = await agent.get("/api/streak").expect(200);
      expect(after.body).toMatchObject({ current: 3, longest: 4, loggedToday: true });
      expect(
        after.body.week.find((d: { date: string }) => d.date === ymd(localToday())).state,
      ).toBe("logged");
    });

    it("is all zeros for a new user", async () => {
      const { agent } = await t.signIn();
      const res = await agent.get("/api/streak").expect(200);
      expect(res.body).toMatchObject({ current: 0, longest: 0, loggedToday: false });
    });

    it("marks days before the user started as before, not missed", async () => {
      const { agent } = await t.signIn();
      await onboard(agent); // first plan today, no meals
      const res = await agent.get("/api/streak").expect(200);
      const today = ymd(localToday());
      for (const d of res.body.week as { date: string; state: string }[]) {
        expect(d.state).toBe(d.date < today ? "before" : d.date === today ? "today" : "future");
      }
    });
  });

  describe("GET /api/calendar", () => {
    it("validates the month", async () => {
      const { agent } = await t.signIn();
      for (const month of ["2026-13", "2026-1", "abc", "2026-00"]) {
        await agent.get(`/api/calendar?month=${month}`).expect(400);
      }
    });

    it("marks each day on/over target, missed or none, with the past-days summary", async () => {
      const { userId, agent } = await t.signIn();
      const plan = await onboard(agent); // plan starts today
      const stranger = await t.signIn();
      const today = localToday();
      const prev = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const month = ymd(prev).slice(0, 7);
      const day = (n: number) => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), n));
      const kcal = plan.target.kcal;
      // Before onboarding: measured against the first plan. The first meal starts the calendar.
      await meal(userId, day(5), [{ ...dal, kcal: 300 }]); // under → on target
      await meal(userId, day(6), [{ ...dal, kcal: Math.round(kcal * 1.2) }]); // over
      await meal(userId, day(7), [{ ...dal, kcal: Math.floor(kcal * 1.04) }]); // within 5% → on
      await meal(userId, day(8), [{ ...dal, kcal: 5000 }], { status: "READY" }); // not confirmed
      await meal(stranger.userId, day(9), [dal]);

      const res = await agent.get(`/api/calendar?month=${month}`).expect(200);
      const length = new Date(
        Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 0),
      ).getUTCDate();
      expect(res.body.month).toBe(month);
      expect(res.body.days).toHaveLength(length);
      const status = (n: number) => res.body.days[n - 1].status;
      expect([1, 2, 3, 4].map(status)).toEqual(["none", "none", "none", "none"]);
      expect(status(5)).toBe("on_target");
      expect(status(6)).toBe("over_target");
      expect(status(7)).toBe("on_target");
      expect(status(8)).toBe("missed");
      expect(status(9)).toBe("missed");
      expect(res.body.summary).toEqual({
        daysLogged: 3,
        daysElapsed: length - 4,
        daysOnTarget: 2,
      });
    });

    it("defaults to this month: today none until logged, future none", async () => {
      const { userId, agent } = await t.signIn();
      await onboard(agent);
      const today = ymd(localToday());
      const find = (body: { days: { date: string; status: string }[] }, date: string) =>
        body.days.find((d) => d.date === date)?.status;

      const res = await agent.get("/api/calendar").expect(200);
      expect(res.body.month).toBe(today.slice(0, 7));
      expect(find(res.body, today)).toBe("none");
      // Started today: nothing elapsed yet, and earlier days are none.
      expect(res.body.summary).toEqual({ daysLogged: 0, daysElapsed: 0, daysOnTarget: 0 });
      expect(res.body.days.every((d: { status: string }) => d.status === "none")).toBe(true);

      await meal(userId, localToday(), [dal]);
      const after = await agent.get("/api/calendar").expect(200);
      expect(find(after.body, today)).toBe("on_target");
      expect(after.body.summary.daysLogged).toBe(0); // today isn't counted
    });
  });

  describe("GET /api/meals/suggestion", () => {
    it("validates the query", async () => {
      const { agent } = await t.signIn();
      await onboard(agent);
      await agent.get("/api/meals/suggestion").expect(400);
      await agent.get("/api/meals/suggestion?mealType=BRUNCH").expect(400);
      await agent.get("/api/meals/suggestion?mealType=DINNER&date=26-11-2026").expect(400);
      // Same day rules as logging: no future days, at most 7 days back.
      await agent.get(`/api/meals/suggestion?mealType=DINNER&date=${ymd(daysAgo(-1))}`).expect(400);
      await agent.get(`/api/meals/suggestion?mealType=DINNER&date=${ymd(daysAgo(30))}`).expect(400);
    });

    it("is null before onboarding and with nothing to suggest", async () => {
      const before = await t.signIn();
      expect(
        (await before.agent.get("/api/meals/suggestion?mealType=DINNER").expect(200)).body,
      ).toEqual({ suggestion: null });
      const { agent } = await t.signIn();
      await onboard(agent);
      expect((await agent.get("/api/meals/suggestion?mealType=DINNER").expect(200)).body).toEqual({
        suggestion: null,
      });
    });

    it("picks what fits the kcal and protein left from the user's own meals and foods", async () => {
      const { userId, agent } = await t.signIn();
      const plan = await onboard(agent);
      const stranger = await t.signIn();
      const kcal = plan.target.kcal;
      // Today: breakfast and lunch leave ~520 kcal for dinner.
      await meal(userId, localToday(), [{ ...dal, kcal: kcal - 520 - 300 }], {
        mealType: "BREAKFAST",
      });
      await meal(userId, localToday(), [dal], { mealType: "LUNCH" });
      // Last week: a two-food dinner (chicken fits; the whole meal is too big), a heavy biryani.
      await meal(
        userId,
        daysAgo(3),
        [
          { name: "chicken breast", quantity: 200, unit: "g", kcal: 500, proteinG: 38 },
          { name: "jeera rice", quantity: 1, unit: "bowl", kcal: 350, proteinG: 6 },
        ],
        { mealType: "DINNER" },
      );
      await meal(userId, daysAgo(4), [
        { name: "biryani", quantity: 1, unit: "plate", kcal: 900, proteinG: 30 },
      ]);
      // Someone else's perfect fit is never suggested.
      await meal(stranger.userId, daysAgo(1), [
        { name: "secret paneer", quantity: 1, unit: "bowl", kcal: 520, proteinG: 40 },
      ]);

      const res = await agent.get("/api/meals/suggestion?mealType=DINNER").expect(200);
      expect(res.body).toEqual({
        suggestion: {
          title: "Chicken breast, 200g",
          kcal: 500,
          proteinG: 38,
          kind: "food",
          reason: expect.stringMatching(/^Fits the 520 kcal and \d+ g protein you have left\.$/),
        },
      });
    });

    it("suggests a saved meal that fits", async () => {
      const { userId, agent } = await t.signIn();
      await onboard(agent);
      await t.prisma.savedMeal.create({
        data: { userId, name: "Paneer bowl", mealType: "LUNCH", totalKcal: 550, totalProtein: 30 },
      });
      const res = await agent
        .get(`/api/meals/suggestion?mealType=LUNCH&date=${ymd(daysAgo(1))}`)
        .expect(200);
      expect(res.body.suggestion).toMatchObject({ title: "Paneer bowl", kind: "saved" });
    });
  });

  describe("GET /api/progress stats", () => {
    it("shares logged days (before today) on target", async () => {
      const { userId, agent } = await t.signIn();
      const plan = await onboard(agent);
      await meal(userId, daysAgo(3), [dal]);
      await meal(userId, daysAgo(2), [{ ...dal, kcal: Math.round(plan.target.kcal * 1.3) }]);
      await meal(userId, daysAgo(1), [dal]);
      await meal(userId, localToday(), [{ ...dal, kcal: 9000 }]); // today not counted
      const res = await agent.get("/api/progress").expect(200);
      expect(res.body.onTarget).toEqual({ pct: 67, days: 2, logged: 3 });
      const fresh = await t.signIn();
      await onboard(fresh.agent);
      expect((await fresh.agent.get("/api/progress").expect(200)).body.onTarget).toEqual({
        pct: null,
        days: 0,
        logged: 0,
      });
    });

    it("adds weight change since the plan's start, streaks and 8 weekly weigh-ins", async () => {
      const { userId, agent } = await t.signIn();
      await onboard(agent); // 82 kg today
      for (const n of [3, 2, 1]) await meal(userId, daysAgo(n), [dal]);
      await t.prisma.bodyMetric.create({
        data: { userId, date: daysAgo(14), weightKg: 83 },
      });
      await agent.post("/api/checkins").send({ weightKg: 80.8 }).expect(201);

      const res = await agent.get("/api/progress").expect(200);
      expect(res.body.weightChangeKg).toBe(-1.2);
      expect(res.body.streak).toEqual({ current: 3, longest: 3 });
      expect(res.body.onTarget).toEqual({ pct: 100, days: 3, logged: 3 });
      expect(res.body.weeks).toHaveLength(8);
      const thisWeek = res.body.weeks.at(-1);
      expect(thisWeek).toEqual({
        weekStart: expect.any(String),
        weeksAgo: 0,
        date: ymd(localToday()),
        weightKg: 80.8,
      });
      expect(res.body.weeks[0].weeksAgo).toBe(7);
      const twoAgo = res.body.weeks.find((w: { weeksAgo: number }) => w.weeksAgo === 2);
      expect(twoAgo).toMatchObject({ date: ymd(daysAgo(14)), weightKg: 83 });
    });
  });
});
