import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localYmd, zonedMidnight } from "@fitr8/domain/dates";
import { createTestApp, onboard, type TestApp } from "./support/app.js";

const TZ = "Asia/Kolkata";
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

/** A realistic Health Connect batch for "today" (local IST day) and last night. */
function batch() {
  const date = localYmd(TZ, new Date());
  const midnight = zonedMidnight(date, TZ).getTime();
  const at = (h: number) => midnight + h * HOUR;
  return {
    date,
    body: {
      platform: "HEALTH_CONNECT",
      samples: [
        {
          id: "steps-1",
          type: "steps",
          start: iso(at(8)),
          end: iso(at(9)),
          value: 3100,
          unit: "count",
          origin: "com.google.android.apps.fitness",
        },
        {
          id: "hr-1:0",
          type: "heart_rate",
          start: iso(at(9)),
          end: iso(at(9)),
          value: 62,
          unit: "bpm",
        },
        {
          id: "hr-1:1",
          type: "heart_rate",
          start: iso(at(10)),
          end: iso(at(10)),
          value: 88,
          unit: "bpm",
        },
        {
          id: "hr-1:2",
          type: "heart_rate",
          start: iso(at(11)),
          end: iso(at(11)),
          value: 75,
          unit: "bpm",
        },
        // Not plausible: kept, but ignored in the summary.
        {
          id: "hr-1:3",
          type: "heart_rate",
          start: iso(at(11.5)),
          end: iso(at(11.5)),
          value: 0,
          unit: "bpm",
        },
        {
          id: "rhr-1",
          type: "resting_heart_rate",
          start: iso(at(7)),
          end: iso(at(7)),
          value: 58,
          unit: "bpm",
        },
        {
          id: "spo2-1",
          type: "oxygen_saturation",
          start: iso(at(6)),
          end: iso(at(6)),
          value: 96,
          unit: "%",
        },
        {
          id: "spo2-2",
          type: "oxygen_saturation",
          start: iso(at(7)),
          end: iso(at(7)),
          value: 98,
          unit: "%",
        },
        {
          id: "w-1",
          type: "weight",
          start: iso(at(7.5)),
          end: iso(at(7.5)),
          value: 80,
          unit: "kg",
        },
        // Last night: 23:00 → 06:30, 30 min awake in the middle.
        {
          id: "sleep-1",
          type: "sleep_session",
          start: iso(at(-1)),
          end: iso(at(6.5)),
          value: 450,
          unit: "min",
          data: { title: null },
        },
        {
          id: "sleep-1:0",
          type: "sleep_stage",
          start: iso(at(-1)),
          end: iso(at(2)),
          data: { stage: "light" },
        },
        {
          id: "sleep-1:1",
          type: "sleep_stage",
          start: iso(at(2)),
          end: iso(at(2.5)),
          data: { stage: "awake" },
        },
        {
          id: "sleep-1:2",
          type: "sleep_stage",
          start: iso(at(2.5)),
          end: iso(at(4)),
          data: { stage: "deep" },
        },
        {
          id: "sleep-1:3",
          type: "sleep_stage",
          start: iso(at(4)),
          end: iso(at(6.5)),
          data: { stage: "rem" },
        },
        // Something the app doesn't show is still stored.
        {
          id: "bp-1",
          type: "blood_pressure_systolic",
          start: iso(at(8)),
          end: iso(at(8)),
          value: 118,
          unit: "mmHg",
          data: { diastolic: 76 },
        },
      ],
      daily: [{ date, metric: "steps", value: 6240 }],
    },
  };
}

