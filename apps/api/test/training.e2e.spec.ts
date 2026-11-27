import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localDate, weekStart } from "@fitr8/domain/dates";
import { burnKcal, MET_BY_TYPE } from "@fitr8/domain/training";
import { createTestApp, onboard, type TestApp } from "./support/app.js";

const DAY = 86_400_000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
/** The test users live in Asia/Kolkata (onboarding payload). */
const today = () => localDate("Asia/Kolkata");
const monday = () => weekStart(today());
const plusDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

const MIX = { types: ["gym", "run", "yoga"], daysPerWeek: 5, sessionMinutes: 45 };

describe("training (Workout tab)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("requires sign-in", async () => {
    await t.http().get("/api/training").expect(401);
    await t.http().post("/api/training/profile").send(MIX).expect(401);
    await t.http().get("/api/training/week").expect(401);
    await t.http().post("/api/training/logs").send({}).expect(401);
    await t.http().delete("/api/training/logs/x").expect(401);
  });

  it("gives the free plan a taste: its own week as a preview, logging, no other weeks", async () => {
    const { agent } = await t.signIn();
    await onboard(agent, { experience: "INTERMEDIATE" });
    // The plan still tells the app the full Workout tab is Premium.
    expect((await agent.get("/api/billing").expect(200)).body.limits.workouts).toBe(false);

    // Setup works on the free plan.
    expect((await agent.get("/api/training").expect(200)).body.profile).toBeNull();
    const week = (await agent.post("/api/training/profile").send(MIX).expect(200)).body;
    expect(week.preview).toBe(true);
    expect(week.recovery).toBeNull();

    type Day = {
      date: string;
      type: string;
      exercises: unknown[] | null;
      lockedExercises: number;
      gym: { exercises: number } | null;
      steps: unknown[];
    };
    const days = week.days as Day[];
    const firstSession = days.find((d) => d.type !== "rest")!;
    expect(week.sampleDate).toBe(firstSession.date);

    const gymDays = days.filter((d) => d.type === "gym");
    expect(gymDays.length).toBeGreaterThan(1);
    for (const d of gymDays) {
      const total = d.gym!.exercises;
      if (d.date === week.sampleDate) {
        // The sample session is shown in full.
        expect(d.exercises).toHaveLength(total);
        expect(d.lockedExercises).toBe(0);
      } else {
        expect(d.exercises).toHaveLength(2);
        expect(d.lockedExercises).toBe(total - 2);
        expect(d.steps.length).toBeLessThanOrEqual(2);
      }
    }
    // Titles, minutes and statuses stay visible on every day.
    for (const d of days)
      expect(d).toMatchObject({ title: expect.any(String), status: expect.any(String) });

    // This week by date works; any other week is Premium.
    await agent.get(`/api/training/week?start=${ymd(today())}`).expect(200);
    const locked = {
      error: "Other weeks are part of FITR8 Premium.",
      details: { reason: "pro_required", feature: "workouts" },
    };
    await agent.get(`/api/training/week?start=${ymd(plusDays(monday(), 7))}`).expect(402, locked);
    await agent.get(`/api/training/week?start=${ymd(plusDays(monday(), -7))}`).expect(402, locked);

    // Logging a session (and undoing it) is free.
    const log = await agent
      .post("/api/training/logs")
      .send({ date: ymd(today()), type: "run", minutes: 30 })
      .expect(201);
    await agent.delete(`/api/training/logs/${log.body.id}`).expect(204);
    await agent.delete("/api/training/logs/x").expect(404);
  });

  it("asks for onboarding first", async () => {
    const { userId, agent } = await t.signIn();
    await t.premium(userId);
    await agent.get("/api/training").expect(404, { error: "Finish onboarding first" });
    await agent
      .post("/api/training/profile")
      .send(MIX)
      .expect(404, { error: "Finish onboarding first" });
  });

  it("prefills setup from onboarding and needs setup before the week", async () => {
    const { userId, agent } = await t.signIn();
    await t.premium(userId);
    await onboard(agent);
    expect((await agent.get("/api/billing").expect(200)).body.limits.workouts).toBe(true);

    const state = await agent.get("/api/training").expect(200);
    // Defaults come from onboarding (3 days × 45 min at a full gym, fat loss adds walking).
    expect(state.body).toEqual({
      profile: null,
      defaults: { types: ["gym", "walk"], daysPerWeek: 3, sessionMinutes: 45 },
      summary: {
        goal: "lose",
        weightKg: 82,
        activityLevel: "LIGHT",
        experience: "BEGINNER",
        equipment: "FULL_GYM",
        injuries: [],
        targetWeightKg: 76,
        targetDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      },
    });
    await agent.get("/api/training/week").expect(404, { error: "Set up your training first" });
  });

  it("maps onboarding answers onto the setup's choices", async () => {
    const { agent } = await t.signIn();
    await onboard(agent, {
      equipment: "DUMBBELLS",
      trainingDaysPerWeek: 2,
      sessionMinutes: 90,
      goal: { type: "MUSCLE_GAIN", targetWeightKg: 88, targetDate: ymd(plusDays(today(), 180)) },
    });
    const state = (await agent.get("/api/training").expect(200)).body;
    expect(state.defaults).toEqual({ types: ["home"], daysPerWeek: 3, sessionMinutes: 60 });
    expect(state.summary).toMatchObject({
      goal: "gain",
      equipment: "DUMBBELLS",
      targetWeightKg: 88,
    });
  });

  it("validates the setup", async () => {
    const { userId, agent } = await t.signIn();
    await t.premium(userId);
    await onboard(agent);
    await agent
      .post("/api/training/profile")
      .send({ ...MIX, types: [] })
      .expect(400);
    await agent
      .post("/api/training/profile")
      .send({ ...MIX, types: ["gym", "gym"] })
      .expect(400);
    await agent
      .post("/api/training/profile")
      .send({ ...MIX, types: ["swim"] })
      .expect(400);
    await agent
      .post("/api/training/profile")
      .send({ ...MIX, daysPerWeek: 7 })
      .expect(400);
    await agent
      .post("/api/training/profile")
      .send({ ...MIX, daysPerWeek: 2 })
      .expect(400);
    await agent
      .post("/api/training/profile")
      .send({ ...MIX, sessionMinutes: 40 })
      .expect(400);
    await agent.post("/api/training/profile").send({}).expect(400);
  });

  it("builds the week, shares gym days with the strength plan, and opens other weeks", async () => {
    const { userId, agent } = await t.signIn();
    await t.premium(userId);
    await onboard(agent, { experience: "INTERMEDIATE" });

    const res = await agent.post("/api/training/profile").send(MIX).expect(200);
    const week = res.body;
    // Premium: the full week, no preview cut.
    expect(week.preview).toBe(false);
    expect(week.sampleDate).toBeNull();
    for (const d of week.days as { lockedExercises: number }[]) expect(d.lockedExercises).toBe(0);
    expect(week.start).toBe(ymd(monday()));
    expect(week.today).toBe(ymd(today()));
    expect(week.goal).toBe("lose");
    expect(week.style).toBe("mix");
    expect(week.sessions).toBe(5);
    expect(week.profile).toMatchObject({
      types: ["gym", "run", "yoga"],
      daysPerWeek: 5,
      sessionMinutes: 45,
    });
    expect(week.days.map((d: { title: string }) => d.title)).toEqual([
      "Upper body A",
      "Easy run",
      "Yoga flow",
      "Lower body A",
      "Brisk walk",
      // A deficit allows one interval session; this week has exactly one.
      "Intervals",
      "Rest",
    ]);
    expect(week.days.map((d: { weekday: string }) => d.weekday)).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
    const total = week.days.reduce((s: number, d: { kcal: number }) => s + d.kcal, 0);
    expect(week.totalKcal).toBe(total);
    expect(week.fatKg).toBe(Math.round((total / 7700) * 100) / 100);
    expect(week.recovery).toBeNull();
    // The eyebrow's plan name and the rest-day cardio as fields (a deficit: steps, no HIIT).
    expect(week.plan).toBe("Mixed plan");
    expect(week.restDay).toEqual({
      activity: "Zone 2 walk or cycle",
      minutes: { min: 20, max: 25 },
      daysPerWeek: { min: 2, max: 3 },
      steps: { min: 8000, max: 10000 },
      noHiit: true,
    });

    // Gym days carry the strength engine's exercises.
    const upper = week.days[0];
    expect(upper.type).toBe("gym");
    // Same deficit flag as restDay above (noHiit): the gym day's why says "deficit" too.
    expect(upper.why).toBe("Keeps your strength while you eat in a deficit.");
    expect(upper.gym.exercises).toBeGreaterThan(0);
    expect(upper.steps.length).toBeGreaterThanOrEqual(2);
    expect(upper.steps.length).toBeLessThanOrEqual(4);
    expect(upper.steps[0].detail).toMatch(/×/);
    // …in full, as fields; other days have none.
    expect(upper.exercises).toHaveLength(upper.gym.exercises);
    expect(upper.exercises[0]).toMatchObject({
      name: upper.steps[0].name,
      sets: expect.any(Number),
      repMin: expect.any(Number),
      repMax: expect.any(Number),
      timed: expect.any(Boolean),
    });
    expect(week.days[1].exercises).toBeNull();
    // Runs carry pace, distance and timer blocks.
    const run = week.days[1];
    expect(run).toMatchObject({
      type: "run",
      pace: "6:45–7:15/km",
      distanceKm: 2.9,
      minutes: 30,
      kcal: burnKcal(8.3, 82, 30),
    });
    expect(run.blocks.reduce((s: number, b: { minutes: number }) => s + b.minutes, 0)).toBe(30);

    const todayIndex = week.days.findIndex((d: { date: string }) => d.date === ymd(today()));
    expect(week.days[todayIndex].status).toBe("today");
    for (const d of week.days.slice(todayIndex + 1)) expect(d.status).toBe("planned");

    // GET /workouts/today puts gym sessions on the same days (Mon + Thu).
    const workout = await agent.get("/api/workouts/today").expect(200);
    const gymDates = workout.body.strip
      .filter((d: { state: string }) => d.state !== "rest")
      .map((d: { date: string }) => d.date);
    expect(gymDates).toEqual([ymd(monday()), ymd(plusDays(monday(), 3))]);

    // Same week by any date in it; next week; validation.
    const again = await agent
      .get(`/api/training/week?start=${ymd(plusDays(monday(), 2))}`)
      .expect(200);
    expect(again.body.days.map((d: { title: string }) => d.title)).toEqual(
      week.days.map((d: { title: string }) => d.title),
    );
    const next = await agent
      .get(`/api/training/week?start=${ymd(plusDays(monday(), 7))}`)
      .expect(200);
    expect(next.body.start).toBe(ymd(plusDays(monday(), 7)));
    expect(next.body.days.every((d: { status: string }) => d.status === "planned")).toBe(true);
    await agent.get(`/api/training/week?start=${ymd(plusDays(monday(), 14))}`).expect(400);
    await agent.get(`/api/training/week?start=${ymd(plusDays(monday(), -7 * 53))}`).expect(400);
    await agent.get("/api/training/week?start=2026-02-31").expect(400);
    await agent.get("/api/training/week?start=monday").expect(400);

    // GET /training now returns the profile as the defaults.
    const state = await agent.get("/api/training").expect(200);
    expect(state.body.profile).toMatchObject({ types: ["gym", "run", "yoga"] });
    expect(state.body.defaults).toEqual({
      types: ["gym", "run", "yoga"],
      daysPerWeek: 5,
      sessionMinutes: 45,
    });
  });

  it("rebuilds the week when the setup changes", async () => {
    const { userId, agent } = await t.signIn();
    await t.premium(userId);
    await onboard(agent);
    await agent.post("/api/training/profile").send(MIX).expect(200);
    const yoga = await agent
      .post("/api/training/profile")
      .send({ types: ["yoga"], daysPerWeek: 3, sessionMinutes: 30 })
      .expect(200);
    expect(yoga.body.style).toBe("yoga");
    expect(yoga.body.plan).toBe("Yoga");
    expect(yoga.body.days.map((d: { type: string }) => d.type)).toEqual([
      "yoga",
      "walk",
      "yoga",
      "rest",
      "yoga",
      "walk",
      "rest",
    ]);
    // No gym days → the strength plan has no sessions this week.
    const workout = await agent.get("/api/workouts/today").expect(200);
    expect(workout.body.strip.every((d: { state: string }) => d.state === "rest")).toBe(true);
    expect(workout.body.session).toBeNull();
    // Rebuilt in place: one row for this week (next week may be built too, for "next session").
    expect(await t.prisma.trainingWeek.count({ where: { userId, weekStart: monday() } })).toBe(1);
  });

  it("logs sessions, replaces the estimate, and undoes", async () => {
    const owner = await t.signIn();
    await t.premium(owner.userId);
    await onboard(owner.agent);
    const stranger = await t.signIn();
    await t.premium(stranger.userId);
    await owner.agent.post("/api/training/profile").send(MIX).expect(200);
    const date = ymd(today());

    // Validation and the date window.
    const log = { date, type: "run", minutes: 30, distanceKm: 4.2 };
    await owner.agent
      .post("/api/training/logs")
      .send({ ...log, minutes: 0 })
      .expect(400);
    await owner.agent
      .post("/api/training/logs")
      .send({ ...log, minutes: 301 })
      .expect(400);
    await owner.agent
      .post("/api/training/logs")
      .send({ ...log, type: "rest" })
      .expect(400);
    await owner.agent
      .post("/api/training/logs")
      .send({ ...log, distanceKm: 0 })
      .expect(400);
    await owner.agent
      .post("/api/training/logs")
      .send({ ...log, date: ymd(plusDays(today(), 1)) })
      .expect(400, { error: "You can't log a session for a future day" });
    await owner.agent
      .post("/api/training/logs")
      .send({ ...log, date: ymd(plusDays(today(), -8)) })
      .expect(400, { error: "You can log sessions for today or up to 7 days back" });
    await owner.agent
      .post("/api/training/logs")
      .send({ ...log, date: "2026-02-30" })
      .expect(400);

    const first = await owner.agent.post("/api/training/logs").send(log).expect(201);
    expect(first.body).toMatchObject({
      id: expect.any(String),
      date,
      type: "run",
      minutes: 30,
      distanceKm: 4.2,
    });
    expect(first.body.kcal).toBeGreaterThan(0);

    // Logging the same type again that day replaces it.
    const second = await owner.agent
      .post("/api/training/logs")
      .send({ ...log, minutes: 40 })
      .expect(201);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.minutes).toBe(40);

    const week = (await owner.agent.get("/api/training/week").expect(200)).body;
    const day = week.days.find((d: { date: string }) => d.date === date);
    expect(day.status).toBe("done");
    expect(day.logs).toHaveLength(1);
    expect(day.minutes).toBe(40);
    expect(day.kcal).toBe(second.body.kcal);
    // kcal from the logged minutes (the planned MET when it was a run day, else the run default).
    const met = day.type === "run" ? 8.3 : MET_BY_TYPE.run;
    expect([
      burnKcal(met, 82, 40),
      burnKcal(6.0, 82, 40),
      burnKcal(MET_BY_TYPE.run, 82, 40),
    ]).toContain(second.body.kcal);

    // A gym session logged from focus mode on a past day of the week.
    const back = ymd(plusDays(today(), -1));
    await owner.agent
      .post("/api/training/logs")
      .send({
        date: back,
        type: "gym",
        minutes: 52,
        exercises: [{ name: "Squat", sets: 3, reps: 8, kg: 60 }],
      })
      .expect(201);

    await stranger.agent
      .delete(`/api/training/logs/${second.body.id}`)
      .expect(404, { error: "Session not found" });
    await owner.agent.delete(`/api/training/logs/${second.body.id}`).expect(204);
    await owner.agent.delete(`/api/training/logs/${second.body.id}`).expect(404);
    const after = (await owner.agent.get("/api/training/week").expect(200)).body;
    expect(after.days.find((d: { date: string }) => d.date === date).status).toBe("today");
  });

  it("keeps the profile and logs when Premium lapses, falling back to the preview", async () => {
    const { userId, agent } = await t.signIn();
    await t.premium(userId);
    await onboard(agent);
    await agent.post("/api/training/profile").send(MIX).expect(200);
    await agent
      .post("/api/training/logs")
      .send({ date: ymd(today()), type: "walk", minutes: 20 })
      .expect(201);

    await t.prisma.entitlement.delete({ where: { userId } });
    expect((await agent.get("/api/training/week").expect(200)).body.preview).toBe(true);
    await agent.get(`/api/training/week?start=${ymd(plusDays(monday(), 7))}`).expect(402);
    expect(await t.prisma.trainingProfile.count({ where: { userId } })).toBe(1);
    expect(await t.prisma.trainingLog.count({ where: { userId } })).toBe(1);

    await t.premium(userId);
    const back = await agent.get("/api/training/week").expect(200);
    expect(back.body.preview).toBe(false);
    expect(back.body.profile.types).toEqual(["gym", "run", "yoga"]);
  });
});
