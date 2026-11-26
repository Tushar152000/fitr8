import { View } from "react-native";
import { Button, FieldError, PillButton, Text } from "@/components/ui";
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
        <Text variant="labelMedium" color={c.ink2} tabular>
          {trialDays
            ? `Free for ${trialDays} days, then ${chosenPrice}`
            : picked === "year"
              ? `${perMonth} a month, billed yearly`
              : "Billed monthly"}
        </Text>
        {picked === "year" && saving && (
          <Text variant="labelStrong" color={c.brandText} tabular>
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
        <Text variant="labelMedium" color={c.ink2} center>
          Test purchase: no money is charged while FITR8 is in testing.
        </Text>
      )}
      {hasStorePlan && (
        <Text variant="caption" color={c.ink3} center>
          Renews automatically until you cancel, at least 24 hours before the period ends, in {storeSettings}.{" "}
          <Text variant="captionStrong" color={c.brandText} onPress={() => openLegal("terms")}>
            Terms
          </Text>
          {" · "}
          <Text variant="captionStrong" color={c.brandText} onPress={() => openLegal("privacy")}>
            Privacy
          </Text>
        </Text>
      )}
      <View style={styles.links}>
        {purchasesAvailable && (
          <PillButton
            variant="link"
            label={busy === "restore" ? "Restoring…" : "Restore purchases"}
            onPress={restore}
            disabled={busy !== null}
            style={styles.link}
          />
        )}
        <PillButton
          variant="link"
          label="Continue with Free"
          onPress={close}
          disabled={busy === "buy"}
          style={styles.link}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  priceLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  links: { flexDirection: "row", justifyContent: "center", gap: 16 },
  // Link pills have no padding of their own: keep the 44 px hit area.
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
}));
