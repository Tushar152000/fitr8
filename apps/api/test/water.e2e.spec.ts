import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, onboard, type TestApp } from "./support/app.js";

describe("water", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("requires sign-in", async () => {
    await t.http().get("/api/water").expect(401, { error: "Not signed in" });
  });

  it("asks for onboarding first", async () => {
    const { agent } = await t.signIn();
    const res = await agent.get("/api/water").expect(404);
    expect(res.body.error).toBe("Finish onboarding first");
  });

  it("logs, totals and undoes glasses", async () => {
    const { agent } = await t.signIn();
    // A real onboarding: the target depends on whether today is a training day in the week plan.
    await onboard(agent);

    const empty = await agent.get("/api/water").expect(200);
    expect(empty.body.consumedMl).toBe(0);
    expect(empty.body.targetMl).toBeGreaterThan(1500);

    const after = await agent.post("/api/water").send({ ml: 250 }).expect(201);
    expect(after.body.consumedMl).toBe(250);
    expect(after.body.logs).toHaveLength(1);

    await agent.post("/api/water").send({ ml: 99999 }).expect(400);

    await agent.delete(`/api/water/${after.body.logs[0].id}`).expect(204);
    await agent.delete(`/api/water/${after.body.logs[0].id}`).expect(404);
    expect((await agent.get("/api/water").expect(200)).body.consumedMl).toBe(0);
  });

  it("only reads the week's plan (never builds one) and sends only what the card reads", async () => {
    const { userId, agent } = await t.signIn();
    await onboard(agent);
    await agent.post("/api/water").send({ ml: 250 }).expect(201);
    const before = await agent.get("/api/water").expect(200);
    expect(Object.keys(before.body).sort()).toEqual(
      ["caution", "consumedMl", "date", "logs", "reason", "remind", "targetMl", "tip"].sort(),
    );
    expect(before.body.logs).toEqual([{ id: expect.any(String), ml: 250 }]);
    // Water never creates a workout plan…
    expect(await t.prisma.workoutPlan.count({ where: { userId } })).toBe(0);

    // …and its training-day answer matches the plan the Workout screen then builds.
    await agent.get("/api/workouts/today").expect(200);
    expect(await t.prisma.workoutPlan.count({ where: { userId } })).toBeGreaterThan(0);
    expect((await agent.get("/api/water").expect(200)).body.targetMl).toBe(before.body.targetMl);
  });

  it("survives /workouts/today and /water racing on a new week", async () => {
    const { userId, agent } = await t.signIn();
    await onboard(agent);
    const responses = await Promise.all([
      agent.get("/api/workouts/today"),
      agent.get("/api/workouts/today"),
      agent.get("/api/water"),
      agent.get("/api/workouts/today"),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    // Racing builds collide on the version and collapse into one stored plan per week.
    const plans = await t.prisma.workoutPlan.findMany({
      where: { userId },
      select: { version: true },
    });
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((p) => p.version === 1)).toBe(true);
    expect(new Set(responses.filter((_, i) => i !== 2).map((r) => r.body.planId)).size).toBe(1);
  });
});
