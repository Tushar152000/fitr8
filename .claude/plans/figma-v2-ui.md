# Figma "New" frame → mobile app (2026-11-26)

Branch `test/app-ui-testing`. Figma file `HcHRBNfloj5cDxTO1vh6OI`, section `5344:3888` ("New").
Target: `apps/mobile` matches each frame exactly (layout, type, colour, spacing, components), in light
mode; dark mode keeps working through the palette tokens.

## How to read the design

- Use the Figma MCP: `create_session` once, then `get_design_context` (with
  `skillNames: "resource:figma-design-to-code"`, `clientFrameworks: "react-native,expo"`) for exact
  values. Read the `figma-design-to-code` resource first. Screenshots are the visual target only.
- Icons in the design are Lucide icons (Icon/target, Icon/bell, Icon/ruler …): use
  `lucide-react-native` with the same name. Non-Lucide art (flame drop, glasses) — download the SVG
  asset from the design context response into `apps/mobile/assets/` and render it with
  `react-native-svg` / existing components; never reference figma.com URLs at runtime.
- Status bar (9:41) is not part of the app UI.

## Frames → routes

| # | Frame | Node | Route |
|---|---|---|---|
| 1 | Home ("iPhone 13 & 14 - 24") | 5244:10228 | `/today` |
| 2 | Today – Streak sheet | 5250:2530 | sheet on `/today` (tap streak pill) |
| 3 | Meals – Calendar | 5265:3580 | sheet on `/meals` (tap the middle of the day switcher) |
| 4 | Meals | 5261:3170 | `/meals` |
| 5 | Snap your meal | 5244:9923 | `/log` |
| 6 | Your coach | 5244:9990 | `/coach` |
| 7 | Workout – Recover today | 5244:10068 | `/workout` (week view, Premium + training set up) |
| 8 | Profile | 5253:2566 | `/profile` (hub) |
| 9 | Profile / Goal | 5255:2779 | new `/goal` |
| 10 | Profile / Progress | 5255:2874 | `/progress` |
| 11 | Profile / Measurements | 5255:2962 | new `/measurements` |
| 12 | Profile / Reminders | 5255:3091 | `/reminders` |
| 13 | Profile / Apps & devices | 5255:3110 | `/health` |
| 14 | Profile / Help & support | 5255:3129 | new `/support` |
| 15 | Profile / Settings | 5255:3148 | new `/settings` |

## User decisions (do not re-ask)

1. Font: Inter everywhere (done: `fonts.*` → Inter; Bricolage only for the wordmark). Update docs/DESIGN.md.
2. Missing data: build the backend too (contracts → domain → migration → Nest → e2e), real data everywhere.
3. Profile becomes the hub. Old Profile content moves to Settings: Account (name, phone, delete
   account), Units, Notifications, Privacy & data (export CSV), Appearance row, Log out. Body
   details (height, activity …) live under Goal / Measurements.
4. Reminders: Figma's 3 switches (Meal reminders, Water reminders, Weekly weigh-in) on top, custom
   free-text reminders kept below, restyled.
5. Apps & devices: Apple Health on iOS / Health Connect on Android (real connection) in Figma's row
   style; Wearables row = "Coming soon". No Google Fit row.
6. Help & support: FAQs = in-app list (draft answers from how the app works; user reviews);
   Chat with support = opens email to the support address; Send feedback = in-app form → new API
   endpoint, visible in /admin.
7. Units: Metric only; Units row opens a sheet with Imperial "Coming soon".
8. Meal suggestion card: rule-based (saved meals / recent foods that fit kcal + protein left), no AI;
   tap opens the coach with that question.
9. Home header: avatar + "Go Premium" (free) / Premium badge pill (Premium) + streak pill. No date/greeting.
10. Calendar opens from the day switcher's middle; it replaces the Past logs screen and button.
11. Coach composer: no mic (needs native build).
12. Food icons on Meals: keyword match on the item name, fallback bowl. No backend.

## Shared pieces (already built — reuse, don't duplicate)

- `Text` variants = Figma styles: `stat` (Display/Stat), `title`, `heading1..3`, `bodySm`,
  `bodyMedium`, `bodyStrong`, `labelRegular|Medium|Strong`, `caption`, `captionStrong`, `nav`.
- `PageHeader` (Top Bar: round back + eyebrow + title, `trailing`), `IconButton`, `goBack`.
- `MenuGroup` (+ `label` → SectionLabel), `MenuRow` (icon tile, title, subtitle, value, chevron,
  `trailing`), `IconTile` (`accent`), `SectionLabel`.
- `PillButton` (`primary` gradient, `secondary`, `soft`, `link`).
- Tokens: palette already = Figma (`ground` canvas, `surface`, `track`, `line` border-subtle,
  `lineStrong` divider, `ink/ink2/ink3`, `brand`/`brandText` olive, `brandSoft` accent-subtle,
  `highlight` lime, `link` blue, `panel` inverse, `onInverse2`). Shadow `card` = Elevation/Card.
  Gradients: `PRIMARY_PILL` (pills/avatar/camera), `COACH_HERO`.
- Screen gutter 20 (350 wide content on 390), Figma screens start content 8 px under the status bar.

## Rules for every agent

- Follow CLAUDE.md, docs/ARCHITECTURE.md, the `fitr8-feature` / `fitr8-loop` skills.
- Don't assume product behaviour that isn't in the design or the decisions above: stop and report
  the question instead of guessing.
- Verify visually: screenshot script
  `node /tmp/claude-1000/-home-diyvam-fitlens/82b97c79-83ca-42d5-bed3-674ec27cc86f/scratchpad/shot.cjs <route> <out.png> [full] [waitMs]`
  (env `TOKEN` = dev session token from `POST localhost:4000/api/auth/dev {"email":"smoke@fitlens.test"}`;
  app at http://localhost:8083; Node 22: `export PATH=$HOME/.nvm/versions/node/v22.22.0/bin:$PATH`).
  The test user `smoke@fitlens.test` has test Premium. Compare against the Figma screenshot side by side.
- Never `pnpm add/remove` while the dev servers run without saying so (it restarts them).
- Don't commit.
