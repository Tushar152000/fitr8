# FITR8 Premium

Decided 2026-11-19 (replaces the 2026-10-13 plan of ₹199/month). Payments: **Razorpay Subscriptions**
(decided 2026-11-28, see "Razorpay" below): the app opens Razorpay's hosted checkout (UPI AutoPay,
cards). App Store / Google Play billing through RevenueCat is still in the code and stays off unless
its keys are set. The web only shows your plan.

## Plans (what users see)

### Free · ₹0 forever

Essential fitness tracking for everyone.

- **Food:** type what you ate, calories and macros, unlimited saved meals
- **Workout:** log sets, reps and weights, unlimited workout history, personal records (PRs)
- **Progress:** weight, body progress and water tracking
- **Reminders:** water and meal reminders, plus up to 3 of your own
- **Health apps:** connect Apple Health or Health Connect (steps, heart rate, BMI, SpO2, sleep, recovery)

### FITR8 Premium · ₹149/month or ₹1,499/year

More intelligence. Better guidance. Smarter fitness. Everything in Free, plus:

- **Scan your food:** barcode scanning, AI photo scanning (meals and nutrition labels)
- **AI Coach:** your personal nutrition and training coach
- **Personalised workouts:** a weekly plan built for your goal, adjusted every day
- **Insights and reports:** detailed weekly reports, monthly progress reports, health insights
  from Apple Health / Google Fit
- **Unlimited reminders**
- **Data export:** full reports to download

Yearly is about ₹125/month (save ₹289). **7-day free trial**, then ₹149/month or ₹1,499/year.
Cancel anytime; trial eligibility and renewal terms apply.

## Rules (what the code enforces)

| What                                        | Free                                                                                   | Premium                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------- |
| AI photo scans (meal + label)               | none                                                                                   | 10 a day                    |
| Barcode scanning                            | none                                                                                   | ✓                           |
| AI Coach messages                           | none                                                                                   | 40 a day                    |
| Workout tab (weekly plan, runs, yoga, logs) | preview: this week, first 2 exercises per gym day, 1 full sample session, free logging | ✓                           |
| Custom reminders                            | 3                                                                                      | unlimited (fair-use cap 50) |
| Weekly / monthly reports                    | basic week view                                                                        | detailed                    |
| Data export                                 | simple CSV of your data (a user right)                                                 | + formatted reports         |
| Health app connection                       | ✓                                                                                      | ✓ + insights                |

- **Every Premium feature opens the same Premium screen** when a free user taps it (barcode,
  photo scan, coach, workout plan, 4th reminder, insights, reports). After buying, it unlocks at once.
- **First login:** the Premium screen shows once, right after onboarding ("Your plan is ready"), with
  "Continue with Free". Stores require it to be closable, with Restore purchases and the terms.
- **Profile:** "Go Premium"; Premium users see their plan, renewal date and Manage subscription.
- **Always on:** the rules above apply to every user in every environment; there is no switch. Rules
  and tests: `packages/domain/src/billing` (`dailyLimits`, `isPro`, `accessFromEvent`).

## Buying

- **Razorpay (how Premium is bought):** with the five `RAZORPAY_*` settings on the API, "Get Premium"
  opens Razorpay's checkout and test purchases switch off (404). See "Razorpay" below.
- **Now (testing): one-tap test purchase.** While store billing isn't connected (no
  `REVENUECAT_SECRET_KEY` on the API), "Get Premium" calls `POST /api/billing/test-purchase`
  `{period}` and the user is Premium at once for 30 or 365 days, no money involved. The screen says
  "Test purchase: no money is charged". Profile shows "End test Premium" (`DELETE` the same route,
  back to Free). `GET /api/billing` returns `testPurchases: true`. This works in production too, so
  **anyone with the app can get Premium free** until the step below.
- **Before a public store release:** connect store billing (Setup below: store products, RevenueCat,
  `REVENUECAT_ENABLED=true` with its secrets, app SDK keys in a new build). Test purchases then switch
  off by themselves (404) and the app buys through the App Store / Google Play. Apple and Google
  require their own billing for digital subscriptions, so this must happen before the app is public.