describe("health data (Apple Health / Health Connect)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("requires sign-in", async () => {
    await t.http().get("/api/health-data").expect(401);
    await t
      .http()
      .post("/api/health-data/connect")
      .send({ platform: "HEALTH_CONNECT" })
      .expect(401);
    await t.http().post("/api/health-data/sync").send({ platform: "HEALTH_CONNECT" }).expect(401);
    await t.http().get("/api/health-data/summary").expect(401);
    await t.http().delete("/api/health-data/connections/HEALTH_CONNECT").expect(401);
  });

  it("connects, syncs every record idempotently, and summarises the six metrics", async () => {
    const { userId, agent } = await t.signIn();
    await onboard(agent); // height 175, weight 82 today
    const { date, body } = batch();

    expect((await agent.get("/api/health-data").expect(200)).body).toEqual({
      connections: [],
      samples: 0,
    });
    await agent
      .post("/api/health-data/sync")
      .send(body)
      .expect(409, { error: "Connect the health app first" });
    await agent.post("/api/health-data/connect").send({ platform: "GOOGLE_FIT" }).expect(400);

    const conn = await agent
      .post("/api/health-data/connect")
      .send({
        platform: "HEALTH_CONNECT",
        permissions: ["read:Steps", "read:HeartRate", "read:Steps"],
      })
      .expect(200);
    expect(conn.body).toMatchObject({
      platform: "HEALTH_CONNECT",
      lastSyncAt: null,
      permissions: ["read:Steps", "read:HeartRate"],
    });
    // Connecting again is harmless.
    await agent.post("/api/health-data/connect").send({ platform: "HEALTH_CONNECT" }).expect(200);

    const first = await agent.post("/api/health-data/sync").send(body).expect(200);
    expect(first.body).toMatchObject({
      samples: body.samples.length,
      daily: 1,
      lastSyncAt: expect.any(String),
    });
    // The overlap the phone re-sends changes nothing.
    const again = await agent.post("/api/health-data/sync").send(body).expect(200);
    expect(again.body).toMatchObject({ samples: 0, daily: 0 });
    // A changed record is updated in place; duplicates in one batch collapse.
    const edited = { ...body.samples[0], value: 3200 };
    const changed = await agent
      .post("/api/health-data/sync")
      .send({ ...body, samples: [body.samples[0], edited], daily: [] })
      .expect(200);
    expect(changed.body.samples).toBe(1);
    expect(await t.prisma.healthSample.count({ where: { userId } })).toBe(body.samples.length);
    const bp = await t.prisma.healthSample.findFirst({
      where: { userId, type: "blood_pressure_systolic" },
    });
    expect(bp).toMatchObject({
      value: 118,
      unit: "mmHg",
      data: { diastolic: 76 },
      platform: "HEALTH_CONNECT",
    });

    const status = await agent.get("/api/health-data").expect(200);
    expect(status.body.samples).toBe(body.samples.length);
    expect(status.body.connections[0].lastSyncAt).not.toBeNull();

    const summary = (await agent.get("/api/health-data/summary").expect(200)).body;
    expect(summary).toMatchObject({
      date,
      connected: true,
      steps: { count: 6240, goal: 8000 },
      heartRate: { avg: 75, min: 62, max: 88, resting: 58, latest: { bpm: 75 } },
      spo2: { avg: 97, min: 96, latest: 98 },
      // The health app's 80 kg (this morning) is newer than the onboarding weigh-in.
      bmi: {
        value: 26.1,
        category: "overweight",
        weightKg: 80,
        heightCm: 175,
        weightFrom: "health",
      },
      sleep: {
        asleepMinutes: 420,
        inBedMinutes: 450,
        deepMinutes: 90,
        remMinutes: 150,
        lightMinutes: 180,
        awakeMinutes: 30,
      },
      recovery: { basis: ["sleep"], level: "ready" },
    });
    expect(summary.steps.week).toHaveLength(7);
    expect(summary.steps.week[6]).toEqual({ date, count: 6240 });
    expect(summary.steps.week[0].count).toBeNull();

    // A day without data.
    const yesterday = new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000)
      .toISOString()
      .slice(0, 10);
    const empty = (await agent.get(`/api/health-data/summary?date=${yesterday}`).expect(200)).body;
    expect(empty).toMatchObject({
      date: yesterday,
      steps: null,
      heartRate: null,
      spo2: null,
      sleep: null,
    });
  });

  it("validates sync batches and summary dates", async () => {
    const { agent } = await t.signIn();
    await onboard(agent);
    await agent.post("/api/health-data/connect").send({ platform: "APPLE_HEALTH" }).expect(200);
    const { body } = batch();
    const one = (s: Record<string, unknown>) => ({
      platform: "APPLE_HEALTH",
      samples: [{ ...body.samples[0], ...s }],
    });

    await agent
      .post("/api/health-data/sync")
      .send(one({ end: "2020-01-01T00:00:00Z" }))
      .expect(400);
    await agent
      .post("/api/health-data/sync")
      .send(one({ type: "Bad Type" }))
      .expect(400);
    await agent
      .post("/api/health-data/sync")
      .send(one({ start: "yesterday" }))
      .expect(400);
    await agent
      .post("/api/health-data/sync")
      .send(one({ value: "12" }))
      .expect(400);
    await agent
      .post("/api/health-data/sync")
      .send(one({ start: "2020-01-01T00:00:00Z", end: "2020-01-01T01:00:00Z" }))
      .expect(400, { error: "Records must be from the last 400 days" });
    await agent
      .post("/api/health-data/sync")
      .send({
        platform: "APPLE_HEALTH",
        samples: Array.from({ length: 501 }, (_, i) => ({ ...body.samples[0], id: `s${i}` })),
      })
      .expect(400);
    await agent
      .post("/api/health-data/sync")
      .send({
        platform: "APPLE_HEALTH",
        daily: [{ date: "2026-02-31", metric: "steps", value: 1 }],
      })
      .expect(400);
    await agent
      .post("/api/health-data/sync")
      .send({
        platform: "APPLE_HEALTH",
        daily: [{ date: "2026-11-01", metric: "heart", value: 1 }],
      })
      .expect(400);

    await agent.get("/api/health-data/summary?date=2026-13-01").expect(400);
    await agent
      .get("/api/health-data/summary?date=2999-01-01")
      .expect(400, { error: "That day hasn't happened yet" });
    await agent.get("/api/health-data/summary?date=2020-01-01").expect(400);
  });

  it("keeps each user's data to themselves", async () => {
    const owner = await t.signIn();
    await onboard(owner.agent);
    await owner.agent
      .post("/api/health-data/connect")
      .send({ platform: "HEALTH_CONNECT" })
      .expect(200);
    await owner.agent.post("/api/health-data/sync").send(batch().body).expect(200);

    const other = await t.signIn();
    const summary = (await other.agent.get("/api/health-data/summary").expect(200)).body;
    // Not onboarded, not connected: everything empty.
    expect(summary).toMatchObject({
      connected: false,
      lastSyncAt: null,
      steps: null,
      heartRate: null,
      bmi: null,
      spo2: null,
      sleep: null,
      recovery: null,
    });
    await other.agent.delete("/api/health-data/connections/HEALTH_CONNECT").expect(404);
  });

  it("disconnects, optionally deleting what was synced", async () => {
    const { userId, agent } = await t.signIn();
    await onboard(agent);
    await agent.post("/api/health-data/connect").send({ platform: "HEALTH_CONNECT" }).expect(200);
    await agent.post("/api/health-data/sync").send(batch().body).expect(200);

    await agent.delete("/api/health-data/connections/FITBIT").expect(400);
    await agent.delete("/api/health-data/connections/HEALTH_CONNECT?deleteData=maybe").expect(400);

    // Disconnect only: data stays.
    await agent.delete("/api/health-data/connections/HEALTH_CONNECT").expect(204);
    expect((await agent.get("/api/health-data").expect(200)).body.connections).toEqual([]);
    expect(await t.prisma.healthSample.count({ where: { userId } })).toBeGreaterThan(0);

    // Delete the data afterwards (no connection left, data is).
    await agent.delete("/api/health-data/connections/HEALTH_CONNECT?deleteData=true").expect(204);
    expect(await t.prisma.healthSample.count({ where: { userId } })).toBe(0);
    expect(await t.prisma.healthDaily.count({ where: { userId } })).toBe(0);
    await agent.delete("/api/health-data/connections/HEALTH_CONNECT?deleteData=true").expect(404);
  });

  it("feeds recovery into the Workout tab", async () => {
    const { userId, agent } = await t.signIn();
    await t.premium(userId);
    await onboard(agent);
    await agent.post("/api/health-data/connect").send({ platform: "HEALTH_CONNECT" }).expect(200);
    await agent.post("/api/health-data/sync").send(batch().body).expect(200);
    await agent
      .post("/api/training/profile")
      .send({ types: ["walk"], daysPerWeek: 3, sessionMinutes: 30 })
      .expect(200);
    const week = (await agent.get("/api/training/week").expect(200)).body;
    expect(week.recovery).toMatchObject({ level: "ready", advice: null });
    expect(week.recovery.score).toBeGreaterThanOrEqual(67);
  });

  it("is deleted with the account", async () => {
    const { userId, agent } = await t.signIn();
    await onboard(agent);
    await agent.post("/api/health-data/connect").send({ platform: "HEALTH_CONNECT" }).expect(200);
    await agent.post("/api/health-data/sync").send(batch().body).expect(200);
    await agent.delete("/api/account").send({}).expect(204);
    expect(await t.prisma.healthSample.count({ where: { userId } })).toBe(0);
    expect(await t.prisma.healthConnection.count({ where: { userId } })).toBe(0);
  });
});
