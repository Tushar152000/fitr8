import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Crown } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Linking, View } from "react-native";
import { PillButton, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { confirmAction } from "@/lib/confirm";
import { openPaywall } from "@/lib/premium";
import { threeLetterMonths } from "@/lib/profile-summary";
import { manageSubscriptionUrl } from "@/lib/purchases";
import { billingQuery, usageQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * Figma "Premium upsell" gradient (154°, black 8 % → olive 92 %), mapped onto a ~350 × 190 card.
 * Fixed in both themes, like the other gradient/primary surfaces.
 */
const UPSELL = {
  colors: ["#000000", "#718b00"] as const,
  start: { x: 0.33, y: -0.13 },
  end: { x: 0.67, y: 1.13 },
};

/**
 * Frame 8's plan card under the header. Free: "Check out Fitr8 Premium" → the paywall. Premium:
 * the same card with the plan, renewal and today's scans, and "Manage subscription" (or "End test
 * Premium" for a test purchase, so the free plan can be tried again).
 */
export function PlanCard({ pro }: { pro: boolean }) {
  return pro ? <PremiumCard /> : <UpsellCard />;
}

function Shell({ title, line, children }: { title: string; line: string; children: ReactNode }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <LinearGradient {...UPSELL} style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Crown size={18} color={c.highlight} strokeWidth={2} />
        <Text variant="heading3" color={c.white} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <Text variant="labelRegular" color={c.onInverse2} style={{ lineHeight: 18 }}>
        {line}
      </Text>
      <View style={{ height: 8 }} />
      {children}
    </LinearGradient>
  );
}

function UpsellCard() {
  return (
    <Shell
      title="Check out Fitr8 Premium"
      line="Unlock the AI coach, photo and barcode scanning, your weekly workout plan and more…"
    >
      <PillButton variant="onDark" label="Upgrade" onPress={() => openPaywall("profile")} />
    </Shell>
  );
}

const DAY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function PremiumCard() {
  const billing = useQuery(billingQuery);
  const usage = useQuery(usageQuery);
  const [ending, setEnding] = useState(false);
  const b = billing.data;
  const until = b?.proUntil ? threeLetterMonths(DAY.format(new Date(b.proUntil))) : null;
  const period = b?.period === "year" ? "Yearly" : b?.period === "month" ? "Monthly" : null;
  const renewal = b?.lifetime
    ? "Lifetime access"
    : until
      ? b?.willRenew
        ? `renews ${until}`
        : `until ${until}`
      : null;
  const scans = usage.data ? `${usage.data.left} of ${usage.data.limit} photo scans left today` : null;
  const line = [period, renewal, scans].filter(Boolean).join(" · ") || "Your Premium plan is active.";

  /** A test purchase (store billing not connected yet): back to Free, to try the free plan again. */
  async function endTest() {
    if (!(await confirmAction("End test Premium?", "You'll go back to the free plan.", "End Premium"))) return;
    setEnding(true);
    try {
      await api("/api/billing/test-purchase", { method: "DELETE" });
      await queryClient.invalidateQueries();
    } finally {
      setEnding(false);
    }
  }

  return (
    <Shell title="Fitr8 Premium" line={line}>
      {b?.store === "TEST" ? (
        <PillButton variant="onDark" label="End test Premium" loading={ending} onPress={endTest} />
      ) : (
        <PillButton
          variant="onDark"
          label="Manage subscription"
          accessibilityLabel="Manage subscription in the store"
          onPress={() => void Linking.openURL(manageSubscriptionUrl)}
        />
      )}
    </Shell>
  );
}

const useStyles = makeStyles((_c, shadows) => ({
  card: { gap: 6, padding: 20, borderRadius: radius.card, overflow: "hidden", ...shadows.card },
}));
