# Decisions and open questions (hand-maintained)

Record decisions as `YYYY-MM-DD — decision — why`. Move a question to Decided when answered.

## Decided

- 2026-11-25 — Food log: older days are view-only, meals can be added for the last 7 (owner chose view-only). Shipped by Tushar as a calendar that jumps to any earlier day (`lib/meal-param.ts` `viewableDay`/`pagerDays`/`canLogOn`). App UI is ~8% more compact (owner asked); colours follow Tushar’s v2 olive/lime system.
- 2026-11-22 — Blog is built in-house (NestJS `blog` module + Tiptap editor), not Ghost/Payload/Strapi: reuses Google sign-in, sessions, storage and deploys, no second backend or user system.
- 2026-11-22 — `/admin` is one universal staff admin (owner asked): `admin` module owns `staff_members` (ADMIN/EDITOR/AUTHOR, app-wide), first admins from `ADMIN_EMAILS`; the blog is its first section (`/admin/blog`, API `/api/admin/blog`) and keeps only blog data (`blog_authors` keyed by staff id). New sections follow docs/ADMIN.md.
- 2026-11-22 — Blog pages render per request (`cache: "no-store"`). Next's fetch cache kept serving a post after it was renamed or unpublished (it doesn't replace a cached 200 with a 404). Open: add caching via Cache Components (`"use cache"` + tags) if blog traffic needs it; that flag changes the whole web app.
- 2026-11-22 — Welcome email goes out once, when the account is created (first Google/Apple/dev sign-in), not after onboarding (owner's call; replaces the 2026-11-19 decision). Copy invites them to build their plan (no goal known yet). Sent via the existing SMTP mailer (Resend over SMTP once fitr8.com DNS is set; until then whatever SMTP is configured, Gmail in prod); no SMTP → logged.
- 2026-11-19 — No paywall switch: Premium rules always apply. Until store billing (RevenueCat) is connected, buying is a free one-tap test purchase (30/365 days) in every environment including production, since only the team uses the app; must connect store billing before a public store release.
- 2026-11-19 — FITR8 Premium: ₹149/month or ₹1,499/year, 7-day trial. Free: typing meals, saved meals, workouts (logging, unlimited history, PRs), weight/water/progress, 3 custom reminders, Apple Health/Google Fit connect. Premium: barcode, AI photo + label scans (10/day), AI Coach (40/day), personalised workout plan, unlimited reminders (cap 50), detailed reports/insights, formatted export. Every Premium tap opens one Premium screen; it also shows once after onboarding. Workout plan stays free until free "log your own workout" exists; not-built items listed in docs/PREMIUM.md.
- 2026-11-18 — Meal type defaults from the time of day (or the route) and is changeable on every log screen and later on the meal (`PUT /meals/:id mealType`); replaces "always the user's choice" — the owner found the meal chips cluttered.
- 2026-11-18 — Generic foods: import the Indian Nutrient Databank (1,014 recipes) as seed data (`source INDB`), starter foods win on shared names. Open: commercial-use OK from the INDB authors (no licence file).
- 2026-11-18 — Dark mode ground is true black `#000` (owner asked for the darkest); surfaces step up from it.
- 2026-11-18 — Account delete: two sheets + native alert, optional reasons/note stored anonymously (`account_deletion_feedback`).
- 2026-11-18 — Barcodes: all sources in parallel (OFF + optional FatSecret/USDA/Edamam/UPCitemdb by env); label scans whose numbers add up are shared at once (crowd coverage for Indian products); camera auto-opens a barcode, no barcode mode.
- 2026-11-17 — App tab bar is Today · Workout · [camera] · Coach · Profile; Progress moved to a card on Today (+ `/progress` stack screen); Today's workout card and "Ask your coach" row removed; "History" link renamed "Past logs".
- 2026-11-17 — Returning users: re-login never repeats onboarding; after 90+ days without app use (`users.lastActiveAt`, touched by GET /me hourly) the app asks only weight, height, waist/neck if body-fat goal, activity, equipment, training days/minutes, injuries, medical flag (`POST /api/welcome-back`, goal kept, targets recomputed; "Not now" = `POST /api/me/active`). Web does not show it (read-only).
- 2026-11-17 — Dark mode (app only): System/Light/Dark in Profile, palette in `apps/mobile/src/lib/palette.ts` designed (not inverted), `userInterfaceStyle: automatic` → app version 0.4.0 (store build). Web stays light.
- 2026-10-13 — Pro is ₹199/month or ₹1,499/year, 7-day trial, sold only in the phone apps via RevenueCat; web only shows the plan — docs/PREMIUM.md.
- 2026-11-11 — Dev knowledge base is local markdown in `.claude/context/` with hash-based staleness + hooks (no embeddings / no external service) — keeps code on the machine, fits grep+read workflow.
- Standing — `fitlens` identifiers (URL scheme, slug, cookie names, bucket, storage keys) stay frozen: renaming breaks deep links, OTA channels, sessions and stored photos.
- 2026-11-11 — Web is hosted on Vercel (response header `server: Vercel`); API on Cloud Run `fitlens-prod` asia-south1, deployed by GitHub Actions (last deploy 107c0ee, 2026-11-10).
- 2026-11-11 — Single backend: NestJS only, at `https://api.fitr8.com`; the web has no proxy/route handlers; session cookie Domain `.fitr8.com`. Clean cut-over (no real users yet, no compatibility rewrite).
- 2026-11-11 — Database stays PostgreSQL on Cloud SQL; move from `db-f1-micro` to a dedicated-core tier before launch; scale later by tier → HA → replicas → AlloyDB (all Postgres-compatible).
- 2026-11-11 — Ship everything together in one release after local verification.

- 2026-11-11 — Testing phase cost mode: Cloud SQL back to `db-f1-micro` (backups + PITR kept) and Cloud Run min instances 0, until testing ends. Then: `gcloud sql instances patch fitlens-db --project=fitlens-prod --tier=db-custom-1-3840` and repo var `API_MIN_INSTANCES=1`. Until then run setup.sh with `SQL_TIER=db-f1-micro` (its default would upgrade).

- 2026-11-17 — Custom reminders: server stores only title/description/`crons[]`/enabled; several rules per reminder; cron extended with L, L-n, d#n, dL, months. Fixed shapes repeat on the phone (daily/weekly/monthly ≤ 28th); changing dates are scheduled as the next 3 exact times and re-planned on app launch (stop after ~3 occurrences if the app is never opened). No push server.
- 2026-11-16 — Saved meals store priced item snapshots (like a confirmed meal), logged with no AI call; separate from auto "usuals".
- 2026-11-16 — Photo shutter checks for a barcode (live, then in the still) before using the AI; barcode → existing product/portion screen.
- 2026-11-26 — Measurements: rows may have no weight (`weightKg` nullable; weight readers use the newest row with one); body fat is calculated only (Navy; neck added to the form); a same-day weigh-in merges into the day's row. Feedback in /admin stays ADMIN-only; old lunch/dinner switches don't enable `remindMeals`.

## Open (need the owner's answer)

- INDB commercial use: email the authors (Lindsay Jaacks, University of Edinburgh) for written OK before production relies on it (repo has no licence file).
- Is the web staying read-only? Delete the unreachable web app screens (~6k lines) or revive a desktop shell?
- Paywall at launch: turn `PAYWALL_ENABLED` on, or hide Pro in the app until it is?
- Store status: are iOS/Android builds live, in review, or unsubmitted? (decides OTA blast radius)
- Production console config: which of Apple keys, RevenueCat keys, `PAYWALL_ENABLED`, `REDIS_URL`, `CORS_ORIGINS` are set on Cloud Run? Are RevenueCat keys in EAS env for `preview`?
- Sandbox purchases granting Pro in production: acceptable?
- Docs vs code: update docs to match code, or bring code back to ARCHITECTURE rules (e.g. module table ownership)?

- 2026-11-24 — Workout tab is Premium as a whole (spec "Workout unlock" assumption); `/api/workouts/*` stays open for briefing/coach. Training profile and logs are kept when Premium lapses.
- 2026-11-24 — Apple Health / Health Connect: free; read-only; the phone sends every record of the allowed types and the API stores all of it; the app shows only steps, heart rate, BMI, SpO2, sleep, recovery. Not read: reproductive/sexual health, nutrition, hydration, routes (store-review and double-count reasons).
- 2026-11-24 — Analytics: the spec's `kcal_estimate` is not sent (kcal is a health value).

## Figma "New" redesign of the app (decided by the user 2026-11-26, branch test/app-ui-testing)

Full list with context: `.claude/plans/figma-v2-ui.md`. In short: Inter font app-wide (Bricolage only for the wordmark); build backend for every design element (real data); Profile = hub, old Profile items → Settings (Account/Units/Appearance/Notifications/Privacy & data/Log out with confirmation), body details → Goal "About you"; Reminders = 3 switches (meals skipped once that meal is logged; weigh-in Mon 08:00 → opens Add measurement) + custom reminders kept; Apps & devices = platform health app + Wearables "Coming soon" (no Google Fit); Help = in-app FAQ (draft in `apps/mobile/src/components/support/faqs.ts`, needs review), email askfitr8@gmail.com, feedback form → /admin (admins only); Units metric only; meal suggestion rule-based; Home header avatar (photo upload built) + Go Premium / Premium pill + streak pill; streak flame animates only at a personal best; calendar replaces Past logs, always 6 rows, opens from the day switcher and from the streak sheet (same sheet morphs); over target = kcal > target × 1.05, under target counts as on target, days before start show no dot; measurements can be saved without weight, body fat calculated only (neck collected); weigh-ins via Measurements, check-ins editable/deletable; goal rows deep-link to their onboarding step; coach composer has no mic; Workout = week planner in Figma's look with structured rest-day fields, today's list + Up next (looks into next week), "Mixed plan" eyebrow; water glass fills without the pop.

- 2026-11-28 — Payments: the owner chose **Razorpay Subscriptions** for Premium (hosted checkout page opened from the app; webhook + re-read from Razorpay; 7-day trial once per person via `start_at`; cancel in Profile; account deletion cancels subscriptions). RevenueCat stays in the code, off without its keys. OPEN: Apple 3.1.1 / Google Play billing policy for an in-app paywall that opens Razorpay (check before the public release; fallback = RevenueCat keys, no Razorpay keys).
- SUPERSEDED (2026-11-27): payments plan — store billing via RevenueCat (UPI AutoPay works natively on App Store and Google Play in India), 7-day trial as store intro offer; unknown: whether Google Play India allows free trials now (fallback: server-side 7-day trial without mandate); Razorpay web checkout later. Awaiting user decisions: trial on both plans or yearly only; Android fallback; Razorpay timing.
- 2026-11-27 — Login per Figma: both "Sign Up For Free" and "Log In" open one sign-in sheet (server decides new vs returning); slides auto-advance 3.5 s + swipe, looping; page dots olive (not Figma purple); login always light; cover screen follows the theme.
- 2026-11-27 — Dependabot version-update PRs turned off (user): `.github/dependabot.yml` removed; dependency updates are done by hand when needed. Automatic security-fix PRs were already off.
