import { View } from "react-native";
import { Button, FieldError, Text } from "@/components/ui";
import { openLegal } from "@/lib/legal";
import { purchasesAvailable } from "@/lib/purchases";
import { makeStyles, useColors } from "@/lib/theme";
import type { Paywall } from "@/lib/use-paywall";

/**
 * Design 14c sticky footer, compact (user request 2026-11-28): one button, then two small lines.
 * Line 1 = what you pay and that it renews (trial, per-month for yearly, or test purchase) — the
 * stores require price, period and auto-renew next to the button. Line 2 = Restore · Terms · Privacy
 * · Not now (Continue with Free). Errors show under the button.
 */
export function PaywallFooter({ paywall }: { paywall: Paywall }) {
  const c = useColors();
  const styles = useStyles();
  const {
    picked,
    busy,
    error,
    hasStorePlan,
    razorpay,
    waiting,
    testMode,
    loadingPrices,
    canBuy,
    perMonth,
    trialDays,
    chosenPrice,
    storeSettings,
    close,
    buy,
    restore,
  } = paywall;
  const period = picked === "year" ? "year" : "month";

  const label =
    busy === "buy" || busy === "check"
      ? busy === "check"
        ? "Checking payment…"
        : "Processing…"
      : waiting
        ? "I've paid · check again"
      : !canBuy && !loadingPrices
        ? "Coming soon"
        : trialDays
          ? `Try ${trialDays} days free`
          : `Get Premium · ${chosenPrice}/${period === "year" ? "yr" : "mo"}`;

  const terms = testMode
    ? "Test purchase · no money is charged"
    : razorpay
      ? trialDays
        ? `Then ${chosenPrice}/${period} · UPI AutoPay or card · cancel anytime in Profile`
        : `${chosenPrice}/${period} · UPI AutoPay or card · cancel anytime in Profile`
    : trialDays
      ? `Then ${chosenPrice}/${period} · cancel anytime`
      : picked === "year"
        ? `${perMonth}/month, billed yearly · renews until you cancel`
        : "Billed monthly · renews until you cancel";

  const link = (text: string, onPress: () => void, disabled = false) => (
    <Text
      variant="captionStrong"
      color={disabled ? c.ink3 : c.ink2}
      onPress={disabled ? undefined : onPress}
      accessibilityRole="link"
      suppressHighlighting
      style={styles.link}
    >
      {text}
    </Text>
  );

  return (
    <View style={{ gap: 8 }}>
      <Button height={50} onPress={buy} loading={busy === "buy" || busy === "check"} disabled={!canBuy || busy !== null || loadingPrices}>
        {label}
      </Button>
      {error && <FieldError>{error}</FieldError>}
      <Text
        variant="caption"
        color={c.ink2}
        center
        tabular
        accessibilityLabel={hasStorePlan && !razorpay ? `${terms}. Cancel in ${storeSettings}.` : terms}
      >
        {terms}
      </Text>
      <View style={styles.links}>
        {purchasesAvailable && link(busy === "restore" ? "Restoring…" : "Restore", restore, busy !== null)}
        {link("Terms", () => openLegal("terms"))}
        {link("Privacy", () => openLegal("privacy"))}
        {link("Not now", close, busy === "buy" || busy === "check")}
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  links: { flexDirection: "row", justifyContent: "center", gap: 18 },
  // Small text, but a comfortable tap area.
  link: { paddingVertical: 6, paddingHorizontal: 2 },
}));
