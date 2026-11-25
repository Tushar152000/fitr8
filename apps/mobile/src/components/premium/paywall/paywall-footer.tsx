import { View } from "react-native";
import { Button, FieldError, PressableScale, Text } from "@/components/ui";
import { openLegal } from "@/lib/legal";
import { purchasesAvailable } from "@/lib/purchases";
import { makeStyles, useColors } from "@/lib/theme";
import type { Paywall } from "@/lib/use-paywall";

/**
 * Design 14c sticky footer: the chosen plan's price line, the upgrade button, purchase errors, the
 * test-purchase and auto-renew notes, then Restore purchases and Continue with Free.
 */
export function PaywallFooter({ paywall }: { paywall: Paywall }) {
  const c = useColors();
  const styles = useStyles();
  const {
    picked,
    busy,
    error,
    hasStorePlan,
    testMode,
    loadingPrices,
    canBuy,
    perMonth,
    saving,
    trialDays,
    chosenPrice,
    storeSettings,
    close,
    buy,
    restore,
  } = paywall;
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.priceLine}>
        <Text size={13} weight={600} color={c.ink2} tabular>
          {trialDays
            ? `Free for ${trialDays} days, then ${chosenPrice}`
            : picked === "year"
              ? `${perMonth} a month, billed yearly`
              : "Billed monthly"}
        </Text>
        {picked === "year" && saving && (
          <Text size={13} weight={700} color={c.protein} tabular>
            You save {saving}
          </Text>
        )}
      </View>
      <Button onPress={buy} loading={busy === "buy"} disabled={!canBuy || busy !== null || loadingPrices}>
        {busy === "buy"
          ? "Processing…"
          : !canBuy && !loadingPrices
            ? "Coming soon"
            : trialDays
              ? `Start ${trialDays}-day free trial`
              : `Get Premium · ${chosenPrice}`}
      </Button>
      {error && <FieldError>{error}</FieldError>}
      {testMode && (
        <Text size={12} weight={600} color={c.ink2} center>
          Test purchase: no money is charged while FITR8 is in testing.
        </Text>
      )}
      {hasStorePlan && (
        <Text size={11} color={c.ink3} center>
          Renews automatically until you cancel, at least 24 hours before the period ends, in {storeSettings}.{" "}
          <Text size={11} color={c.brandText} weight={600} onPress={() => openLegal("terms")}>
            Terms
          </Text>
          {" · "}
          <Text size={11} color={c.brandText} weight={600} onPress={() => openLegal("privacy")}>
            Privacy
          </Text>
        </Text>
      )}
      <View style={styles.links}>
        {purchasesAvailable && (
          <PressableScale accessibilityRole="button" onPress={restore} disabled={busy !== null} style={styles.link}>
            <Text size={14} weight={600} color={c.ink2}>
              {busy === "restore" ? "Restoring…" : "Restore purchases"}
            </Text>
          </PressableScale>
        )}
        <PressableScale accessibilityRole="button" onPress={close} disabled={busy === "buy"} style={styles.link}>
          <Text size={14} weight={600} color={c.ink2}>
            Continue with Free
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  priceLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  links: { flexDirection: "row", justifyContent: "center", gap: 16 },
  link: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
}));
