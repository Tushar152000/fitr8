import { z } from "zod";

/**
 * FITR8 Pro billing (docs/PREMIUM.md). Purchases happen in the app through RevenueCat; the API
 * learns about them from RevenueCat's webhook and REST API.
 */

export type PlanName = "FREE" | "PRO";

/**
 * POST /api/billing/revenuecat — RevenueCat's webhook body. Only the fields we read are listed;
 * RevenueCat adds fields and event types without notice, so unknown keys pass through.
 */
export const RevenueCatWebhookSchema = z.object({
  api_version: z.string().optional(),
  event: z
    .object({
      id: z.string().min(1).max(128),
      type: z.string().min(1).max(64),
      app_user_id: z.string().max(256).nullish(),
      original_app_user_id: z.string().max(256).nullish(),
      aliases: z.array(z.string().max(256)).max(100).nullish(),
      transferred_from: z.array(z.string().max(256)).max(100).nullish(),
      transferred_to: z.array(z.string().max(256)).max(100).nullish(),
      entitlement_ids: z.array(z.string().max(128)).max(50).nullish(),
      product_id: z.string().max(256).nullish(),
      period_type: z.string().max(32).nullish(),
      store: z.string().max(32).nullish(),
      environment: z.string().max(32).nullish(),
      event_timestamp_ms: z.number().int().nonnegative(),
      expiration_at_ms: z.number().int().nonnegative().nullish(),
      grace_period_expiration_at_ms: z.number().int().nonnegative().nullish(),
    })
    .passthrough(),
});
export type RevenueCatWebhook = z.infer<typeof RevenueCatWebhookSchema>;

/** GET /api/billing and POST /api/billing/refresh — the caller's plan and today's limits. */
export interface BillingDto {
  plan: PlanName;
  /**
   * True until store billing (RevenueCat) is connected: the app buys with one tap through
   * POST /api/billing/test-purchase, no money involved. False: real App Store / Google Play purchases.
   */
  testPurchases: boolean;
  /**
   * True when Razorpay is connected: "Get Premium" calls POST /api/billing/razorpay/subscription and
   * opens the returned checkout page. Test purchases are then off.
   */
  razorpay: boolean;
  /** Razorpay: this user hasn't had a trial yet, so the 7-day free trial applies to their first plan. */
  trialEligible: boolean;
  /** ISO; when Pro access ends (renews before then unless `willRenew` is false). */
  proUntil: string | null;
  lifetime: boolean;
  willRenew: boolean;
  /** Premium is a free trial that hasn't been charged yet (`proUntil` is when it ends). */
  trial: boolean;
  /** Where the subscription was bought (APP_STORE, PLAY_STORE, RAZORPAY, TEST…), for "manage subscription". */
  store: string | null;
  /** Yearly or monthly Premium, from the product bought; null on Free or when unknown. */
  period: "year" | "month" | null;
  limits: {
    /** Photo scans a day (meals and labels); 0 = Premium only for this user. */
    scans: number;
    /** Coach messages a day; 0 = Premium only for this user. */
    coach: number;
    labelScans: boolean;
    barcode: boolean;
    /** Custom reminders the user can keep. */
    reminders: number;
    /** The Workout tab (weekly plan, run/yoga days, training logs). */
    workouts: boolean;
  };
}

/** POST /api/billing/test-purchase — Premium without the store, while store billing isn't connected. */
export const TestPurchaseSchema = z.object({ period: z.enum(["month", "year"]) });
export type TestPurchaseInput = z.infer<typeof TestPurchaseSchema>;

/** POST /api/billing/razorpay/subscription — start paying for Premium through Razorpay checkout. */
export const RazorpaySubscribeSchema = z.object({ period: z.enum(["month", "year"]) });
export type RazorpaySubscribeInput = z.infer<typeof RazorpaySubscribeSchema>;

/** Razorpay's hosted checkout for one subscription: open `checkoutUrl`, then POST /api/billing/refresh. */
export interface RazorpayCheckoutDto {
  subscriptionId: string;
  /** Razorpay-hosted payment page (UPI AutoPay, cards, netbanking mandates). */
  checkoutUrl: string;
  period: "month" | "year";
  /** Free days before the first charge; 0 when this user has already had a trial. */
  trialDays: number;
}

/**
 * POST /api/billing/razorpay — Razorpay's webhook body. Only the fields we read are listed;
 * Razorpay adds fields without notice, so unknown keys pass through.
 */
export const RazorpayWebhookSchema = z.object({
  event: z.string().min(1).max(64),
  created_at: z.number().int().nonnegative().optional(),
  payload: z
    .object({
      subscription: z
        .object({
          entity: z.object({ id: z.string().min(1).max(64) }).passthrough(),
        })
        .optional(),
    })
    .passthrough(),
});
export type RazorpayWebhook = z.infer<typeof RazorpayWebhookSchema>;

/** Premium features (docs/PREMIUM.md); the app opens the Premium screen for each. */
export type PremiumFeature =
  "photo_scan" | "label_scan" | "barcode" | "coach" | "reminders" | "workouts";

/** `details` of a 402 from any route a free user can't use: open the Premium screen for `feature`. */
export interface ProRequiredDetails {
  reason: "pro_required";
  feature: PremiumFeature;
}
