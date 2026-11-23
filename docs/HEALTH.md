# Apple Health and Health Connect

Built 2026-11-24. Free for every user. Read-only: FITR8 never writes to the user's health data.

## What happens

```
Health screen (Profile → Health apps, or Today's "Connect" card)
  → explainer (what we read, read-only, never sold, delete any time)
  → system permission screen (HealthKit sheet / Health Connect)
  → POST /api/health-data/connect {platform, permissions}
  → first sync: last 30 days of records + daily totals
App open / back to foreground (≤ every 15 min): sync from (last sync − 2 days) to now
  → POST /api/health-data/sync in batches of 500 records (idempotent upserts)
Today + Health screen: GET /api/health-data/summary → steps, heart rate, BMI, SpO2, sleep, recovery
```

- **Everything the platform gives is stored** (`health_samples`, one row per record, series and
  sleep stages split out, the rest of the record in `data`), plus the platform's own de-duplicated
  daily totals (`health_daily`: steps, distance, active/total energy, floors, exercise minutes).
  Only six things are shown. The AI coach can read the same summary (`get_health_summary` tool) and
  the Workout tab shows today's recovery advice.
- **Steps** come from the daily totals (phone + watch counted once). **Heart rate**: day average,
  min, max, latest, and resting. **BMI**: newest of a health-app weight or a FITR8 weigh-in, with the
  profile height. **SpO2**: day average, lowest, latest. **Sleep**: the night that ended on the day
  (18:00 → 18:00 local), asleep stages merged across sources. **Recovery** (0–100): sleep (40%),
  resting heart rate vs the user's 14-day usual (30%), HRV vs usual (30%); missing signals re-weighted.
  Rules and tests: `packages/domain/src/health.ts`.
- Disconnect keeps stored data; "Disconnect and delete synced data" deletes it
  (`DELETE /api/health-data/connections/:platform?deleteData=true`). Account deletion cascades.
- Limits: records up to 400 days old; deletions made in the health app are not mirrored (the
  record stays until the user deletes synced data); no background sync (only while the app is open).

## Code map

| Where                                                   | What                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `packages/domain/src/health.ts`                         | types and units, plausibility, sleep merge, BMI, recovery                       |
| `packages/contracts/src/health.ts`                      | request schemas (`HealthSyncSchema` …) and DTOs                                 |
| `apps/api/src/modules/health-data/`                     | routes, raw-SQL bulk upsert, summary                                            |
| `apps/mobile/src/lib/health/`                           | `health-connect.ts`, `healthkit.ts` (adapters), `sync.ts`, `use-health-sync.ts` |
| `apps/mobile/src/app/health.tsx`, `components/health/*` | Health screen, Today card, six tiles                                            |

## What we read (keep these lists identical)

Android (`apps/mobile/app.json` `android.permissions` = `HEALTH_CONNECT_TYPES` in
`health-connect.ts`): Steps, Distance, Floors climbed, Active calories, Total calories, Basal
metabolic rate, Exercise, Heart rate, Resting heart rate, Heart rate variability, Oxygen saturation,
Respiratory rate, Body temperature, Blood pressure, Blood glucose, VO2 max, Weight, Height, Body fat,
Lean body mass, Bone mass, Body water mass, Sleep, Elevation gained.

iPhone (`healthkit.ts` `HEALTHKIT_READ`): step count, walking/running and cycling distance, flights,
active and basal energy, exercise and stand minutes, heart rate, resting and walking heart rate,
HRV (SDNN), oxygen saturation, respiratory rate, body temperature, blood pressure, blood glucose,
VO2 max, weight, height, body fat, lean body mass, BMI, waist, sleep analysis, mindful minutes,
workouts.

Not read on purpose: reproductive and sexual health, nutrition and hydration (FITR8 is the source
of food and water; reading them back would double count), exercise routes/location.

## Store setup (by you, before release)

1. **Native build.** The app version is **0.5.0** (`runtimeVersion` = app version), so 0.4.x builds
   never receive this JS over the air. A new EAS build is required for both platforms.
2. **Google Play → App content → Health apps declaration**: declare each READ permission above with
   its use ("show steps/heart rate/sleep/SpO2/BMI in the app, estimate recovery, tailor the workout
   plan"). Approval can take ~7 days plus allow-list propagation; until then Health Connect returns
   no data for release builds. **Data safety**: Health and fitness → collected, linked to the user,
   app functionality, not shared, encrypted in transit, deletable.
3. **Apple**: HealthKit capability is added by the config plugin (no background delivery). App
   Store Connect → App Privacy → Health & Fitness: collected, linked, app functionality, not used
   for tracking. Review notes: Profile → Health apps → Connect Apple Health.
4. **Privacy policy** (`/privacy`) must say: which health data is read, that it is stored on FITR8
   servers to show it and personalise training, never sold or used for advertising, and how to
   disconnect and delete it. Both stores check this.
