import { Inject } from "@nestjs/common";
import { createHmac } from "node:crypto";
import type { RazorpaySubscriptionState } from "@fitr8/domain/billing";
import { safeEqual } from "../../common/crypto.js";

/** A subscription as Razorpay reports it (the fields we read; Unix seconds). */
export interface RazorpaySubscription extends RazorpaySubscriptionState {
  id: string;
  plan_id: string;
  short_url?: string | null;
}

export interface CreateSubscription {
  planId: string;
  /** Number of billing cycles Razorpay will charge before it ends the subscription. */
  totalCount: number;
  /** First charge (Unix seconds) when a free trial applies; omitted = charge on authorisation. */
  startAt?: number;
  /** The checkout link stops working after this (Unix seconds). */
  expireBy: number;
  notes: Record<string, string>;
}

/** Port for Razorpay's REST API. Tests swap in a fake; feature code never calls fetch. */
export interface RazorpayApi {
  /** False unless every RAZORPAY_* setting is present. */
  readonly enabled: boolean;
  /** "rzp_test_…" keys talk to Razorpay's sandbox. */
  readonly sandbox: boolean;
  readonly monthlyPlanId: string | null;
  readonly yearlyPlanId: string | null;
  createSubscription(input: CreateSubscription): Promise<RazorpaySubscription>;
  fetchSubscription(id: string): Promise<RazorpaySubscription>;
  /** Ends the subscription now, or when the paid period ends (`atCycleEnd`, active ones only). */
  cancelSubscription(id: string, atCycleEnd: boolean): Promise<RazorpaySubscription>;
}

export const RAZORPAY = Symbol("RAZORPAY");
export const InjectRazorpay = () => Inject(RAZORPAY);

export class RazorpayError extends Error {
  override name = "RazorpayError";
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** Razorpay signs each webhook with HMAC-SHA256 of the raw body, hex, in X-Razorpay-Signature. */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(signature, expected);
}

/** https://razorpay.com/docs/api/payments/subscriptions/ — Basic auth with the key id and secret. */
export class RazorpayClient implements RazorpayApi {
  constructor(
    private readonly config: {
      keyId?: string;
      keySecret?: string;
      planMonthly?: string;
      planYearly?: string;
      fetch?: typeof fetch;
      timeoutMs?: number;
    },
  ) {}

  get enabled() {
    const c = this.config;
    return Boolean(c.keyId && c.keySecret && c.planMonthly && c.planYearly);
  }
  get sandbox() {
    return (this.config.keyId ?? "").startsWith("rzp_test_");
  }
  get monthlyPlanId() {
    return this.config.planMonthly ?? null;
  }
  get yearlyPlanId() {
    return this.config.planYearly ?? null;
  }

  createSubscription(input: CreateSubscription) {
    return this.call("POST", "/subscriptions", {
      plan_id: input.planId,
      total_count: input.totalCount,
      quantity: 1,
      customer_notify: 1,
      expire_by: input.expireBy,
      ...(input.startAt ? { start_at: input.startAt } : {}),
      notes: input.notes,
    });
  }

  fetchSubscription(id: string) {
    return this.call("GET", `/subscriptions/${encodeURIComponent(id)}`);
  }

  cancelSubscription(id: string, atCycleEnd: boolean) {
    return this.call("POST", `/subscriptions/${encodeURIComponent(id)}/cancel`, {
      cancel_at_cycle_end: atCycleEnd ? 1 : 0,
    });
  }

  private async call(method: "GET" | "POST", path: string, body?: object): Promise<RazorpaySubscription> {
    if (!this.enabled) throw new RazorpayError("Razorpay is not configured");
    const auth = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64");
    let res: Response;
    try {
      res = await (this.config.fetch ?? fetch)(`https://api.razorpay.com/v1${path}`, {
        method,
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 10_000),
      });
    } catch {
      throw new RazorpayError("Couldn't reach Razorpay");
    }
    const json = (await res.json().catch(() => null)) as
      | (Partial<RazorpaySubscription> & { error?: { description?: string } })
      | null;
    if (!res.ok || !json?.id || !json.status) {
      throw new RazorpayError(
        `Razorpay ${method} ${path.replace(/sub_\w+/, "sub_…")}: ${res.status} ${json?.error?.description ?? ""}`.trim(),
        res.status,
      );
    }
    return json as RazorpaySubscription;
  }
}
