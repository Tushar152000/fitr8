import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react-native";
import { useState } from "react";
import { Linking, View } from "react-native";
import { MovingGradient, PillButton, ProgressFill, StatusPill, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { confirmAction } from "@/lib/confirm";
import { openPaywall } from "@/lib/premium";
import { threeLetterMonths } from "@/lib/profile-summary";
import { manageSubscriptionUrl } from "@/lib/purchases";
import { billingQuery, usageQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * Frame 8's plan card under the header, redesigned (user request 2026-11-28): a white card (theme
 * surface, Elevation/Card). Free: crown tile, "Check out Fitr8 Premium", a line and "Upgrade" → the
 * paywall. Premium: crown tile + "Fitr8 Premium" + an "Active" tag, then rows for the plan, renewal
 * and today's photo scans (with a bar), and "Manage subscription" (or "End test Premium" for a test
 * purchase, so the free plan can be tried again).
 */
export function PlanCard({ pro }: { pro: boolean }) {
  return pro ? <PremiumCard /> : <UpsellCard />;
}

/** Lime crown on the always-dark tile, in both themes. */
const LIME = "#C2E04A";

/** 44 px rounded tile with the moving gradient and a lime crown. */
function CrownTile() {
  const styles = useStyles();
  return (
    <View style={styles.tile}>
      <MovingGradient width={44} height={44} />
      <Crown size={20} color={LIME} strokeWidth={2} />
    </View>
  );
}

function UpsellCard() {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <CrownTile />
        <Text variant="heading3" color={c.ink} accessibilityRole="header" style={{ flex: 1 }}>
          Check out Fitr8 Premium
        </Text>
      </View>
      <Text variant="labelRegular" color={c.ink2} style={{ lineHeight: 18 }}>
        Unlock the AI coach, photo and barcode scanning, your weekly workout plan and more…
      </Text>
      <PillButton label="Upgrade" onPress={() => openPaywall("profile")} style={styles.action} />
    </View>
  );
}

const DAY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function PremiumCard() {
  const c = useColors();
  const styles = useStyles();
  const billing = useQuery(billingQuery);
  const usage = useQuery(usageQuery);
  const [ending, setEnding] = useState(false);
  const b = billing.data;
  const u = usage.data;
  const test = b?.store === "TEST";
  const until = b?.proUntil ? threeLetterMonths(DAY.format(new Date(b.proUntil))) : null;

  const plan = b?.lifetime
    ? "Lifetime"
    : b?.period === "year"
      ? "Yearly"
      : b?.period === "month"
        ? "Monthly"
        : test
          ? "Test plan"
          : "Premium";
  const renewal = b?.lifetime ? null : until ? { label: b?.willRenew ? "Renews" : "Active until", value: until } : null;

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
    <View style={styles.card}>
      <View style={styles.head}>
        <CrownTile />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading3" color={c.ink} accessibilityRole="header">
            Fitr8 Premium
          </Text>
          <Text variant="labelRegular" color={c.ink2}>
            {test ? "Test purchase · no charge" : "Everything unlocked"}
          </Text>
        </View>
        <StatusPill label="Active" />
      </View>

      <View style={styles.rows}>
        <Row label="Plan" value={plan} />
        {renewal && <Row label={renewal.label} value={renewal.value} />}
        {u && (
          <View style={{ gap: 8 }}>
            <Row label="Photo scans today" value={`${u.left} of ${u.limit} left`} />
            <ProgressFill
              fraction={u.limit ? u.left / u.limit : 0}
              color={c.brand}
              trackStyle={styles.track}
              fillStyle={styles.fill}
            />
          </View>
        )}
      </View>

      {test ? (
        <PillButton variant="soft" label="End test Premium" loading={ending} onPress={endTest} style={styles.action} />
      ) : (
        <PillButton
          variant="soft"
          label="Manage subscription"
          accessibilityLabel="Manage subscription in the store"
          onPress={() => void Linking.openURL(manageSubscriptionUrl)}
          style={styles.action}
        />
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text variant="labelRegular" color={c.ink2}>
        {label}
      </Text>
      <Text variant="labelStrong" color={c.ink} tabular numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 14, padding: 20, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.tile,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  rows: { gap: 12, padding: 14, borderRadius: radius.box, backgroundColor: c.ground },
  track: { height: 6, borderRadius: 3, backgroundColor: c.sunken, overflow: "hidden" },
  fill: { borderRadius: 3 },
  action: { alignSelf: "stretch" },
}));