## Razorpay

Decided 2026-11-28 (the owner chose Razorpay for Premium). Razorpay **Subscriptions**: a monthly and a
yearly plan, recurring charges by UPI AutoPay or card mandate, and the 7-day trial. The payment page is
**Razorpay's hosted page** (`short_url`), opened in the phone's browser, so no card or UPI detail ever
touches FITR8 or the app, and no native module is needed (it ships in an OTA update).

```
App: Premium → POST /api/billing/razorpay/subscription {period} → { checkoutUrl, trialDays }
App: opens checkoutUrl (browser / UPI app); the person pays and comes back to the app
App: back in the foreground → POST /api/billing/refresh (retries ~10 s); "I've paid · check again" too
Razorpay → POST /api/billing/razorpay  (webhook; X-Razorpay-Signature = HMAC-SHA256 of the raw body)
API: re-reads the subscription from Razorpay → razorpay_subscriptions row → entitlements row
```

- **Razorpay is the source of truth.** A webhook's own payload is never trusted for state: every
  `subscription.*` event and every refresh re-reads `GET /v1/subscriptions/{id}`. The rule is
  `accessFromRazorpay` in `@fitr8/domain/billing`: paid time is always honoured (`current_end`); a
  trial runs to its `start_at` once the mandate is authorised (`authenticated`); nothing before the
  person authorises (`created`); after cancelled / halted / completed / paused / a failed renewal
  (`pending`) access runs to the end of the period already paid, then Free.
- **Trial: once per person.** The first subscription is created with `start_at` = now + 7 days
  (`trialDays: 7`); Razorpay verifies the payment method with a small charge it refunds, then charges
  the plan price at `start_at`. Anyone who authorised a subscription before gets `trialDays: 0`.
  `GET /api/billing` returns `razorpay`, `trialEligible` and `trial` (Premium is the unpaid trial).
- **Tables.** `razorpay_subscriptions` (id `sub_…`, user, period, status, `proUntil`, `willRenew`,
  `inTrial`, `cancelRequested`): the webhook finds the user here. The user's `entitlements` row
  (store `RAZORPAY`) follows the subscription that grants Premium the longest, so an old cancelled
  subscription's late event can't undo a new one. Handled webhook ids go to `billing_events` as
  `rzp_<event id>`.
- **Webhook rules.** Signature checked on the raw bytes (`rawBody: true` in `main.ts`), constant-time;
  a repeated event id is acknowledged and skipped; Razorpay unreachable → 502 so Razorpay retries
  (for about a day) and the event isn't recorded; unknown subscriptions and non-`subscription.*`
  events are acknowledged.
- **Cancel.** `POST /api/billing/razorpay/cancel` (Profile → "Cancel subscription"): a paid plan stops
  renewing and keeps Premium to the end of the period; a free trial ends at once (nothing charged).
  **Deleting the account cancels open subscriptions first**; if Razorpay can't be reached the
  deletion is refused (502) so it can be retried: nobody is charged for a deleted account.
