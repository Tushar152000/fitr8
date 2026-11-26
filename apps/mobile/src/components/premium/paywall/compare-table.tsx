import { Check, Minus } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";
import { TIERS, type TierValue } from "./data";
import { PaywallGroup } from "./group";
import { useListStyles } from "./list-styles";

/** Design 14c "Free and Premium": the feature-by-feature comparison table. */
export function CompareTable() {
  const c = useColors();
  const styles = useStyles();
  const list = useListStyles();
  return (
    <PaywallGroup label="Free and Premium">
      <View style={list.list}>
        <View style={styles.tierRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <View style={{ flex: 1 }} />
          <Text variant="captionStrong" color={c.ink2} style={styles.col} center>
            FREE
          </Text>
          <Text variant="captionStrong" color={c.brandText} style={styles.col} center>
            PREMIUM
          </Text>
        </View>
        {TIERS.map((r) => (
          <View
            key={r.label}
            style={[styles.tierRow, list.divider]}
            accessible
            accessibilityLabel={`${r.label}: Free ${cellLabel(r.free)}, Premium ${cellLabel(r.premium)}`}
          >
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              {r.label}
            </Text>
            <View style={styles.col}>
              <Cell value={r.free} />
            </View>
            <View style={styles.col}>
              <Cell value={r.premium} premium />
            </View>
          </View>
        ))}
      </View>
    </PaywallGroup>
  );
}

const cellLabel = (v: TierValue) => (v === true ? "included" : v === false ? "not included" : v);

/** A tick, a muted dash, or the amount; accent coloured in the Premium column. */
function Cell({ value, premium }: { value: TierValue; premium?: boolean }) {
  const c = useColors();
  if (value === true) return <Check size={18} color={premium ? c.brandText : c.ink} strokeWidth={2.4} />;
  if (value === false) return <Minus size={16} color={c.ink3} strokeWidth={2} />;
  return (
    <Text variant="labelStrong" color={premium ? c.brandText : c.ink2} center tabular>
      {value}
    </Text>
  );
}

const useStyles = makeStyles(() => ({
  tierRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  col: { width: 72, alignItems: "center" },
}));
