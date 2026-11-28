import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SupportChatInput, SupportChatReply } from "@fitr8/contracts";
import { AppError } from "../../common/errors.js";
import { InjectEnv, type Env } from "../../config/config.module.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { SUPPORT_ANSWERER, type SupportAnswerer } from "../ai/index.js";
import { isOffTopic } from "../coach/scope.js";
import { SupportFaqService } from "./support-faq.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL = "askfitr8@gmail.com";
const MAX_SUGGESTIONS = 3;

export const SUPPORT_REPLIES = {
  greeting:
    "Hi! I'm the FITR8 help assistant. Ask me anything about FITR8: how it works, the Premium plan, " +
    "your data or your account.",
  thanks: "You're welcome! Ask me anything else about FITR8.",
  offTopic:
    "I can only help with questions about FITR8: how it works, plans and pricing, your data and " +
    "your account. What would you like to know?",
  notSure: `I'm not sure about that one. Please email us at ${EMAIL} and the team will help.`,
  unavailable: `I can't answer right now. Please try again in a moment, or email us at ${EMAIL}.`,
} as const;

const GREETING = /^(hi+|hello+|hey+|hola|namaste|yo|good (morning|afternoon|evening))\b[\s!.?]*$/i;
const THANKS = /^(thanks?( you)?|thank u|thx|ok(ay)?|cool|great|got it|bye)\b[\s!.?]*$/i;

const reply = (text: string, answered: boolean, suggestions: string[] = []): SupportChatReply => ({
  reply: text,
  answered,
  suggestions,
});

/**
 * The website support bot. The model reads the whole FAQ (cached in its prompt) and answers from it,
 * or says it can't (NO_ANSWER), which the widget turns into "send this to the team". Small talk and
 * off-topic questions are answered without a model call. Without a key (AI_PROVIDER=mock) only the
 * keyword-search matches are used. Nothing is stored except an `AiCall` row (no visitor text).
 * Abuse limits: SUPPORT_DAILY_LIMIT per IP (in memory, per process, like the global throttler), the
 * strict per-minute rate limit on the route, and input size caps.
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  /** Question times per client IP within the last day. */
  private readonly recent = new Map<string, number[]>();

  constructor(
    @InjectEnv() private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly faqs: SupportFaqService,
    @Inject(SUPPORT_ANSWERER) private readonly answerer: SupportAnswerer,
  ) {}

  async chat(input: SupportChatInput, ip: string, now = Date.now()): Promise<SupportChatReply> {
    this.claimSlot(ip, now);
    const { message, history } = input;

    if (GREETING.test(message)) return reply(SUPPORT_REPLIES.greeting, true);
    if (THANKS.test(message)) return reply(SUPPORT_REPLIES.thanks, true);
    if (isOffTopic(message)) return reply(SUPPORT_REPLIES.offTopic, true);

    // Search the new message alone first. Only when that finds nothing is it a follow-up ("and on
    // Android?"), so the visitor's previous question is added; this keeps a stray word from
    // inheriting the last topic.
    let matches = await this.faqs.search(message);
    if (!matches.length) {
      const last = [...history].reverse().find((t) => t.role === "user")?.text;
      if (last) matches = await this.faqs.search(`${message} ${last}`);
    }
    // Without a model that reads the whole FAQ, no match means no answer.
    if (this.answerer.grounding === "matches" && !matches.length) {
      return reply(SUPPORT_REPLIES.notSure, false);
    }

    const knowledge = await this.faqs.all();
    const started = Date.now();
    try {
      const { data, usage } = await this.answerer.answer({ knowledge, matches, history, message });
      await this.logCall(usage, true);
      if (data.noAnswer || !data.reply) return reply(SUPPORT_REPLIES.notSure, false);
      return reply(data.reply, true, this.suggestions(data.followUps, matches, knowledge));
    } catch (err) {
      this.logger.error({ err }, "support answer failed");
      await this.logCall(
        { provider: this.answerer.name, model: "unknown", latencyMs: Date.now() - started },
        false,
        err,
      );
      throw new AppError(502, SUPPORT_REPLIES.unavailable);
    }
  }

  /**
   * Follow-up chips: the model's suggestions that are real FAQ questions (so each one is answerable),
   * else the other search matches. Never the question just answered.
   */
  private suggestions(
    followUps: string[],
    matches: { question: string }[],
    knowledge: { question: string }[],
  ): string[] {
    const real = new Map(knowledge.map((f) => [f.question.toLowerCase(), f.question]));
    const fromModel = followUps.flatMap((q) => real.get(q.toLowerCase()) ?? []);
    const pool = fromModel.length ? fromModel : matches.slice(1).map((m) => m.question);
    return [...new Set(pool)].slice(0, MAX_SUGGESTIONS);
  }

  private logCall(
    usage: {
      provider: string;
      model: string;
      tokensIn?: number;
      tokensOut?: number;
      latencyMs: number;
    },
    success: boolean,
    err?: unknown,
  ) {
    return this.prisma.aiCall.create({
      data: {
        type: "SUPPORT_CHAT",
        provider: usage.provider,
        model: usage.model,
        tokensIn: usage.tokensIn,
        tokensOut: usage.tokensOut,
        latencyMs: usage.latencyMs,
        success,
        error: err ? (err instanceof Error ? err.message : String(err)).slice(0, 500) : undefined,
      },
    });
  }

  /** Counts this question against the IP's daily budget, or throws 429 when it's used up. */
  private claimSlot(ip: string, now: number) {
    const since = now - DAY_MS;
    const times = (this.recent.get(ip) ?? []).filter((t) => t > since);
    if (times.length >= this.env.SUPPORT_DAILY_LIMIT) {
      this.recent.set(ip, times);
      throw new AppError(
        429,
        `You've asked a lot of questions today. Please try again tomorrow, or email us at ${EMAIL}.`,
      );
    }
    times.push(now);
    this.recent.set(ip, times);
    // Keep the map from growing forever: drop IPs with nothing in the window.
    if (this.recent.size > 10_000) {
      for (const [key, list] of this.recent) {
        if (!list.some((t) => t > since)) this.recent.delete(key);
      }
    }
  }
}
