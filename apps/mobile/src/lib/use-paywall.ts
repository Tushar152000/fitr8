import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { LIST_PRICE, type PaywallSource } from "@/lib/premium";
import {
  buyPlan,
  manageSubscriptionUrl,
  proPlans,
  purchasesAvailable,
  restorePurchases,
  type ProPlan,
} from "@/lib/purchases";
import { billingQuery } from "@/lib/queries";
import { showToast } from "@/lib/toast";

export type Period = ProPlan["period"];

/**
 * State and actions of the Premium screen (design 14c): store plans and the prices derived from
 * them, the picked plan, buy / restore / test purchase, and the paywall analytics. Prices come from
 * the store (Google Play / App Store through RevenueCat); until store billing is connected, buying is
 * a one-tap test purchase (docs/PREMIUM.md "Buying").
 */
export function usePaywall(source: PaywallSource) {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const plans = useQuery({ queryKey: ["pro-plans"], queryFn: proPlans, enabled: purchasesAvailable });
  const billing = useQuery(billingQuery);
  const [picked, setPicked] = useState<Period>("year");
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storeName = Platform.OS === "ios" ? "the App Store" : "Google Play";
  const storeSettings = Platform.OS === "ios" ? "Settings › Subscriptions" : "Play Store › Subscriptions";
  const monthly = plans.data?.find((p) => p.period === "month");
  const yearly = plans.data?.find((p) => p.period === "year");
  const plan = picked === "year" ? yearly : monthly;
  // No store plans and store billing not connected: buying is a one-tap test purchase, no money.
  const testMode = !plans.data?.length && billing.data?.testPurchases === true;
  const loadingPrices = purchasesAvailable && plans.isPending;
  const canBuy = Boolean(plan) || testMode;

  // Store prices when we have them; the launch prices otherwise.
  const currency = yearly?.pkg.product.currencyCode ?? "INR";
  const yearPrice = yearly?.price ?? LIST_PRICE.year;
  const monthPrice = monthly?.price ?? LIST_PRICE.month;
  const perMonth = yearly ? money(yearly.pkg.product.price / 12, currency) : LIST_PRICE.perMonth;
  const perDayUnder = yearly ? money(Math.ceil(yearly.pkg.product.price / 365), currency) : LIST_PRICE.perDayUnder;
  const storeSaving = yearly && monthly ? monthly.pkg.product.price * 12 - yearly.pkg.product.price : null;
  const saving =
    storeSaving !== null
      ? storeSaving > 0
        ? money(storeSaving, currency)
        : null
      : plans.data?.length
        ? null
        : LIST_PRICE.yearSaving;
  const trialDays = plan?.trialDays ?? null;
  const planName = picked === "year" ? "yearly" : "monthly";
  const chosenPrice = picked === "year" ? `${yearPrice}/year` : `${monthPrice}/month`;

  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("paywall_viewed", { source });
  }, [source]);

  // Leave the paywall once: back where the user came from, else `fallback` (opened by a link or a
  // reload, there is no history and GO_BACK would be unhandled). A restore or purchase that leaves
  // must not be followed by the already-Premium redirect below popping a second screen.
  const left = useRef(false);
  const leave = (fallback: "/today" | "/profile") => {
    if (left.current) return;
    left.current = true;
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };
  const close = () => leave("/today");

  // Already Premium: nothing to sell here. Leave (to Profile, where the plan is managed, when there
  // is no history), and open the store's subscription page.
  const alreadyPremium = billing.data?.plan === "PRO" && busy === null;
  const store = billing.data?.store;
  useEffect(() => {
    if (!alreadyPremium || left.current) return;
    leave("/profile");
    if (store && store !== "TEST") void Linking.openURL(manageSubscriptionUrl);
  }, [alreadyPremium, store]);

  async function unlocked() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["billing"] }),
      queryClient.invalidateQueries({ queryKey: ["usage"] }),
      queryClient.invalidateQueries({ queryKey: ["reminders"] }),
      refresh(),
    ]);
  }

  async function buy() {
    if (!canBuy || busy) return;
    setBusy("buy");
    setError(null);
    track("purchase_started", { plan: planName, source });
    try {
      if (testMode) {
        await api("/api/billing/test-purchase", { json: { period: picked } });
      } else if (!(await buyPlan(plan!))) {
        track("purchase_cancelled", { plan: planName, source });
        setBusy(null);
        return;
      } else {
        // The store has charged: never show an error that invites a second purchase.
        await api("/api/billing/refresh", { method: "POST" }).catch(() => undefined);
      }
      track("purchase_succeeded", { plan: planName, source });
      close();
      showToast("Welcome to Premium");
      await unlocked().catch(() => undefined);
    } catch (err) {
      track("purchase_failed", {
        plan: planName,
        source,
        error_code: err instanceof Error && err.name ? err.name : "error",
      });
      setError(`Payment didn't go through. Try again, or check your payment method in ${storeName}.`);
      setBusy(null);
    }
  }

  async function restore() {
    setBusy("restore");
    setError(null);
    try {
      await restorePurchases();
      await api("/api/billing/refresh", { method: "POST" });
      const now = await queryClient.fetchQuery({ ...billingQuery, staleTime: 0 });
      if (now.plan === "PRO") {
        close();
        showToast("Welcome back to Premium");
        await unlocked();
        return;
      }
      setError(`No FITR8 Premium subscription found for this ${storeName} account.`);
    } catch {
      setError("Couldn't restore purchases. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  function pick(period: Period) {
    if (busy) return;
    setPicked(period);
    track("paywall_plan_selected", { plan: period === "year" ? "yearly" : "monthly" });
  }

  return {
    picked,
    busy,
    error,
    hasStorePlan: Boolean(plan),
    testMode,
    loadingPrices,
    canBuy,
    yearPrice,
    monthPrice,
    perMonth,
    perDayUnder,
    saving,
    trialDays,
    chosenPrice,
    storeName,
    storeSettings,
    alreadyPremium,
    close,
    buy,
    restore,
    pick,
  };
}

export type Paywall = ReturnType<typeof usePaywall>;
