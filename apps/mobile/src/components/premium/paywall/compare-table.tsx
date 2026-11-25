import { Check } from "lucide-react-native";
import { View } from "react-native";
import { Section, Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";
import { TIERS, type TierValue } from "./data";
import { useListStyles } from "./list-styles";

/** Design 14c "Free and Premium": the feature-by-feature comparison table. */
export function CompareTable() {
  const c = useColors();
  const styles = useStyles();
  const list = useListStyles();
  return (
    <Section title="Free and Premium">
      <View style={list.list}>
        <View style={[styles.tierRow, { backgroundColor: c.sunken }]}>
          <Text size={12} weight={700} color={c.ink3} style={{ flex: 1 }}>
            FEATURE
          </Text>
          <Text size={12} weight={700} color={c.ink3} style={styles.col} center>
            FREE
          </Text>
          <Text size={12} weight={700} color={c.brandText} style={styles.col} center>
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
            <Text size={14} style={{ flex: 1 }}>
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
    </Section>
  );
}

const cellLabel = (v: TierValue) => (v === true ? "included" : v === false ? "not included" : v);

/** A tick, a muted dash, or the amount; brand coloured in the Premium column. */
function Cell({ value, premium }: { value: TierValue; premium?: boolean }) {
  const c = useColors();
  if (value === true) return <Check size={18} color={premium ? c.brandText : c.protein} strokeWidth={2.6} />;
  if (value === false)
    return (
      <Text size={16} weight={700} color={c.ink3}>
        —
      </Text>
    );
  return (
    <Text size={12} weight={700} color={premium ? c.brandText : c.ink2} center>
      {value}
    </Text>
  );
}

const useStyles = makeStyles(() => ({
  tierRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  col: { width: 76, alignItems: "center" },
}));
