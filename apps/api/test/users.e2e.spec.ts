import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PHONE_TAKEN } from "@fitr8/domain/person";
import { createTestApp, onboard, type TestApp } from "./support/app.js";

/** Numbers are unique per account and the test database is shared: use a fresh one each time. */
const randomDigits = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const indianMobile = () => `9${randomDigits(9)}`;

describe("users", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("requires sign-in", async () => {
    await t.http().get("/api/export").expect(401);
    await t.http().patch("/api/profile/reminders").send({ water: true }).expect(401);
  });

  it("saves the preferred first name, trimmed, before onboarding", async () => {
    await t.http().patch("/api/profile/name").send({ name: "Asha" }).expect(401);
    const { agent } = await t.signIn();
    await agent.patch("/api/profile/name").send({ name: "   " }).expect(400);
    await agent
      .patch("/api/profile/name")
      .send({ name: "x".repeat(61) })
      .expect(400);
    await agent.patch("/api/profile/name").send({}).expect(400);
    const res = await agent.patch("/api/profile/name").send({ name: "  Asha " }).expect(200);
    expect(res.body).toMatchObject({ name: "Asha", onboarded: false });
    const me = await agent.get("/api/me").expect(200);
    expect(me.body.name).toBe("Asha");
    expect(me.body).toMatchObject({ lastName: null, phone: null });
  });

  it("saves last name and phone from onboarding step 1, phone in E.164", async () => {
    await t
      .http()
      .patch("/api/profile/name")
      .send({ name: "Asha", lastName: "Rao", phone: "98765 43210" })
      .expect(401);
    const { agent } = await t.signIn();
    const send = (body: object) => agent.patch("/api/profile/name").send(body);
    const mobile = indianMobile();

    await send({ name: "Asha", lastName: "  " }).expect(400);
    await send({ name: "Asha", lastName: "x".repeat(61) }).expect(400);
    await send({ name: "Asha", lastName: "Rao", phone: "12345" }).expect(400);
    await send({ name: "Asha", lastName: "Rao", phone: "call me" }).expect(400);
    await send({ name: "Asha", lastName: "Rao", phone: Number(mobile) }).expect(400);

    const typed = `0${mobile.slice(0, 5)}-${mobile.slice(5)}`;
    const res = await send({ name: "Asha", lastName: " Rao ", phone: typed }).expect(200);
    expect(res.body).toMatchObject({
      name: "Asha",
      lastName: "Rao",
      phone: `+91${mobile}`,
      onboarded: false,
    });

    // Omitted fields are kept (older app builds send only `name`).
    await send({ name: "Ashwini" }).expect(200);
    const kept = await agent.get("/api/me").expect(200);
    expect(kept.body).toMatchObject({ name: "Ashwini", lastName: "Rao", phone: `+91${mobile}` });

    // Foreign numbers need the country code; "" or null clears the phone.
    const us = `+1415${randomDigits(7)}`;
    await send({ name: "Ashwini", phone: us }).expect(200);
    expect((await agent.get("/api/me")).body.phone).toBe(us);
    await send({ name: "Ashwini", phone: "" }).expect(200);
    expect((await agent.get("/api/me")).body.phone).toBeNull();
    await send({ name: "Ashwini", phone: us }).expect(200);
    await send({ name: "Ashwini", phone: null }).expect(200);
    expect((await agent.get("/api/me")).body.phone).toBeNull();
  });

  it("keeps each user's phone to themselves", async () => {
    const a = await t.signIn();
    const b = await t.signIn();
    await a.agent
      .patch("/api/profile/name")
      .send({ name: "A", lastName: "One", phone: indianMobile() })
      .expect(200);
    const other = await b.agent.get("/api/me").expect(200);
    expect(other.body).toMatchObject({ lastName: null, phone: null });
  });

  it("refuses a phone number another account already has", async () => {
    const a = await t.signIn();
    const b = await t.signIn();
    const mobile = indianMobile();
    await a.agent
      .patch("/api/profile/name")
      .send({ name: "A", lastName: "One", phone: mobile })
      .expect(200);

    // Same number, typed differently, from another account → 409; nothing else is saved.
    await b.agent
      .patch("/api/profile/name")
      .send({ name: "B", lastName: "Two", phone: `+91 ${mobile}` })
      .expect(409, { error: PHONE_TAKEN });
    expect((await b.agent.get("/api/me")).body).toMatchObject({ lastName: null, phone: null });

    // Saving your own number again is fine.
    await a.agent
      .patch("/api/profile/name")
      .send({ name: "A", lastName: "One", phone: mobile })
      .expect(200);
  });

  it("checks whether a phone number is free before Continue", async () => {
    await t.http().get("/api/profile/phone-check").query({ phone: indianMobile() }).expect(401);
    const a = await t.signIn();
    const b = await t.signIn();
    const mobile = indianMobile();
    await b.agent.get("/api/profile/phone-check").expect(400);
    await b.agent.get("/api/profile/phone-check").query({ phone: "123" }).expect(400);

    const free = await b.agent.get("/api/profile/phone-check").query({ phone: mobile }).expect(200);
    expect(free.body).toEqual({ phone: `+91${mobile}`, available: true });

    await a.agent
      .patch("/api/profile/name")
      .send({ name: "A", lastName: "One", phone: mobile })
      .expect(200);
    const taken = await b.agent
      .get("/api/profile/phone-check")
      .query({ phone: `+91${mobile}` })
      .expect(200);
    expect(taken.body).toEqual({ phone: `+91${mobile}`, available: false });
    // Your own number is available to you.
    const own = await a.agent.get("/api/profile/phone-check").query({ phone: mobile }).expect(200);
    expect(own.body.available).toBe(true);
  });

  it("saves reminder switches after onboarding", async () => {
    const { agent } = await t.signIn();
    await agent
      .patch("/api/profile/reminders")
      .send({ water: true })
      .expect(404, { error: "Finish onboarding first" });
    await onboard(agent);
    await agent.patch("/api/profile/reminders").send({ lunch: "yes" }).expect(400);
    await agent.patch("/api/profile/reminders").send({ weighIn: 1 }).expect(400);
    const res = await agent
      .patch("/api/profile/reminders")
      .send({ water: true, dinner: false })
      .expect(200);
    expect(res.body).toEqual({
      remindMeals: false,
      remindWater: true,
      remindWeighIn: false,
      remindLunch: expect.any(Boolean),
      remindDinner: false,
    });
  });

  it("saves Profile / Reminders' meal and weekly weigh-in switches, keeping older builds' lunch/dinner", async () => {
    const { agent } = await t.signIn();
    await onboard(agent);
    const res = await agent
      .patch("/api/profile/reminders")
      .send({ meals: true, weighIn: true })
      .expect(200);
    expect(res.body).toEqual({
      remindMeals: true,
      remindWater: false,
      remindWeighIn: true,
      remindLunch: false,
      remindDinner: false,
    });
    // An app build from before `meals` still toggles its own switches; the new ones are untouched.
    const legacy = await agent.patch("/api/profile/reminders").send({ lunch: true }).expect(200);
    expect(legacy.body).toMatchObject({
      remindMeals: true,
      remindWeighIn: true,
      remindLunch: true,
    });
    await agent.patch("/api/profile/reminders").send({ weighIn: false }).expect(200);
    const me = await agent.get("/api/me").expect(200);
    expect(me.body.profile).toMatchObject({
      remindMeals: true,
      remindWater: false,
      remindWeighIn: false,
      remindLunch: true,
      remindDinner: false,
    });
  });

  it("exports the caller's confirmed meals and weigh-ins as CSV", async () => {
    const { userId, agent } = await t.signIn();
    await onboard(agent);
    const stranger = await t.signIn();
    const meal = {
      date: new Date("2026-02-01T00:00:00.000Z"),
      mealType: "DINNER" as const,
      source: "TEXT" as const,
      status: "CONFIRMED" as const,
      note: 'with "extra" ghee, lots',
      items: {
        create: [
          {
            name: "dal tadka",
            quantity: 1,
            unit: "katori",
            grams: 150.4,
            kcal: 180.6,
            proteinG: 9.04,
            carbsG: 22.5,
            fatG: 6,
          },
        ],
      },
    };
    await t.prisma.mealLog.create({ data: { userId, ...meal } });
    await t.prisma.mealLog.create({
      data: { userId: stranger.userId, ...meal, note: "not yours" },
    });
    await t.prisma.mealLog.create({
      data: { userId, ...meal, status: "READY", note: "unconfirmed" },
    });

    const res = await agent.get("/api/export").expect(200);
    expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(res.headers["content-disposition"]).toMatch(
      /^attachment; filename="fitr8-export-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(res.headers["cache-control"]).toBe("no-store");
    const lines = res.text.trimEnd().split("\n");
    expect(lines[0]).toBe(
      "type,date,meal,item,quantity,unit,grams,kcal,protein_g,carbs_g,fat_g,note",
    );
    expect(lines[1]).toBe(
      'meal_item,2026-02-01,dinner,dal tadka,1,katori,150,181,9,22.5,6,"with ""extra"" ghee, lots"',
    );
    expect(lines[2]).toMatch(/^weigh_in,\d{4}-\d{2}-\d{2},,weight_kg,82,kg,,,,,,$/);
    expect(lines).toHaveLength(3);

    // A measurement-only day (no weight) and a weigh-in with circumferences.
    await t.prisma.bodyMetric.createMany({
      data: [
        { userId, date: new Date("2026-01-05"), chestCm: 104, armCm: 34 },
        {
          userId,
          date: new Date("2026-01-06"),
          weightKg: 83,
          waistCm: 90,
          neckCm: 38,
          bodyFatPct: 19.04,
        },
      ],
    });
    const more = (await agent.get("/api/export").expect(200)).text.trimEnd().split("\n");
    expect(more.slice(2, 4)).toEqual([
      "measurement,2026-01-05,,,,,,,,,,chest 104 cm; arms 34 cm",
      "weigh_in,2026-01-06,,weight_kg,83,kg,,,,,,waist 90 cm; neck 38 cm; body fat 19%",
    ]);
  });

  describe("profile photo", () => {
    const uuid = "0f8fad5b-d9cb-469f-a165-70867728950e";

    it("requires sign-in", async () => {
      await t
        .http()
        .post("/api/profile/photo/upload-url")
        .send({ contentType: "image/jpeg", sizeBytes: 1000 })
        .expect(401);
      await t
        .http()
        .put("/api/profile/photo")
        .send({ key: `avatars/x/${uuid}.jpg` })
        .expect(401);
      await t.http().delete("/api/profile/photo").expect(401);
    });

    it("rejects bad uploads, bad keys and other users' photos", async () => {
      const { agent } = await t.signIn();
      const { userId: other } = await t.signIn();
      await agent
        .post("/api/profile/photo/upload-url")
        .send({ contentType: "image/gif", sizeBytes: 10 })
        .expect(400);
      await agent
        .post("/api/profile/photo/upload-url")
        .send({ contentType: "image/jpeg", sizeBytes: 11 * 1024 * 1024 })
        .expect(400);
      await agent.put("/api/profile/photo").send({}).expect(400);
      await agent
        .put("/api/profile/photo")
        .send({ key: `meals/x/${uuid}.jpg` })
        .expect(400);
      await agent
        .put("/api/profile/photo")
        .send({ key: `avatars/x/../${uuid}.jpg` })
        .expect(400);
      await agent
        .put("/api/profile/photo")
        .send({ key: `avatars/${other}/${uuid}.jpg` })
        .expect(403);
    });

    it("signs an upload, shows the uploaded photo on /me, and removes it", async () => {
      const { userId, agent } = await t.signIn();
      const before = await agent.get("/api/me").expect(200);
      expect(before.body).toMatchObject({ image: null, hasPhoto: false });

      const signed = await agent
        .post("/api/profile/photo/upload-url")
        .send({ contentType: "image/jpeg", sizeBytes: 1000 })
        .expect(200);
      expect(signed.body.key).toMatch(new RegExp(`^avatars/${userId}/[0-9a-f-]{36}\\.jpg$`));
      expect(signed.body.uploadUrl).toEqual(expect.stringContaining(signed.body.key));
      expect(signed.body.expiresIn).toBe(300);

      const set = await agent.put("/api/profile/photo").send({ key: signed.body.key }).expect(200);
      expect(set.body.hasPhoto).toBe(true);
      expect(set.body.image).toEqual(expect.stringContaining(signed.body.key));
      const me = await agent.get("/api/me").expect(200);
      expect(me.body).toMatchObject({
        hasPhoto: true,
        image: expect.stringContaining(signed.body.key),
      });
      const row = await t.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(row.imageKey).toBe(signed.body.key);

      const removed = await agent.delete("/api/profile/photo").expect(200);
      expect(removed.body).toMatchObject({ image: null, hasPhoto: false });
    });

    it("falls back to the sign-in picture when no photo is uploaded", async () => {
      const { userId, agent } = await t.signIn();
      await t.prisma.user.update({
        where: { id: userId },
        data: { image: "https://lh3.googleusercontent.com/a/pic" },
      });
      const me = await agent.get("/api/me").expect(200);
      expect(me.body).toMatchObject({
        image: "https://lh3.googleusercontent.com/a/pic",
        hasPhoto: false,
      });
    });
  });
});
