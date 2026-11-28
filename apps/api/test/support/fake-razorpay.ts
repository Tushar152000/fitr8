import { randomUUID } from "node:crypto";
import {
  RazorpayError,
  type CreateSubscription,
  type RazorpayApi,
  type RazorpaySubscription,
} from "../../src/modules/billing/razorpay.js";

/**
 * Stands in for Razorpay's REST API. Off by default; set `enabled` to turn Razorpay on, then drive a
 * subscription's state with `set(id, {...})` to simulate the customer paying, a failed charge, etc.
 */
export class FakeRazorpay implements RazorpayApi {
  enabled = false;
  sandbox = true;
  monthlyPlanId = "plan_month";
  yearlyPlanId = "plan_year";
  /** When set, every call throws as if Razorpay were down. */
  down = false;
  readonly created: CreateSubscription[] = [];
  readonly cancels: { id: string; atCycleEnd: boolean }[] = [];
  readonly subs = new Map<string, RazorpaySubscription>();

  set(id: string, patch: Partial<RazorpaySubscription>) {
    this.subs.set(id, { ...this.subs.get(id)!, ...patch });
  }

  async createSubscription(input: CreateSubscription): Promise<RazorpaySubscription> {
    this.check();
    this.created.push(input);
    const id = `sub_${randomUUID().replace(/-/g, "").slice(0, 14)}`;
    const sub: RazorpaySubscription = {
      id,
      plan_id: input.planId,
      status: "created",
      start_at: input.startAt ?? null,
      current_end: null,
      paid_count: 0,
      has_scheduled_changes: false,
      short_url: `https://rzp.io/i/${id}`,
    };
    this.subs.set(id, sub);
    return sub;
  }

  async fetchSubscription(id: string): Promise<RazorpaySubscription> {
    this.check();
    const sub = this.subs.get(id);
    if (!sub) throw new RazorpayError("not found", 400);
    return { ...sub };
  }

  async cancelSubscription(id: string, atCycleEnd: boolean): Promise<RazorpaySubscription> {
    this.check();
    this.cancels.push({ id, atCycleEnd });
    const sub = this.subs.get(id);
    if (!sub) throw new RazorpayError("not found", 400);
    if (sub.status === "cancelled") throw new RazorpayError("already cancelled", 400);
    if (atCycleEnd) sub.has_scheduled_changes = true;
    else sub.status = "cancelled";
    return { ...sub };
  }

  private check() {
    if (this.down) throw new RazorpayError("down", 503);
  }
}
