import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { BillingNotes } from "@/components/premium/paywall/billing-notes";
import { CompareTable } from "@/components/premium/paywall/compare-table";
import { FEATURES } from "@/components/premium/paywall/data";
import { Faq } from "@/components/premium/paywall/faq";
import { FeatureList } from "@/components/premium/paywall/feature-list";
import { PaywallFooter } from "@/components/premium/paywall/paywall-footer";
import { PlanPicker } from "@/components/premium/paywall/plan-picker";
import { ProHero, ProTopBar } from "@/components/premium/paywall/pro-hero";
import { Screen } from "@/components/ui";
import { track } from "@/lib/analytics";
import type { PaywallSource } from "@/lib/premium";
import { usePaywall } from "@/lib/use-paywall";

const SOURCES: PaywallSource[] = [
  "home_banner",
  "home_header",
  "profile",
  "onboarding",
  "locked_photo",
  "locked_barcode",
  "locked_label",
  "locked_coach",
  "locked_reminders",
  "locked_workouts",
  "workout_tab",
];

/**
 * Design 14c: the Premium screen. Opened from the Today banner, Profile, a locked feature's sheet
 * (`?source=`), or once after onboarding. Prices come from the store (Google Play / App Store through
 * RevenueCat) and the per-month, per-day and savings figures are computed from them; until store
 * billing is connected, "Get Premium" is a one-tap test purchase (docs/PREMIUM.md "Buying").
 *
 * Never blocks: ✕ and "Continue with Free" always return to where the user was.
 */
export default function ProScreen() {
  const params = useLocalSearchParams<{ source?: string }>();
  const source: PaywallSource = SOURCES.includes(params.source as PaywallSource)
    ? (params.source as PaywallSource)
    : "profile";
  const paywall = usePaywall(source);
  const [open, setOpen] = useState<string>(
    source === "workout_tab" || source === "locked_workouts" ? "workouts" : FEATURES[0]!.key,
  );

  if (paywall.alreadyPremium) return null;

  return (
    <Screen gutter={20} footer={<PaywallFooter paywall={paywall} />}>
      <ProTopBar onClose={paywall.close} />
      <ProHero />
      <PlanPicker
        loading={paywall.loadingPrices}
        picked={paywall.picked}
        disabled={paywall.busy !== null}
        onPick={paywall.pick}
        saving={paywall.saving}
        perDayUnder={paywall.perDayUnder}
        perMonth={paywall.perMonth}
        yearPrice={paywall.yearPrice}
        monthPrice={paywall.monthPrice}
      />
      <FeatureList
        open={open}
        onExpand={(key) => {
          setOpen(key);
          track("paywall_feature_expanded", { feature: key });
        }}
      />
      <CompareTable />
      <BillingNotes testMode={paywall.testMode} storeName={paywall.storeName} storeSettings={paywall.storeSettings} />
      <Faq storeSettings={paywall.storeSettings} />
    </Screen>
  );
}