- **One provider at a time.** Checkout answers 409 when the user already has Premium (a test purchase
  doesn't count). A Razorpay entitlement that lasts longer is never ended by a RevenueCat event or
  sync, and RevenueCat's "no Pro" sync never touches a Razorpay row.
- **Switching plans** (monthly ↔ yearly): not in the app. Cancel, keep Premium to the end of the
  period, then pick the other plan (no second trial).
- **Store policy risk.** Apple (guideline 3.1.1) and Google Play require their own billing for digital
  subscriptions sold inside an app, so a paywall that opens Razorpay can be rejected in review on iOS,
  and on Google Play outside the programs that allow alternative billing. Check both stores' current
  rules for India before the public release. Fallback: set the RevenueCat keys and leave the Razorpay
  ones out; the app switches back by itself.

### Razorpay status (2026-11-28)

**Done in code** (branch `feat/razorpay-gateway`, `pnpm check` green, not yet tried against real Razorpay):

- [x] API: create subscription, hosted checkout link, trial once per person, cancel, refresh, signed
      webhook, Razorpay re-read as source of truth (`modules/billing/razorpay*.ts`).
- [x] Database: table `razorpay_subscriptions` (migration `20261128220000_razorpay_subscriptions`).
- [x] Rules: `accessFromRazorpay` in `@fitr8/domain/billing`, with tests.
- [x] Account deletion cancels open subscriptions first (refused with 502 if Razorpay is down).
- [x] Test purchases switch off when Razorpay (or RevenueCat) is configured.
- [x] App: Premium screen buys through Razorpay, checks the payment when the app returns, Profile has
      Cancel subscription / End free trial.
- [x] Deploy wiring: `.env.example`, `.env.production.example`, `ci-cd.yml` (`RAZORPAY_ENABLED`),
      `infra/gcp/setup.sh`, `infra/release-check.sh`.
- [x] Tests: `apps/api/test/razorpay.e2e.spec.ts` (19), `razorpay.spec.ts`, env and domain tests.

**To do by you** (needs your Razorpay account, console access or a decision), in this order:

- [ ] 1. Razorpay Dashboard (test mode): API keys, the two plans, the webhook (steps below).
- [ ] 2. Put the five values in your local `.env`, run `pnpm db:migrate`, `pnpm dev`, then pay with
      `success@razorpay` from the app (a phone or the Expo preview) and check `GET /api/billing`.
- [ ] 3. Check Apple 3.1.1 and Google Play rules for an in-app paywall that opens Razorpay (see "Store
      policy risk"); decide Razorpay vs the RevenueCat fallback for each store.
- [ ] 4. Razorpay live mode (KYC): live keys, live plans, live webhook. Then production:
      `infra/gcp/setup.sh`, GitHub variable `RAZORPAY_ENABLED=true`, deploy (the migration runs with it).
- [ ] 5. `infra/release-check.sh` must pass (it fails while neither Razorpay nor RevenueCat is on).
- [ ] 6. Update the Terms / Privacy pages and the store listing: Razorpay is the payment processor;
      the trial charges a small refundable amount; cancel in Profile.
- [ ] 7. Real-money test on live: buy the monthly plan, cancel, delete the account, check the
      Razorpay dashboard shows the subscription cancelled; refund yourself.

**Not built** (decide if you want them): plan switching in the app, a web purchase page, a Razorpay
invoice list in Profile, refunds from the admin (do refunds in the Razorpay dashboard for now: the
webhook then ends access when the subscription is cancelled).

**Environment variables** (API only; the app and web need none, because the checkout is Razorpay's page):

| Variable                  | Where it comes from                                                     | Where to set it                                              |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| `RAZORPAY_KEY_ID`         | Dashboard → Account & Settings → API keys (`rzp_test_…` / `rzp_live_…`) | local `.env`; production: Secret Manager (`setup.sh`)        |
| `RAZORPAY_KEY_SECRET`     | same screen, shown once                                                 | same                                                         |
| `RAZORPAY_PLAN_MONTHLY`   | Dashboard → Subscriptions → Plans → the ₹149 plan id (`plan_…`)         | same                                                         |
| `RAZORPAY_PLAN_YEARLY`    | the ₹1,499 plan id (`plan_…`)                                           | same                                                         |
| `RAZORPAY_WEBHOOK_SECRET` | you choose it when adding the webhook (`setup.sh` generates one)        | same; must equal the secret typed in Razorpay                |
| `RAZORPAY_ENABLED`        | `true` once the five secrets exist                                      | GitHub repository variable (mounts the secrets on Cloud Run) |

All five `RAZORPAY_*` values, or none: a partial set makes the API refuse to boot. Test and live use
different keys, plans and webhooks; never mix them. Nothing else to change: `REVENUECAT_*` can stay
unset, `EXPO_PUBLIC_REVENUECAT_*` is not needed for Razorpay.

### Razorpay setup (once, by you)

1. razorpay.com Dashboard (test mode first): **Account & Settings → API keys** → key id and secret.
2. **Subscriptions → Plans**: two plans in INR, **₹149 every 1 month** and **₹1,499 every 1 year**. Note
   both `plan_…` ids. The 7-day trial comes from the API, not the plan. Subscriptions must be enabled
   on your Razorpay account (support turns it on).
3. **Webhooks → Add**: URL `<API_PUBLIC_URL>/api/billing/razorpay`, a long random secret, events
   `subscription.authenticated`, `.activated`, `.charged`, `.pending`, `.halted`, `.cancelled`,
   `.completed`, `.paused`, `.resumed`, `.updated`.
4. **API**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_MONTHLY`, `RAZORPAY_PLAN_YEARLY`,
   `RAZORPAY_WEBHOOK_SECRET`: all five, or the API refuses to boot. Production: Secret Manager
   (`infra/gcp/setup.sh` asks for them and creates the webhook secret) and the GitHub variable
   `RAZORPAY_ENABLED=true` mounts them. Locally: `.env` with `rzp_test_` keys.
5. Test mode: Razorpay can't call `localhost`, so run the API behind a public tunnel (a Cloudflare
   quick tunnel, like the web dev setup) and use `https://<tunnel>/api/billing/razorpay` as the test
   webhook URL. Pay with the test UPI id `success@razorpay` or Razorpay's test cards; check that
   `GET /api/billing` shows `plan: PRO, store: RAZORPAY`, cancel from Profile, delete a test account.
6. Go live: `rzp_live_` keys, the live plan ids and a live webhook (live mode needs Razorpay KYC),
   then run `infra/release-check.sh`.

## Not built yet (to tackle one by one)

- [x] **Workout tab is Premium** (2026-11-24, spec "Workout unlock" 16–16d): `/api/workouts/*`
      (gym session engine) stays open for the briefing and the coach.
- [x] **Free taste of the Workout tab** (2026-11-28, replaces the locked 16a screen): free users set
      up training and see this week as a preview (`TrainingWeekDto.preview`): every day's title,
      minutes and status; gym days list their first 2 exercises (`lockedExercises` counts the rest);
      the week's first non-rest day (`sampleDate`) is sent in full; no recovery. They can log and
      undo their own sessions. Other weeks return 402 `workouts`. Rules in `@fitr8/domain/training`
      `free-preview.ts`.
- [ ] **Log your own workout** for free users: pick exercises and enter sets, without the Premium plan.
- [ ] **Workout history** screen (unlimited, all past sessions).
- [ ] **Personal records (PRs)** per exercise.
- [x] **Apple Health and Health Connect** connection (free): docs/HEALTH.md.
- [ ] **Health insights** from that data (Premium).
- [ ] **Detailed weekly reports** and **monthly progress reports** (Premium): define contents first.
- [ ] **Formatted report export** (Premium), beside the free CSV.

## How it works

```
App: Purchases.configure({ appUserID: <FITR8 user id> })  ← identifyPurchaser() after sign-in
App: Premium screen → purchasePackage → POST /api/billing/refresh  (limits lift immediately)
RevenueCat → POST /api/billing/revenuecat  (webhook; Authorization header = REVENUECAT_WEBHOOK_AUTH)
API: re-reads the customer from RevenueCat (REVENUECAT_SECRET_KEY) → entitlements row
API: /api/me.plan, /api/billing, /api/usage, coach + label checks read BillingService
```

- **`billing` module** (`apps/api/src/modules/billing`) owns `entitlements` (one row per subscriber:
  `proUntil`, `lifetime`, `willRenew`, store, product, environment, `syncedAt`) and `billing_events`
  (webhook ids already handled; RevenueCat delivers at least once and reuses the id on retries).
- With `REVENUECAT_SECRET_KEY` every webhook re-reads the affected customers from
  `GET /v1/subscribers/{id}` (RevenueCat's advice); without it the event's own fields are applied,
  never over a newer state (`event_timestamp_ms` vs `syncedAt`). TRANSFER needs the key.
- Sandbox purchases count (App Review buys in sandbox on the production app).
- Routes: `GET /api/billing` (plan, renewal, limits, `testPurchases`), `POST /api/billing/refresh`
  (after purchase or restore), `POST/DELETE /api/billing/test-purchase` (testing only),
  `POST /api/billing/revenuecat` (public, header-authenticated). A Premium feature on the free plan
  returns **402** `{ reason: "pro_required", feature }`; a used-up Premium limit returns 429.

## App

- `apps/mobile/src/lib/premium.ts`: the one gate. `usePremium().locked(feature)` reads
  `GET /api/billing` limits; `openPremium(feature)` opens the Premium screen led by that feature;
  `handlePremiumError(err)` does the same for any 402 `pro_required` the API returns.
- Entry points: Today banner (free users, design 14), Profile plan card (14a), and every Premium
  feature a free user taps: photo, barcode and label scanning and the coach open the locked sheet
  (14b, with the free path "Type this meal instead"); a 4th reminder opens the Premium screen. A 402
  from the API (`handlePremiumError`) opens the same sheet. Designs: docs/DESIGN.md "Premium upsell
  and paywall".
- `GET /api/usage` adds `typedMeals {today, thisMonth}` (meals logged by typing) for the banner and
  the Profile usage strip; `GET /api/billing` adds `period` (year / month).
- First login: Today (`usePremiumIntro`) opens Premium once per user (flag in secure storage) for a
  free user whose `profile.onboardedAt` is within the last 24 hours, so it also works after web
  onboarding.
- Premium screen: `apps/mobile/src/app/pro.tsx` (modal), design in docs/DESIGN.md "Premium screen".
  Prices and trial from the store (RevenueCat); without store plans it shows the launch prices and,
  while `testPurchases` is on, buys with the one-tap test purchase. Restore purchases, Terms / Privacy and renewal terms (App Store 3.1.1 / 3.1.2).
- With Razorpay on (`billing.razorpay`), the Premium screen ignores store plans: launch prices, "Try 7
  days free" when `trialEligible`, button opens the checkout (`use-paywall.ts`); Profile's plan card
  shows "Cancel subscription" (or "End free trial", "Won't renew").
- `react-native-purchases` is native: it needs a new EAS build (Expo Go runs it in preview mode,
  no real purchases). Analytics (docs/ANALYTICS.md): `premium_banner_*`, `premium_locked_*`, `paywall_viewed` (source), `paywall_plan_selected`, `paywall_feature_expanded`, `purchase_started/_succeeded/_failed/_cancelled`.

## Setup (once, by you)

1. **Stores** (after the app exists in each store):
   - App Store Connect → Subscriptions → group "FITR8 Premium" → `fitr8_pro_monthly` (₹149) and
     `fitr8_pro_yearly` (₹1,499), each with a 7-day free-trial introductory offer. Paid Apps
     agreement, tax and banking must be complete.
   - Play Console → Monetize → Subscriptions → same two ids, base plans monthly / yearly, a 7-day
     free-trial offer.
2. **RevenueCat** (app.revenuecat.com): project FITR8 → add the iOS app (`com.fitr8.app`, App Store
   Connect API key / in-app purchase key) and the Android app (Play service-account JSON) →
   entitlement **`pro`** with both products → offering **`default`** with a Monthly and an Annual
   package.
3. **Webhook**: Integrations → Webhooks → URL `https://www.fitr8.com/api/billing/revenuecat`,
   Authorization header value = a long random string.
4. **API** (Cloud Run console, secrets via Secret Manager): `REVENUECAT_WEBHOOK_AUTH` (that string),
   `REVENUECAT_SECRET_KEY` (RevenueCat → API keys → secret `sk_…`), optionally
   `REVENUECAT_ENTITLEMENT` if not `pro`; GitHub variable `REVENUECAT_ENABLED=true` mounts them.
5. **App** (EAS environment variables, then a new build): `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   (`appl_…`) and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_…`); these public SDK keys are safe in
   the app.
6. Test with a sandbox / licence-tester account: buy, cancel, restore; check `GET /api/billing`.
7. Deploy: test purchases switch off and real purchases take over. Test-Premium users keep Premium
   until their 30/365 days end.
