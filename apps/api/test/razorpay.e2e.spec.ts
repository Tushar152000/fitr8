import { createHmac, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "./support/app.js";

const SECRET = "test-razorpay-webhook-secret";
const DAY = 86_400;
const sec = (offsetDays: number) => Math.floor(Date.now() / 1000) + offsetDays * DAY;

/** Razorpay's REST API is a fake in these tests; the settings only have to be complete. */
const RAZORPAY_ENV = {
  RAZORPAY_KEY_ID: "rzp_test_abc",
  RAZORPAY_KEY_SECRET: "secret",
  RAZORPAY_PLAN_MONTHLY: "plan_month",
  RAZORPAY_PLAN_YEARLY: "plan_year",
  RAZORPAY_WEBHOOK_SECRET: SECRET,
};

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp({ env: RAZORPAY_ENV });
});
beforeEach(() => {
  t.razorpay.enabled = true;
  t.razorpay.down = false;
});
afterAll(async () => {
  await t.close();
});

type Agent = Awaited<ReturnType<TestApp["signIn"]>>["agent"];

/** A webhook as Razorpay sends it: JSON body, HMAC-SHA256 hex of the raw bytes in the header. */
const hook = (event: string, subId: string | undefined, over: { eventId?: string; secret?: string } = {}) => {
  const body = JSON.stringify({
    event,
    created_at: sec(0),
    payload: subId ? { subscription: { entity: { id: subId, status: "x" } } } : {},
  });
  const signature = createHmac("sha256", over.secret ?? SECRET).update(body).digest("hex");
  return t
    .http()
    .post("/api/billing/razorpay")
    .set("Content-Type", "application/json")
    .set("X-Razorpay-Signature", signature)
    .set("X-Razorpay-Event-Id", over.eventId ?? randomUUID())
    .send(body);
};

const checkout = (agent: Agent, period: "month" | "year" = "year") =>
  agent.post("/api/billing/razorpay/subscription").send({ period });
const billing = async (agent: Agent) => (await agent.get("/api/billing").expect(200)).body;

/** Customer finished checkout: the trial mandate is authorised. */
const authorise = (id: string, startAt: number) =>
  t.razorpay.set(id, { status: "authenticated", start_at: startAt, paid_count: 0 });
/** First (or a renewal) charge succeeded. */
const charged = (id: string, currentEnd: number, paidCount = 1) =>
  t.razorpay.set(id, { status: "active", current_end: currentEnd, paid_count: paidCount });

describe("Razorpay webhook", () => {
  it("is refused when not configured, unsigned, wrongly signed or tampered, and rejects a bad body", async () => {
    const plain = await createTestApp();
    await plain.http().post("/api/billing/razorpay").send({ event: "x", payload: {} }).expect(503);
    await plain.close();

    await t.http().post("/api/billing/razorpay").send({ event: "x", payload: {} }).expect(401);
    await hook("subscription.charged", "sub_x", { secret: "wrong" }).expect(401);

    const body = JSON.stringify({ event: "subscription.charged", payload: {} });
    const signature = createHmac("sha256", SECRET).update(body).digest("hex");
    await t
      .http()
      .post("/api/billing/razorpay")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", signature)
      .send(body.replace("charged", "activated"))
      .expect(401);

    const bad = JSON.stringify({ nope: true });
    await t
      .http()
      .post("/api/billing/razorpay")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", createHmac("sha256", SECRET).update(bad).digest("hex"))
      .send(bad)
      .expect(400);
  });

  it("acknowledges events it has no use for: unknown subscriptions and payment events", async () => {
    await hook("subscription.charged", "sub_unknown").expect(200);
    await hook("payment.failed", undefined).expect(200);
  });
});

