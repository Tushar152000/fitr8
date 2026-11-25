import { useQuery } from "@tanstack/react-query";
import { Camera, Crown, MessageCircle, ScanBarcode } from "lucide-react-native";
import { useState } from "react";
import { Linking, View } from "react-native";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { Button, PressableScale, Text } from "@/components/ui";
import { PlanPill } from "./plan-pill";
import { api } from "@/lib/api";
import { confirmAction } from "@/lib/confirm";
import { LIST_PRICE, openPaywall } from "@/lib/premium";
import { manageSubscriptionUrl } from "@/lib/purchases";
import { billingQuery } from "@/lib/queries";
import { queryClient } from "@/lib/query";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { UsageDto } from "@fitr8/contracts";

const FREE_TILES = [
  [Camera, "Snap a plate", "10 photos a day"],
  [ScanBarcode, "Scan packs", "Barcode and label"],
  [MessageCircle, "Ask the coach", "Food and training"],
] as const;

/**
 * Design 14a: the plan card, right under the name. Free: what typing already gives, what Premium
 * adds (with this month's typed meals when there are enough to matter), one button to the plans.
 * Premium: which plan, when it renews, and where to manage it.
 */
export function PlanCard({ usage }: { usage: UsageDto }) {
  return usage.plan === "PRO" ? <PremiumPlanCard usage={usage} /> : <FreePlanCard usage={usage} />;
}

/** Premium: plan, renewal, today's scans and where to manage it (or end a test purchase). */
function PremiumPlanCard({ usage }: { usage: UsageDto }) {
  const c = useColors();
  const styles = useStyles();
  const billing = useQuery(billingQuery);
  const [ending, setEnding] = useState(false);
  const b = billing.data;
  const until = b?.proUntil
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(b.proUntil))
    : null;
  const period = b?.period === "year" ? "Yearly" : b?.period === "month" ? "Monthly" : null;
  const renewal = b?.lifetime
    ? "Lifetime access"
    : until
      ? b?.willRenew
        ? `renews ${until}`
        : `until ${until}`
      : null;

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
    <View style={styles.card} accessibilityLabel="Your plan">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <PremiumBadge label="Premium" size="md" />
        <Text size={13} weight={600} color={c.ink3} tabular>
          {usage.left} of {usage.limit} photo scans left today
        </Text>
      </View>
      <Text weight={700} size={16}>
        {["Premium", period, renewal].filter(Boolean).join(" · ")}
      </Text>
      <Text size={13} color={c.ink2}>
        Photo, barcode and label scanning, the AI Coach (40 messages a day) and unlimited reminders.
      </Text>
      {b?.store === "TEST" ? (
        <Button variant="secondary" loading={ending} onPress={endTest}>
          End test Premium
        </Button>
      ) : (
        <PressableScale
          accessibilityRole="link"
          onPress={() => Linking.openURL(manageSubscriptionUrl)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text weight={600} color={c.brandText}>
            Manage subscription ›
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

/** Free: typing is free, three Premium tiles (and this month's typed meals from 5 on), the paywall button. */
function FreePlanCard({ usage }: { usage: UsageDto }) {
  const c = useColors();
  const styles = useStyles();
  const month = usage.typedMeals?.thisMonth ?? 0;
  return (
    <View style={styles.card} accessibilityLabel="Your plan">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text size={13} weight={600} color={c.ink3}>
          Your plan
        </Text>
        <PlanPill label="Free" size={12} />
      </View>
      <View style={{ gap: 4 }}>
        <Text weight={700} size={18}>
          Typing meals is free, always.
        </Text>
        <Text size={14} color={c.ink2}>
          Premium adds faster ways to log and a coach that knows your day.
        </Text>
      </View>
      {month >= 5 && (
        <View style={styles.usageStrip}>
          <Text size={13} color={c.ink2} tabular>
            This month you typed {month} meals. With Premium, most of them take one photo.
          </Text>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {FREE_TILES.map(([Icon, title, sub]) => (
          <View key={title} style={styles.tile}>
            <View style={styles.tileIcon}>
              <Icon size={16} color={c.brandText} />
            </View>
            <Text size={13} weight={700}>
              {title}
            </Text>
            <Text size={12} color={c.ink3}>
              {sub}
            </Text>
          </View>
        ))}
      </View>
      <Button icon={Crown} onPress={() => openPaywall("profile")}>
        See what Premium adds
      </Button>
      <Text size={12} color={c.ink3} center>
        From {LIST_PRICE.perMonth} a month, billed yearly. Cancel anytime.
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    gap: 12,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: c.premiumLine,
  },
  usageStrip: { backgroundColor: c.brandSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  tile: { flex: 1, gap: 4, padding: 10, borderRadius: 14, backgroundColor: c.sunken },
  tileIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: c.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
}));
