import { Injectable, Logger } from "@nestjs/common";
import {
  RazorpayWebhookSchema,
  type RazorpayCheckoutDto,
  type RazorpaySubscribeInput,
} from "@fitr8/contracts";
import { Prisma } from "@fitr8/db";
import { accessFromRazorpay, isPro, TRIAL_DAYS } from "@fitr8/domain/billing";
import { AppError } from "../../common/errors.js";
import { InjectEnv, type Env } from "../../config/config.module.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import {
  InjectRazorpay,
  RazorpayError,
  verifyWebhookSignature,
  type RazorpayApi,
  type RazorpaySubscription,
} from "./razorpay.js";

const DAY_MS = 86_400_000;
/** Razorpay stops charging after this many cycles (10 years); a subscriber is asked to renew then. */
const TOTAL_COUNT = { month: 120, year: 10 } as const;
/** A checkout link, and a not-yet-paid subscription, are good for a day. */
const CHECKOUT_TTL_S = 24 * 3600;
/** Subscriptions still worth asking Razorpay about (the rest are over). */
const LIVE = ["created", "authenticated", "active", "pending", "paused", "halted"];

const PRODUCT = { month: "fitr8_pro_monthly", year: "fitr8_pro_yearly" } as const;
const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

/**
 * Razorpay Subscriptions for FITR8 Premium (docs/PREMIUM.md "Razorpay"). Razorpay is always the
 * source of truth: every webhook and every refresh re-reads the subscription from Razorpay, stores
 * what it grants on the `razorpay_subscriptions` row, and the user's entitlement becomes the row
 * that grants Premium the longest. The checkout runs on Razorpay's hosted page, so no card or UPI
 * detail ever reaches FITR8.
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectRazorpay() private readonly razorpay: RazorpayApi,
    @InjectEnv() private readonly env: Env,
  ) {}

  get enabled(): boolean {
    return this.razorpay.enabled;
  }

  /** The 7-day trial is once per person: any subscription they authorised before used it. */
  async trialEligible(userId: string): Promise<boolean> {
    if (!this.enabled) return false;
    const used = await this.prisma.razorpaySubscription.count({
      where: { userId, status: { not: "created" } },
    });
    return used === 0;
  }

  /** POST /billing/razorpay/subscription: a Razorpay checkout page for the plan picked. */
  async checkout(userId: string, { period }: RazorpaySubscribeInput): Promise<RazorpayCheckoutDto> {
    this.require();
    await this.refresh(userId); // an older checkout may have been paid since: never charge twice

    const ent = await this.prisma.entitlement.findUnique({ where: { userId } });
    if (ent && ent.store !== "TEST" && isPro(ent)) {
      throw new AppError(409, "You already have FITR8 Premium.");
    }

    const trial = await this.trialEligible(userId);
    const pending = await this.prisma.razorpaySubscription.findFirst({
      where: {
        userId,
        period,
        status: "created",
        createdAt: { gt: new Date(Date.now() - (CHECKOUT_TTL_S - 3600) * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (pending) {
      // The same unpaid checkout again, unless it has been paid or abandoned since.
      const sub = await this.call(() => this.razorpay.fetchSubscription(pending.id));
      await this.store(pending.id, sub);
      if (sub.status === "created" && sub.short_url && pending.trial === trial) {
        return { subscriptionId: sub.id, checkoutUrl: sub.short_url, period, trialDays: trial ? TRIAL_DAYS : 0 };
      }
    }

    const planId = period === "year" ? this.razorpay.yearlyPlanId : this.razorpay.monthlyPlanId;
    const now = Math.floor(Date.now() / 1000);
    const sub = await this.call(() =>
      this.razorpay.createSubscription({
        planId: planId!,
        totalCount: TOTAL_COUNT[period],
        startAt: trial ? now + TRIAL_DAYS * 86_400 : undefined,
        expireBy: now + CHECKOUT_TTL_S,
        notes: { userId, period },
      }),
    );
    if (!sub.short_url) throw new AppError(502, "Couldn't start the payment. Try again in a moment.");
    await this.prisma.razorpaySubscription.create({
      data: { id: sub.id, userId, period, planId: planId!, status: sub.status, trial },
    });
    this.logger.log(`razorpay subscription ${sub.id}: ${period}${trial ? " with trial" : ""} for ${userId}`);
    return { subscriptionId: sub.id, checkoutUrl: sub.short_url, period, trialDays: trial ? TRIAL_DAYS : 0 };
  }

  /**
   * POST /billing/razorpay/cancel: stop renewing. A paid subscription keeps Premium until the end of
   * the period paid for; one still in its free trial ends at once (nothing was charged).
   */
  async cancel(userId: string): Promise<void> {
    this.require();
    await this.refresh(userId);
    const row = await this.prisma.razorpaySubscription.findFirst({
      where: { userId, status: { in: ["authenticated", "active", "pending", "halted", "paused"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!row) throw new AppError(404, "You have no FITR8 Premium subscription to cancel.");

    const live = await this.call(() => this.razorpay.fetchSubscription(row.id));
    const atCycleEnd = live.status === "active";
    const cancelled = await this.call(() => this.razorpay.cancelSubscription(row.id, atCycleEnd)).catch(
      async (err: AppError) => {
        // Already cancelled (a double tap, or from the Razorpay dashboard): fine, just re-read it.
        const again = await this.call(() => this.razorpay.fetchSubscription(row.id));
        if (["cancelled", "completed", "expired"].includes(again.status) || again.has_scheduled_changes)
          return again;
        throw err;
      },
    );
    await this.prisma.razorpaySubscription.update({
      where: { id: row.id },
      data: { cancelRequested: true },
    });
    await this.store(row.id, cancelled);
    await this.recompute(userId);
  }

  /**
   * Account deletion: end every open subscription now, so nobody is charged for an account that no
   * longer exists. Refuses (502) when Razorpay can't be reached, so the deletion can be retried.
   */
  async cancelAllForDeletion(userId: string): Promise<void> {
    const rows = await this.prisma.razorpaySubscription.findMany({
      where: { userId, status: { in: LIVE } },
    });
    if (rows.length && !this.enabled) {
      this.logger.error(`Razorpay is off but ${userId} has open subscriptions: cancel them in the Razorpay dashboard`);
      return;
    }
    for (const row of rows) {
      const sub = await this.call(() => this.razorpay.fetchSubscription(row.id));
      if (["cancelled", "completed", "expired"].includes(sub.status)) continue;
      await this.call(() => this.razorpay.cancelSubscription(row.id, false)).catch(async (err: AppError) => {
        const again = await this.call(() => this.razorpay.fetchSubscription(row.id));
        if (!["cancelled", "completed", "expired"].includes(again.status)) throw err;
      });
    }
  }

  /** After checkout (or any time): re-read this user's open subscriptions from Razorpay. */
  async refresh(userId: string): Promise<void> {
    if (!this.enabled) return;
    const rows = await this.prisma.razorpaySubscription.findMany({
      where: { userId, status: { in: LIVE } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    for (const row of rows) {
      const sub = await this.call(() => this.razorpay.fetchSubscription(row.id));
      await this.store(row.id, sub);
    }
    if (rows.length) await this.recompute(userId);
  }

  // ── Webhook ────────────────────────────────────────────────────────────

  /**
   * POST /billing/razorpay. Public; authenticated by the HMAC signature of the raw body. At-least-once:
   * an event id handled before is acknowledged and skipped. Never trusts the payload's state: the
   * subscription is re-read from Razorpay (a failure answers 502 so Razorpay retries for a day).
   */
  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    eventId: string | undefined,
    body: unknown,
  ): Promise<{ ok: true }> {
    const secret = this.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new AppError(503, "Billing webhook is not configured");
    if (!rawBody || !verifyWebhookSignature(rawBody, signature, secret)) {
      throw new AppError(401, "Unauthorized");
    }

    const { event, payload } = RazorpayWebhookSchema.parse(body);
    const id = eventId ? `rzp_${eventId.slice(0, 120)}` : null;
    if (id && (await this.prisma.billingEvent.findUnique({ where: { id } }))) return { ok: true };

    const subId = payload.subscription?.entity.id;
    let userId: string | null = null;
    if (event.startsWith("subscription.") && subId) {
      const row = await this.prisma.razorpaySubscription.findUnique({ where: { id: subId } });
      if (row) {
        userId = row.userId;
        const sub = await this.call(() => this.razorpay.fetchSubscription(subId));
        await this.store(subId, sub);
        await this.recompute(row.userId);
      } else {
        this.logger.warn(`Razorpay ${event} for unknown subscription ${subId}`);
      }
    }

    if (id) {
      await this.prisma.billingEvent.create({ data: { id, type: event, userId } }).catch((err) => {
        if (!isUniqueViolation(err)) throw err;
      });
    }
    return { ok: true };
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private require() {
    if (!this.enabled) throw new AppError(404, "Payments aren't available yet.");
  }

  /** Razorpay trouble is a 502 the app can retry; never a raw upstream error. */
  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof RazorpayError) {
        this.logger.warn(err.message);
        throw new AppError(502, "Couldn't reach the payment provider. Try again in a moment.");
      }
      throw err;
    }
  }

  /** Saves a subscription's status and what it grants on its row. */
  private async store(id: string, sub: RazorpaySubscription) {
    const access = accessFromRazorpay(sub);
    await this.prisma.razorpaySubscription.update({
      where: { id },
      data: {
        status: sub.status,
        proUntil: access?.proUntil ?? null,
        willRenew: access?.willRenew ?? false,
        inTrial: access?.trial ?? false,
      },
    });
  }

  /**
   * The user's Razorpay entitlement = the subscription that grants Premium the longest, so an old
   * cancelled subscription's late event can't undo a new one. None grants it: end Razorpay access.
   * An App Store / Play entitlement that lasts longer is left alone.
   */
  private async recompute(userId: string) {
    const best = await this.prisma.razorpaySubscription.findFirst({
      where: { userId, proUntil: { not: null } },
      orderBy: { proUntil: "desc" },
    });
    const now = new Date();
    const current = await this.prisma.entitlement.findUnique({ where: { userId } });

    if (!best?.proUntil) {
      if (current?.store === "RAZORPAY") {
        await this.prisma.entitlement.update({
          where: { userId },
          data: { proUntil: null, willRenew: false, syncedAt: now },
        });
      }
      return;
    }
    if (
      current &&
      current.store !== "RAZORPAY" &&
      current.store !== "TEST" &&
      isPro(current, now) &&
      (current.lifetime || (current.proUntil !== null && current.proUntil >= best.proUntil))
    ) {
      return;
    }
    const data = {
      proUntil: best.proUntil,
      lifetime: false,
      willRenew: best.willRenew,
      productId: PRODUCT[best.period === "year" ? "year" : "month"],
      store: "RAZORPAY",
      periodType: best.inTrial ? "TRIAL" : "NORMAL",
      environment: this.razorpay.sandbox ? "SANDBOX" : "PRODUCTION",
      syncedAt: now,
    };
    await this.prisma.entitlement.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