describe("Razorpay checkout", () => {
  it("needs a session, a valid plan, and Razorpay to be connected", async () => {
    await t.http().post("/api/billing/razorpay/subscription").send({ period: "year" }).expect(401);
    await t.http().post("/api/billing/razorpay/cancel").expect(401);
    const { agent } = await t.signIn();
    await checkout(agent, "week" as never).expect(400);
    await agent.post("/api/billing/razorpay/subscription").send({}).expect(400);
    t.razorpay.enabled = false;
    await checkout(agent).expect(404);
    await agent.post("/api/billing/razorpay/cancel").expect(404);
  });

  it("turns test purchases off and tells the app Razorpay is on", async () => {
    const { agent } = await t.signIn();
    expect(await billing(agent)).toMatchObject({ razorpay: true, testPurchases: false, trialEligible: true });
    await agent.post("/api/billing/test-purchase").send({ period: "month" }).expect(404);
    t.razorpay.enabled = false;
    expect(await billing(agent)).toMatchObject({ razorpay: false, testPurchases: true, trialEligible: false });
  });

  it("creates a subscription with a 7-day trial the first time, and reuses an unpaid checkout", async () => {
    const { userId, agent } = await t.signIn();
    const before = t.razorpay.created.length;
    const res = await checkout(agent, "year").expect(200);
    expect(res.body).toMatchObject({ period: "year", trialDays: 7 });
    expect(res.body.checkoutUrl).toMatch(/^https:\/\/rzp\.io\//);
    const sent = t.razorpay.created[before]!;
    expect(sent).toMatchObject({ planId: "plan_year", totalCount: 10, notes: { userId, period: "year" } });
    expect(sent.startAt! - sec(7)).toBeLessThan(5);
    expect(sent.startAt! - sec(7)).toBeGreaterThanOrEqual(-5);
    expect((await billing(agent)).plan).toBe("FREE");

    const again = await checkout(agent, "year").expect(200);
    expect(again.body.subscriptionId).toBe(res.body.subscriptionId);
    expect(t.razorpay.created.length).toBe(before + 1);

    const monthly = await checkout(agent, "month").expect(200);
    expect(monthly.body.subscriptionId).not.toBe(res.body.subscriptionId);
    expect(t.razorpay.created[before + 1]).toMatchObject({ planId: "plan_month", totalCount: 120 });
  });

  it("answers 502 when Razorpay is down, never a raw error", async () => {
    const { agent } = await t.signIn();
    t.razorpay.down = true;
    const res = await checkout(agent).expect(502);
    expect(JSON.stringify(res.body)).not.toMatch(/razorpay ?(post|get)/i);
  });
});

describe("Razorpay subscription lifecycle", () => {
  it("grants Premium for the trial once the mandate is authorised, then through each paid period", async () => {
    const { userId, agent } = await t.signIn();
    const { subscriptionId: id } = (await checkout(agent).expect(200)).body;

    // The customer authorises the payment method (trial starts).
    const trialEnd = sec(7);
    authorise(id, trialEnd);
    await hook("subscription.authenticated", id).expect(200);
    expect(await billing(agent)).toMatchObject({
      plan: "PRO",
      store: "RAZORPAY",
      period: "year",
      willRenew: true,
      trial: true,
      proUntil: new Date(trialEnd * 1000).toISOString(),
      trialEligible: false,
    });
    const ent = await t.prisma.entitlement.findUniqueOrThrow({ where: { userId } });
    expect(ent).toMatchObject({ periodType: "TRIAL", environment: "SANDBOX", productId: "fitr8_pro_yearly" });
    expect((await agent.get("/api/me").expect(200)).body.plan).toBe("PRO");

    // First charge at trial end.
    const paidUntil = sec(372);
    charged(id, paidUntil);
    await hook("subscription.charged", id).expect(200);
    expect(await billing(agent)).toMatchObject({
      plan: "PRO",
      willRenew: true,
      trial: false,
      proUntil: new Date(paidUntil * 1000).toISOString(),
    });
    expect((await t.prisma.entitlement.findUniqueOrThrow({ where: { userId } })).periodType).toBe("NORMAL");
  });

  it("grants nothing for a checkout that was opened but never paid", async () => {
    const { agent } = await t.signIn();
    const { subscriptionId: id } = (await checkout(agent).expect(200)).body;
    await hook("subscription.activated", id).expect(200); // Razorpay still says "created"
    expect((await billing(agent)).plan).toBe("FREE");
  });

  it("picks up a payment without the webhook when the app calls refresh", async () => {
    const { agent } = await t.signIn();
    const { subscriptionId: id } = (await checkout(agent, "month").expect(200)).body;
    charged(id, sec(30));
    const res = await agent.post("/api/billing/refresh").expect(200);
    expect(res.body).toMatchObject({ plan: "PRO", period: "month", store: "RAZORPAY" });
  });

  it("handles a repeated delivery once", async () => {
    const { userId, agent } = await t.signIn();
    const { subscriptionId: id } = (await checkout(agent).expect(200)).body;
    charged(id, sec(365));
    const eventId = randomUUID();
    await hook("subscription.charged", id, { eventId }).expect(200);
    // Same event id again, with Razorpay now reporting a halt: skipped, not applied.
    t.razorpay.set(id, { status: "halted", current_end: sec(-1) });
    await hook("subscription.halted", id, { eventId }).expect(200);
    expect((await billing(agent)).plan).toBe("PRO");
    expect(await t.prisma.billingEvent.count({ where: { id: `rzp_${eventId}` } })).toBe(1);
    // A new event id sees the halt.
    await hook("subscription.halted", id).expect(200);
    expect((await billing(agent)).plan).toBe("FREE");
    expect(userId).toBeTruthy();
  });

  it("answers 502 on a webhook when Razorpay can't be reached, so Razorpay retries, and doesn't record it", async () => {
    const { agent } = await t.signIn();
    const { subscriptionId: id } = (await checkout(agent).expect(200)).body;
    charged(id, sec(30));
    t.razorpay.down = true;
    const eventId = randomUUID();
    await hook("subscription.charged", id, { eventId }).expect(502);
    expect(await t.prisma.billingEvent.count({ where: { id: `rzp_${eventId}` } })).toBe(0);
    t.razorpay.down = false;
    await hook("subscription.charged", id, { eventId }).expect(200);
    expect((await billing(agent)).plan).toBe("PRO");
  });

  it("keeps paid access after a failed renewal until the paid period ends, then drops to Free", async () => {
    const { agent } = await t.signIn();
    const { subscriptionId: id } = (await checkout(agent).expect(200)).body;
    const end = sec(3);
    t.razorpay.set(id, { status: "pending", current_end: end, paid_count: 1 });
    await hook("subscription.pending", id).expect(200);
    expect(await billing(agent)).toMatchObject({ plan: "PRO", willRenew: false });
    t.razorpay.set(id, { status: "halted", current_end: sec(-1) });
    await hook("subscription.halted", id).expect(200);
    expect((await billing(agent)).plan).toBe("FREE");
  });

  it("never lets an old cancelled subscription's late event undo a newer active one", async () => {
    const { agent } = await t.signIn();
    const first = (await checkout(agent, "month").expect(200)).body.subscriptionId;
    authorise(first, sec(7));
    await agent.post("/api/billing/refresh").expect(200);
    await agent.post("/api/billing/razorpay/cancel").expect(200); // trial: ends at once
    expect((await billing(agent)).plan).toBe("FREE");

    const second = (await checkout(agent, "year").expect(200)).body;
    expect(second.trialDays).toBe(0); // the trial is used up
    expect(t.razorpay.created.at(-1)!.startAt).toBeUndefined();
    charged(second.subscriptionId, sec(365));
    await agent.post("/api/billing/refresh").expect(200);
    expect((await billing(agent)).plan).toBe("PRO");

    await hook("subscription.cancelled", first).expect(200); // late, stale
    expect(await billing(agent)).toMatchObject({ plan: "PRO", period: "year" });
  });

  it("refuses a second checkout while Premium is active, and charges nobody twice", async () => {
    const { agent } = await t.signIn();
    const { subscriptionId: id } = (await checkout(agent).expect(200)).body;
    charged(id, sec(365));
    const created = t.razorpay.created.length;
    await checkout(agent, "month").expect(409);
    expect(t.razorpay.created.length).toBe(created);
  });

  it("only changes the user the subscription belongs to", async () => {
    const a = await t.signIn();
    const b = await t.signIn();
    const { subscriptionId: id } = (await checkout(a.agent).expect(200)).body;
    charged(id, sec(30));
    await hook("subscription.charged", id).expect(200);
    expect((await billing(a.agent)).plan).toBe("PRO");
    expect((await billing(b.agent)).plan).toBe("FREE");
  });
});

describe("Razorpay cancel", () => {
  it("stops renewing a paid subscription but keeps Premium until the period ends", async () => {
    const { agent } = await t.signIn();
    const { subscriptionId: id } = (await checkout(agent).expect(200)).body;
    const end = sec(300);
    charged(id, end);
    await agent.post("/api/billing/refresh").expect(200);

    const res = await agent.post("/api/billing/razorpay/cancel").expect(200);
    expect(res.body).toMatchObject({
      plan: "PRO",
      willRenew: false,
      proUntil: new Date(end * 1000).toISOString(),
    });
    expect(t.razorpay.cancels.at(-1)).toEqual({ id, atCycleEnd: true });

    // Pressing it again is harmless.
    await agent.post("/api/billing/razorpay/cancel").expect(200);
    // The period ends: Free.
    t.razorpay.set(id, { status: "cancelled", current_end: sec(-1) });
    await hook("subscription.cancelled", id).expect(200);
    expect((await billing(agent)).plan).toBe("FREE");
  });

  it("ends a free trial at once, with nothing charged", async () => {
    const { agent } = await t.signIn();
    const { subscriptionId: id } = (await checkout(agent).expect(200)).body;
    authorise(id, sec(7));
    await agent.post("/api/billing/refresh").expect(200);
    expect((await billing(agent)).plan).toBe("PRO");
    const res = await agent.post("/api/billing/razorpay/cancel").expect(200);
    expect(res.body.plan).toBe("FREE");
    expect(t.razorpay.cancels.at(-1)).toEqual({ id, atCycleEnd: false });
  });

  it("is 404 without a subscription, and 502 when Razorpay is down", async () => {
    const { agent } = await t.signIn();
    await agent.post("/api/billing/razorpay/cancel").expect(404);
    const { subscriptionId: id } = (await checkout(agent).expect(200)).body;
    charged(id, sec(30));
    await agent.post("/api/billing/refresh").expect(200);
    t.razorpay.down = true;
    await agent.post("/api/billing/razorpay/cancel").expect(502);
  });
});

describe("Account deletion", () => {
  it("cancels an open subscription first, and is refused (502) if Razorpay can't be reached", async () => {
    const { userId, agent } = await t.signIn();
    const { subscriptionId: id } = (await checkout(agent).expect(200)).body;
    charged(id, sec(300));
    await agent.post("/api/billing/refresh").expect(200);

    t.razorpay.down = true;
    await agent.delete("/api/account").send({ reasons: [] }).expect(502);
    expect(await t.prisma.user.count({ where: { id: userId } })).toBe(1);

    t.razorpay.down = false;
    await agent.delete("/api/account").send({ reasons: [] }).expect(204);
    expect(t.razorpay.cancels.at(-1)).toEqual({ id, atCycleEnd: false });
    expect(await t.prisma.user.count({ where: { id: userId } })).toBe(0);
    expect(await t.prisma.razorpaySubscription.count({ where: { userId } })).toBe(0);
  });

  it("deletes a user with no subscription without calling Razorpay", async () => {
    const { agent } = await t.signIn();
    const cancels = t.razorpay.cancels.length;
    t.razorpay.down = true;
    await agent.delete("/api/account").send({ reasons: [] }).expect(204);
    expect(t.razorpay.cancels.length).toBe(cancels);
  });
});

describe("Razorpay next to RevenueCat", () => {
  it("is not undone by a store event that ends sooner, nor by a RevenueCat sync that finds nothing", async () => {
    const hookRc = createTestApp({ env: { ...RAZORPAY_ENV, REVENUECAT_WEBHOOK_AUTH: "Bearer rc" } });
    const rc = await hookRc;
    try {
      rc.razorpay.enabled = true;
      const { userId, agent } = await rc.signIn();
      await rc.prisma.entitlement.create({
        data: { userId, proUntil: new Date(Date.now() + 300 * DAY * 1000), store: "RAZORPAY", syncedAt: new Date(Date.now() - 1000) },
      });
      await rc
        .http()
        .post("/api/billing/revenuecat")
        .set("Authorization", "Bearer rc")
        .send({
          event: {
            id: randomUUID(),
            type: "EXPIRATION",
            app_user_id: userId,
            entitlement_ids: ["pro"],
            store: "APP_STORE",
            event_timestamp_ms: Date.now(),
            expiration_at_ms: Date.now() - 1000,
          },
        })
        .expect(200);
      expect((await agent.get("/api/billing").expect(200)).body.plan).toBe("PRO");

      rc.revenueCat.enabled = true; // RevenueCat knows nothing of this user
      await agent.post("/api/billing/refresh").expect(200);
      expect((await agent.get("/api/billing").expect(200)).body.plan).toBe("PRO");
    } finally {
      await rc.close();
    }
  });
});
