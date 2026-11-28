import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { RazorpayClient, RazorpayError, verifyWebhookSignature } from "./razorpay.js";

const config = { keyId: "rzp_test_abc", keySecret: "shh", planMonthly: "plan_m", planYearly: "plan_y" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("verifyWebhookSignature", () => {
  const body = Buffer.from('{"event":"subscription.charged"}');
  const sign = (secret: string) => createHmac("sha256", secret).update(body).digest("hex");

  it("accepts the HMAC-SHA256 hex of the exact raw body", () => {
    expect(verifyWebhookSignature(body, sign("s3cret"), "s3cret")).toBe(true);
  });
  it("rejects a missing, wrong, truncated or other-secret signature, and a changed body", () => {
    expect(verifyWebhookSignature(body, undefined, "s3cret")).toBe(false);
    expect(verifyWebhookSignature(body, "", "s3cret")).toBe(false);
    expect(verifyWebhookSignature(body, sign("other"), "s3cret")).toBe(false);
    expect(verifyWebhookSignature(body, sign("s3cret").slice(0, 10), "s3cret")).toBe(false);
    expect(verifyWebhookSignature(Buffer.from('{"event":"x"}'), sign("s3cret"), "s3cret")).toBe(false);
  });
});

describe("RazorpayClient", () => {
  it("is enabled only with every setting, and knows sandbox keys", () => {
    expect(new RazorpayClient(config).enabled).toBe(true);
    expect(new RazorpayClient(config).sandbox).toBe(true);
    expect(new RazorpayClient({ ...config, keyId: "rzp_live_abc" }).sandbox).toBe(false);
    expect(new RazorpayClient({ ...config, planYearly: undefined }).enabled).toBe(false);
    expect(new RazorpayClient({}).enabled).toBe(false);
  });

  it("creates a subscription with Basic auth and the trial start", async () => {
    const fetch = vi.fn().mockResolvedValue(json({ id: "sub_1", status: "created", plan_id: "plan_y" }));
    const client = new RazorpayClient({ ...config, fetch });
    await client.createSubscription({
      planId: "plan_y",
      totalCount: 10,
      startAt: 1_800_000_000,
      expireBy: 1_790_000_000,
      notes: { userId: "u1" },
    });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.razorpay.com/v1/subscriptions");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("rzp_test_abc:shh").toString("base64")}`);
    expect(JSON.parse(init.body)).toMatchObject({
      plan_id: "plan_y",
      total_count: 10,
      start_at: 1_800_000_000,
      notes: { userId: "u1" },
    });
  });

  it("omits start_at without a trial, fetches by id and cancels at cycle end or now", async () => {
    const fetch = vi.fn().mockImplementation(async () => json({ id: "sub_1", status: "active" }));
    const client = new RazorpayClient({ ...config, fetch });
    await client.createSubscription({ planId: "p", totalCount: 1, expireBy: 1, notes: {} });
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).not.toHaveProperty("start_at");
    await client.fetchSubscription("sub_1");
    expect(fetch.mock.calls[1]![0]).toBe("https://api.razorpay.com/v1/subscriptions/sub_1");
    await client.cancelSubscription("sub_1", true);
    await client.cancelSubscription("sub_1", false);
    expect(JSON.parse(fetch.mock.calls[2]![1].body)).toEqual({ cancel_at_cycle_end: 1 });
    expect(JSON.parse(fetch.mock.calls[3]![1].body)).toEqual({ cancel_at_cycle_end: 0 });
  });

  it("raises RazorpayError for API errors, bad bodies, network failures and when not configured", async () => {
    const api = (res: Response | Error) =>
      new RazorpayClient({
        ...config,
        fetch: (res instanceof Error ? vi.fn().mockRejectedValue(res) : vi.fn().mockResolvedValue(res)) as never,
      });
    await expect(
      api(json({ error: { description: "bad plan" } }, 400)).fetchSubscription("sub_1"),
    ).rejects.toMatchObject({ name: "RazorpayError", status: 400 });
    await expect(api(json({ nothing: true })).fetchSubscription("sub_1")).rejects.toBeInstanceOf(RazorpayError);
    await expect(api(new Error("offline")).fetchSubscription("sub_1")).rejects.toThrow("Couldn't reach Razorpay");
    await expect(new RazorpayClient({}).fetchSubscription("sub_1")).rejects.toThrow("not configured");
  });
});
