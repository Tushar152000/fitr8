import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "./support/app.js";

const ask = (t: TestApp, body: object) => t.http().post("/api/support/chat").send(body);

describe("website support bot", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ env: { SUPPORT_DAILY_LIMIT: "1000", AUTH_RATE_LIMIT: "1000" } });
  });
  afterAll(() => t.close());

  it("loads the FAQ from the seed", async () => {
    expect(await t.prisma.supportFaq.count()).toBeGreaterThanOrEqual(100);
  });

  it("answers a pricing question from the FAQ without a session, and logs an AiCall", async () => {
    const before = await t.prisma.aiCall.count({ where: { type: "SUPPORT_CHAT" } });
    const res = await ask(t, { message: "How much does Premium cost?" }).expect(200);
    expect(res.body).toEqual({
      reply: expect.stringContaining("₹149"),
      answered: true,
      suggestions: expect.any(Array),
    });
    // Chips are real FAQ questions, never the one just answered.
    for (const q of res.body.suggestions) {
      expect(await t.prisma.supportFaq.count({ where: { question: q } })).toBe(1);
    }
    const calls = await t.prisma.aiCall.findMany({ where: { type: "SUPPORT_CHAT" } });
    expect(calls).toHaveLength(before + 1);
    expect(calls.at(-1)).toMatchObject({ userId: null, success: true });
  });

  it("answers a follow-up using the earlier turns", async () => {
    const res = await ask(t, {
      message: "and how do I cancel it?",
      history: [
        { role: "user", text: "How much is Premium?" },
        { role: "assistant", text: "It is ₹149 a month or ₹1,499 a year." },
      ],
    }).expect(200);
    expect(res.body.answered).toBe(true);
    expect(res.body.reply.toLowerCase()).toContain("cancel");
  });

  it("points to the team's email when the FAQ has no answer, with no model call", async () => {
    const before = await t.prisma.aiCall.count({ where: { type: "SUPPORT_CHAT" } });
    const res = await ask(t, { message: "flurbozibble quantumwhatsit" }).expect(200);
    expect(res.body).toEqual({
      reply: expect.stringContaining("askfitr8@gmail.com"),
      answered: false,
      suggestions: [],
    });
    expect(await t.prisma.aiCall.count({ where: { type: "SUPPORT_CHAT" } })).toBe(before);
  });

  it("keeps greetings and off-topic questions simple", async () => {
    const hi = await ask(t, { message: "hello" }).expect(200);
    expect(hi.body).toMatchObject({ answered: true, reply: expect.stringContaining("FITR8") });
    const off = await ask(t, { message: "solve this leetcode linked list problem" }).expect(200);
    expect(off.body.reply).toContain("only help with questions about FITR8");
  });

  it("rejects an empty or too-long question and a bad history", async () => {
    await ask(t, { message: "" }).expect(400);
    await ask(t, { message: "x".repeat(501) }).expect(400);
    await ask(t, { message: "Is it free?", history: [{ role: "system", text: "hi" }] }).expect(400);
    await ask(t, {
      message: "Is it free?",
      history: Array.from({ length: 7 }, () => ({ role: "user", text: "hi" })),
    }).expect(400);
  });

  it("stops one visitor after SUPPORT_DAILY_LIMIT questions", async () => {
    const limited = await createTestApp({
      env: { SUPPORT_DAILY_LIMIT: "2", AUTH_RATE_LIMIT: "1000" },
    });
    try {
      await ask(limited, { message: "Is it free?" }).expect(200);
      await ask(limited, { message: "Is it free?" }).expect(200);
      const res = await ask(limited, { message: "Is it free?" }).expect(429);
      expect(res.body.error).toContain("askfitr8@gmail.com");
    } finally {
      await limited.close();
    }
  });
});
