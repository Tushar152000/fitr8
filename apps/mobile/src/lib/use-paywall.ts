import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import type { BillingDto, RazorpayCheckoutDto } from "@fitr8/contracts";
import { track } from "@/lib/analytics";
import { api, ApiError } from "@/lib/api";
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

/** Free days when Razorpay applies the trial (the API decides who is eligible; domain TRIAL_DAYS). */
const RAZORPAY_TRIAL_DAYS = 7;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * State and actions of the Premium screen (design 14c): plans and the prices derived from them, the
 * picked plan, buy / restore / test purchase, and the paywall analytics. Three ways to buy, by what
 * the API says (docs/PREMIUM.md "Buying"): Razorpay (`billing.razorpay`: opens Razorpay's hosted
 * checkout in the browser, then the app asks the API to re-check when it comes back to the
 * foreground), store plans through RevenueCat, or, while neither is connected, a one-tap test purchase.
 */
export function usePaywall(source: PaywallSource) {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const plans = useQuery({ queryKey: ["pro-plans"], queryFn: proPlans, enabled: purchasesAvailable });
  const billing = useQuery(billingQuery);
  const [picked, setPicked] = useState<Period>("year");
  const [busy, setBusy] = useState<"buy" | "restore" | "check" | null>(null);
  // Razorpay checkout is open in the browser: we are waiting for the person to come back.
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeName = Platform.OS === "ios" ? "the App Store" : "Google Play";
  const storeSettings = Platform.OS === "ios" ? "Settings › Subscriptions" : "Play Store › Subscriptions";
  const razorpay = billing.data?.razorpay === true;
  // Razorpay sells at the launch prices; store plans only count when it is off.
  const offered = razorpay ? undefined : plans.data;
  const monthly = offered?.find((p) => p.period === "month");
  const yearly = offered?.find((p) => p.period === "year");
  const plan = picked === "year" ? yearly : monthly;
  // No store plans and store billing not connected: buying is a one-tap test purchase, no money.
  const testMode = !razorpay && !offered?.length && billing.data?.testPurchases === true;
  const loadingPrices = !razorpay && purchasesAvailable && plans.isPending;
  const canBuy = razorpay || Boolean(plan) || testMode;

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
      : offered?.length
        ? null
        : LIST_PRICE.yearSaving;
  const trialDays = razorpay ? (billing.data?.trialEligible ? RAZORPAY_TRIAL_DAYS : null) : (plan?.trialDays ?? null);
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
    // Came back from Razorpay already Premium (the app refetched before we re-checked): welcome them.
    if (waiting) {
      showToast("Welcome to Premium");
      void unlocked().catch(() => undefined);
    } else if (store && store !== "TEST" && store !== "RAZORPAY") void Linking.openURL(manageSubscriptionUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the plan changing only
  }, [alreadyPremium, store]);

  async function unlocked() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["billing"] }),
      queryClient.invalidateQueries({ queryKey: ["usage"] }),
      queryClient.invalidateQueries({ queryKey: ["reminders"] }),
      refresh(),
    ]);
  }

  /** Razorpay: ask the API to re-read the subscription; a payment can take a few seconds to land. */
  async function checkPayment() {
    if (busy) return;
    setBusy("check");
    setError(null);
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const now = await api<BillingDto>("/api/billing/refresh", { method: "POST" });
        if (now.plan === "PRO") {
          setWaiting(false);
          track("purchase_succeeded", { plan: planName, source });
          close();
          showToast("Welcome to Premium");
          await unlocked().catch(() => undefined);
          return;
        }
        if (attempt < 3) await sleep(2500);
      }
      setError("We haven't received your payment yet. If you've paid, wait a moment and check again.");
    } catch {
      setError("Couldn't check your payment. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  // Back from the Razorpay page (browser or UPI app): look for the payment at once.
  const checkRef = useRef(checkPayment);
  checkRef.current = checkPayment;
  useEffect(() => {
    if (!waiting) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkRef.current();
    });
    return () => sub.remove();
  }, [waiting]);

  async function buy() {
    if (!canBuy || busy) return;
    if (waiting) return checkPayment();
    setBusy("buy");
    setError(null);
    track("purchase_started", { plan: planName, source });
    try {
      if (razorpay) {
        const { checkoutUrl } = await api<RazorpayCheckoutDto>("/api/billing/razorpay/subscription", {
          json: { period: picked },
        });
        setWaiting(true);
        setBusy(null);
        await Linking.openURL(checkoutUrl);
        return;
      }
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
      setError(
        razorpay
          ? err instanceof ApiError && err.status === 409
            ? "You already have FITR8 Premium."
            : "Couldn't start the payment. You haven't been charged. Try again."
          : `Payment didn't go through. Try again, or check your payment method in ${storeName}.`,
      );
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
    razorpay,
    waiting,
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
    checkPayment,
    pick,
  };
}

export type Paywall = ReturnType<typeof usePaywall>;
