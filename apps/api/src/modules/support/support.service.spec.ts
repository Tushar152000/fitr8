import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../common/errors.js";
import type { Env } from "../../config/config.module.js";
import type { PrismaService } from "../../infra/prisma/prisma.service.js";
import type { SupportAnswerer, SupportModelReply } from "../ai/index.js";
import { SupportFaqService } from "./support-faq.service.js";
import { SUPPORT_REPLIES, SupportService } from "./support.service.js";

const FREE = { slug: "free", question: "Is FITR8 free?", answer: "Yes, you can start free." };
const PRICE = { slug: "price", question: "How much is Premium?", answer: "₹149 a month." };
const CANCEL = { slug: "cancel", question: "How do I cancel?", answer: "In the store settings." };
const KNOWLEDGE = [FREE, PRICE, CANCEL];

interface Opts {
  matches?: (typeof FREE)[];
  grounding?: "all" | "matches";
  model?: Partial<SupportModelReply>;
  fails?: boolean;
  limit?: number;
}

function setup(opts: Opts = {}) {
  const calls: unknown[] = [];
  const prisma = { aiCall: { create: vi.fn(async (a: unknown) => calls.push(a)) } };
  const search = vi.fn(async (_text: string) => opts.matches ?? [FREE]);
  const all = vi.fn(async () => KNOWLEDGE);
  const answer = vi.fn(async () => {
    if (opts.fails) throw new Error("model down");
    return {
      data: { reply: "Yes, it's free.", followUps: [], noAnswer: false, ...opts.model },
      usage: { provider: "t", model: "m", latencyMs: 5 },
    };
  });
  const answerer = { name: "t", grounding: opts.grounding ?? "all", answer } as SupportAnswerer;
  const service = new SupportService(
    { SUPPORT_DAILY_LIMIT: opts.limit ?? 3 } as Env,
    prisma as unknown as PrismaService,
    { search, all } as unknown as SupportFaqService,
    answerer,
  );
  return { service, search, answer, calls };
}

const ask = (message: string, history: { role: "user" | "assistant"; text: string }[] = []) => ({
  message,
  history,
});

describe("SupportService", () => {
  it("gives the model the whole FAQ and logs one AiCall without the visitor's words", async () => {
    const { service, answer, calls } = setup();
    const res = await service.chat(ask("Is it free?"), "1.1.1.1");
    expect(res).toMatchObject({ reply: "Yes, it's free.", answered: true });
    expect(answer).toHaveBeenCalledWith(expect.objectContaining({ knowledge: KNOWLEDGE }));
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls)).not.toContain("Is it free");
    expect(calls[0]).toMatchObject({ data: { type: "SUPPORT_CHAT", success: true } });
  });

  it("asks the model even when the keyword search finds nothing (it reads the whole FAQ)", async () => {
    const { service, answer } = setup({ matches: [] });
    const res = await service.chat(ask("any cost to begin?"), "1.1.1.1");
    expect(answer).toHaveBeenCalledOnce();
    expect(res.answered).toBe(true);
  });

  it("turns the model's NO_ANSWER into the not-sure reply, answered false", async () => {
    const { service } = setup({ model: { reply: "", noAnswer: true } });
    expect(await service.chat(ask("what is the weather?"), "1.1.1.1")).toEqual({
      reply: SUPPORT_REPLIES.notSure,
      answered: false,
      suggestions: [],
    });
  });

  it("keeps only follow-ups that are real FAQ questions, case-insensitively, at most three", async () => {
    const { service } = setup({
      model: { followUps: ["how much is premium?", "Made up question?", "How do I cancel?"] },
    });
    const res = await service.chat(ask("Is it free?"), "1.1.1.1");
    expect(res.suggestions).toEqual(["How much is Premium?", "How do I cancel?"]);
  });

  it("falls back to the other search matches when the model gives no usable follow-ups", async () => {
    const { service } = setup({ matches: [FREE, PRICE, CANCEL] });
    const res = await service.chat(ask("Is it free?"), "1.1.1.1");
    expect(res.suggestions).toEqual(["How much is Premium?", "How do I cancel?"]);
  });

  it("without a model that reads the whole FAQ, no search match means not sure and no model call", async () => {
    const { service, answer } = setup({ grounding: "matches", matches: [] });
    expect(await service.chat(ask("flurbo zibble"), "1.1.1.1")).toEqual({
      reply: SUPPORT_REPLIES.notSure,
      answered: false,
      suggestions: [],
    });
    expect(answer).not.toHaveBeenCalled();
  });

  it("answers greetings, thanks and off-topic questions without searching or calling the model", async () => {
    const { service, search, answer } = setup();
    expect((await service.chat(ask("Hello!"), "1.1.1.1")).reply).toBe(SUPPORT_REPLIES.greeting);
    expect((await service.chat(ask("thanks"), "1.1.1.1")).reply).toBe(SUPPORT_REPLIES.thanks);
    expect(
      (await service.chat(ask("write a python function for a linked list"), "1.1.1.1")).reply,
    ).toBe(SUPPORT_REPLIES.offTopic);
    expect(search).not.toHaveBeenCalled();
    expect(answer).not.toHaveBeenCalled();
  });

  it("searches the new message alone first, and adds the previous question only when that finds nothing", async () => {
    const history = [
      { role: "user" as const, text: "Does FITR8 work on iPhone?" },
      { role: "assistant" as const, text: "Yes." },
    ];
    const first = setup();
    await first.service.chat(ask("and on Android?", history), "1.1.1.1");
    expect(first.search).toHaveBeenCalledTimes(1);
    expect(first.search).toHaveBeenCalledWith("and on Android?");

    const followUp = setup();
    followUp.search.mockResolvedValueOnce([]).mockResolvedValueOnce([FREE]);
    await followUp.service.chat(ask("and on Android?", history), "1.1.1.1");
    expect(followUp.search).toHaveBeenLastCalledWith("and on Android? Does FITR8 work on iPhone?");
  });

  it("turns a model failure into a kind 502 and logs it as failed", async () => {
    const { service, calls } = setup({ fails: true });
    const err = await service.chat(ask("Is it free?"), "1.1.1.1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ status: 502, message: SUPPORT_REPLIES.unavailable });
    expect(calls[0]).toMatchObject({ data: { success: false, error: "model down" } });
  });

  it("allows SUPPORT_DAILY_LIMIT questions per IP per day, then 429; other IPs and the next day are fine", async () => {
    const { service } = setup({ limit: 2 });
    const t0 = 1_700_000_000_000;
    await service.chat(ask("Is it free?"), "1.1.1.1", t0);
    await service.chat(ask("Is it free?"), "1.1.1.1", t0 + 1000);
    await expect(service.chat(ask("Is it free?"), "1.1.1.1", t0 + 2000)).rejects.toMatchObject({
      status: 429,
    });
    await expect(service.chat(ask("Is it free?"), "2.2.2.2", t0 + 2000)).resolves.toBeTruthy();
    await expect(
      service.chat(ask("Is it free?"), "1.1.1.1", t0 + 25 * 60 * 60 * 1000),
    ).resolves.toBeTruthy();
  });
});
