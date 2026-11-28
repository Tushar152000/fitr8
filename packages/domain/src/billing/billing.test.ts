import { describe, expect, it } from "vitest";
import { accessFromEvent, accessFromRazorpay, dailyLimits, isPro, planOf } from "./index.js";

const now = new Date("2026-10-14T10:00:00Z");
const ms = (iso: string) => new Date(iso).getTime();
const cfg = { proScans: 10, proCoach: 40 };

describe("isPro / planOf", () => {
  it("is Pro until the access date, or forever with a lifetime purchase", () => {
    expect(isPro(null, now)).toBe(false);
    expect(isPro({ proUntil: new Date("2026-11-14"), lifetime: false }, now)).toBe(true);
    expect(isPro({ proUntil: new Date("2026-10-13"), lifetime: false }, now)).toBe(false);
    expect(isPro({ proUntil: null, lifetime: false }, now)).toBe(false);
    expect(planOf({ proUntil: null, lifetime: true }, now)).toBe("PRO");
  });
});

describe("dailyLimits", () => {
  it("gives Premium every feature with fair-use limits", () => {
    expect(dailyLimits("PRO", cfg)).toEqual({
      scans: 10,
      coach: 40,
      labelScans: true,
      barcode: true,
      reminders: 50,
      workouts: true,
    });
  });
  it("leaves AI, barcode and extra reminders to Premium on the free plan", () => {
    expect(dailyLimits("FREE", cfg)).toEqual({
      scans: 0,
      coach: 0,
      labelScans: false,
      barcode: false,
      reminders: 3,
      workouts: false,
    });
  });
});

describe("accessFromEvent", () => {
  const exp = ms("2026-11-14T10:00:00Z");

  it("grants access until expiry on purchases, renewals and extensions", () => {
    for (const type of [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "UNCANCELLATION",
      "PRODUCT_CHANGE",
      "SUBSCRIPTION_EXTENDED",
    ]) {
      expect(
        accessFromEvent({ type, expiration_at_ms: exp, entitlement_ids: ["pro"] }, "pro"),
      ).toEqual({
        proUntil: new Date(exp),
        lifetime: false,
        willRenew: true,
      });
    }
  });

  it("treats a non-expiring one-off purchase as lifetime", () => {
    expect(
      accessFromEvent({ type: "NON_RENEWING_PURCHASE", expiration_at_ms: null }, "pro"),
    ).toEqual({
      proUntil: null,
      lifetime: true,
      willRenew: false,
    });
  });

  it("keeps access to the end of the period on cancellation, and ends it on expiration", () => {
    expect(accessFromEvent({ type: "CANCELLATION", expiration_at_ms: exp }, "pro")).toMatchObject({
      proUntil: new Date(exp),
      willRenew: false,
    });
    const ended = accessFromEvent(
      { type: "EXPIRATION", expiration_at_ms: ms("2026-10-14T09:00:00Z") },
      "pro",
    );
    expect(isPro(ended, now)).toBe(false);
    expect(isPro(accessFromEvent({ type: "EXPIRATION" }, "pro"), now)).toBe(false);
  });

  it("keeps access through the grace period on a billing issue", () => {
    const grace = ms("2026-10-20T00:00:00Z");
    expect(
      accessFromEvent(
        {
          type: "BILLING_ISSUE",
          expiration_at_ms: ms("2026-10-13T00:00:00Z"),
          grace_period_expiration_at_ms: grace,
        },
        "pro",
      )?.proUntil,
    ).toEqual(new Date(grace));
  });

  it("ignores test, transfer and pause events, and other entitlements", () => {
    expect(accessFromEvent({ type: "TEST" }, "pro")).toBeNull();
    expect(accessFromEvent({ type: "TRANSFER" }, "pro")).toBeNull();
    expect(
      accessFromEvent({ type: "SUBSCRIPTION_PAUSED", expiration_at_ms: exp }, "pro"),
    ).toBeNull();
    expect(
      accessFromEvent(
        { type: "INITIAL_PURCHASE", expiration_at_ms: exp, entitlement_ids: ["other"] },
        "pro",
      ),
    ).toBeNull();
  });
});

describe("accessFromRazorpay", () => {
  const now = new Date("2026-12-01T00:00:00Z");
  const sec = (iso: string) => Math.floor(Date.parse(iso) / 1000);

  it("gives nothing before the customer authorises a payment", () => {
    expect(accessFromRazorpay({ status: "created", start_at: sec("2026-12-08T00:00:00Z") }, now)).toBeNull();
  });

  it("runs a trial until the first charge once the mandate is authorised", () => {
    const access = accessFromRazorpay(
      { status: "authenticated", start_at: sec("2026-12-08T00:00:00Z"), paid_count: 0 },
      now,
    );
    expect(access).toMatchObject({ proUntil: new Date("2026-12-08T00:00:00Z"), trial: true, willRenew: true });
  });

  it("gives no access when the trial's first charge is due but not yet paid", () => {
    expect(accessFromRazorpay({ status: "authenticated", start_at: sec("2026-11-30T00:00:00Z") }, now)).toBeNull();
  });

  it("gives access until the paid period ends while active, and renews", () => {
    const access = accessFromRazorpay(
      { status: "active", current_end: sec("2027-01-01T00:00:00Z"), paid_count: 1 },
      now,
    );
    expect(access).toMatchObject({ proUntil: new Date("2027-01-01T00:00:00Z"), trial: false, willRenew: true });
  });

  it("stops renewing but keeps paid time when a cancel is scheduled", () => {
    const access = accessFromRazorpay(
      { status: "active", current_end: sec("2027-01-01T00:00:00Z"), has_scheduled_changes: true },
      now,
    );
    expect(access).toMatchObject({ proUntil: new Date("2027-01-01T00:00:00Z"), willRenew: false });
  });

  it("honours the paid period after cancelled, halted, completed and paused, without renewing", () => {
    for (const status of ["cancelled", "halted", "completed", "expired", "paused", "pending"]) {
      expect(accessFromRazorpay({ status, current_end: sec("2026-12-15T00:00:00Z") }, now)).toMatchObject({
        proUntil: new Date("2026-12-15T00:00:00Z"),
        willRenew: false,
      });
    }
  });

  it("gives nothing for a cancelled trial that was never charged", () => {
    expect(accessFromRazorpay({ status: "cancelled", start_at: sec("2026-12-08T00:00:00Z") }, now)).toBeNull();
  });
});
