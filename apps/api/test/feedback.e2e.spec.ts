import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "./support/app.js";

/** Help & support "Send feedback" (POST /api/feedback) and the admin's Feedback section. */
describe("feedback", () => {
  let t: TestApp;
  const adminEmail = `feedback-admin-${randomUUID()}@test.fitlens`;

  beforeAll(async () => {
    t = await createTestApp({ env: { ADMIN_EMAILS: adminEmail } });
  });
  afterAll(() => t.close());

  async function staff(email: string, name = "Staff Person") {
    const agent = t.browser();
    await agent.post("/api/auth/dev").send({ email, name }).expect(200);
    return agent;
  }

  it("requires sign-in", async () => {
    await t.http().post("/api/feedback").send({ message: "Love it" }).expect(401);
    await t.http().get("/api/admin/feedback").expect(401);
  });

  it("validates the message, topic and platform", async () => {
    const { agent } = await t.signIn();
    await agent.post("/api/feedback").send({}).expect(400);
    await agent.post("/api/feedback").send({ message: "   " }).expect(400);
    await agent
      .post("/api/feedback")
      .send({ message: "x".repeat(2001) })
      .expect(400);
    await agent
      .post("/api/feedback")
      .send({ message: "Nice", topic: "t".repeat(41) })
      .expect(400);
    await agent.post("/api/feedback").send({ message: "Nice", platform: "windows" }).expect(400);
  });

  it("stores feedback and limits how much one account sends in an hour", async () => {
    const { agent, userId } = await t.signIn();
    const res = await agent
      .post("/api/feedback")
      .send({
        message: "  The meal scan is great, please add dark mode.  ",
        topic: "Idea",
        appVersion: "0.5.0 (42)",
        platform: "android",
      })
      .expect(201);
    expect(res.body).toEqual({ id: expect.any(String), createdAt: expect.any(String) });
    const row = await t.prisma.feedback.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row).toMatchObject({
      userId,
      message: "The meal scan is great, please add dark mode.",
      topic: "Idea",
      appVersion: "0.5.0 (42)",
      platform: "android",
    });

    for (let i = 0; i < 4; i++) {
      await agent
        .post("/api/feedback")
        .send({ message: `More ${i}` })
        .expect(201);
    }
    await agent.post("/api/feedback").send({ message: "One too many" }).expect(429);
  });

  it("lists feedback for admins only, newest first with the sender", async () => {
    const user = await t.signIn("Feedback Sender");
    const sent = await user.agent
      .post("/api/feedback")
      .send({ message: `Newest ${randomUUID()}`, platform: "ios" })
      .expect(201);

    // Signed in but not staff → 403 from the guard; an editor → 403 from the role rule.
    await user.agent.get("/api/admin/feedback").expect(403);
    const admin = await staff(adminEmail, "Feedback Admin");
    const editorEmail = `feedback-editor-${randomUUID()}@test.fitlens`;
    await admin.post("/api/admin/staff").send({ email: editorEmail, role: "EDITOR" }).expect(201);
    const editor = await staff(editorEmail);
    const editorMe = await editor.get("/api/admin/me").expect(200);
    expect(editorMe.body.sections.feedback).toEqual({ read: false });
    await editor.get("/api/admin/feedback").expect(403);

    const me = await admin.get("/api/admin/me").expect(200);
    expect(me.body.sections.feedback).toEqual({ read: true });
    await admin.get("/api/admin/feedback?page=0").expect(400);
    const page = await admin.get("/api/admin/feedback").expect(200);
    expect(page.headers["cache-control"]).toContain("no-store");
    expect(page.body).toMatchObject({ page: 1, pages: expect.any(Number) });
    expect(page.body.total).toBeGreaterThanOrEqual(1);
    expect(page.body.items[0]).toEqual({
      id: sent.body.id,
      message: expect.stringMatching(/^Newest /),
      topic: null,
      appVersion: null,
      platform: "ios",
      createdAt: sent.body.createdAt,
      user: { id: user.userId, email: expect.any(String), name: "Feedback Sender" },
    });
  });
});
