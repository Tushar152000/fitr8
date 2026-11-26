import { Check } from "lucide-react-native";
import { View } from "react-native";
import { PressableScale, Skeleton, StatusPill, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { Period } from "@/lib/use-paywall";
import { PaywallGroup } from "./group";

/**
 * Design 14c "Choose your plan": Yearly and Monthly as a radio group, skeletons while store prices
 * load. Picking is blocked while a purchase or restore runs.
 */
export function PlanPicker({
  loading,
  picked,
  disabled,
  onPick,
  saving,
  perDayUnder,
  perMonth,
  yearPrice,
  monthPrice,
}: {
  loading: boolean;
  picked: Period;
  disabled: boolean;
  onPick: (period: Period) => void;
  saving: string | null;
  perDayUnder: string;
  perMonth: string;
  yearPrice: string;
  monthPrice: string;
}) {
  return (
    <PaywallGroup label="Choose your plan">
      {loading ? (
        <>
          <Skeleton height={84} radius={radius.card} />
          <Skeleton height={72} radius={radius.card} />
        </>
      ) : (
        <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Choose a plan">
          <PlanCard
            selected={picked === "year"}
            disabled={disabled}
            onPress={() => onPick("year")}
            title="Yearly"
            badge={saving ? `Save ${saving}` : undefined}
            detail={`Under ${perDayUnder} a day · best value`}
            price={yearPrice}
            priceDetail={`a year · ${perMonth}/mo`}
          />
          <PlanCard
            selected={picked === "month"}
            disabled={disabled}
            onPress={() => onPick("month")}
            title="Monthly"
            detail="Billed every month, cancel anytime"
            price={monthPrice}
            priceDetail="a month"
          />
        </View>
      )}
    </PaywallGroup>
  );
}

/** One plan as a radio card: title, optional saving pill, detail line and the price on the right. */
function PlanCard({
  selected,
  disabled,
  onPress,
  title,
  badge,
  detail,
  price,
  priceDetail,
}: {
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  title: string;
  badge?: string;
  detail: string;
  price: string;
  priceDetail: string;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${title}, ${price} ${priceDetail}${badge ? `, ${badge}` : ""}. ${detail}`}
      onPress={onPress}
      disabled={disabled}
      style={[styles.plan, selected && styles.planSelected, disabled && { opacity: 0.6 }]}
    >
      <View style={[styles.radio, selected && { borderColor: c.brandText, backgroundColor: c.brandText }]}>
        {selected && <Check size={14} color={c.surface} strokeWidth={3} />}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text variant="heading3">{title}</Text>
          {badge && <StatusPill label={badge} icon={null} />}
        </View>
        <Text variant="labelRegular" color={c.ink2}>
          {detail}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text variant="heading2" tabular>
          {price}
        </Text>
        <Text variant="labelRegular" color={c.ink2} tabular>
          {priceDetail}
        </Text>
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  // v2 card; the picked plan gets the 2 px accent border (ChoiceCard's selected state), padding
  // trimmed by 1 px so nothing moves.
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: c.surface,
    ...shadows.card,
  },
  planSelected: { borderWidth: 2, borderColor: c.brandText, paddingHorizontal: 15, paddingVertical: 15 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
}));
