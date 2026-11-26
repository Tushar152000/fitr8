import type { FoodDto } from "@fitr8/contracts";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { formatInt, formatQty } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";

const fmt = (n: number, unit: string) => (unit === "kcal" ? formatInt(n) : formatQty(Math.round(n * 10) / 10));

/** Design 7d: the label's values per 100 g (or ml) beside the user's amount; missing values are left out. */
export function NutritionTable({ food, amountG }: { food: FoodDto; amountG: number }) {
  const c = useColors();
  const styles = useStyles();
  const measure = food.isLiquid ? "ml" : "g";
  const k = amountG / 100;
  const rows: [string, number | null, string][] = [
    ["Energy", food.kcalPer100g, "kcal"],
    ["Protein", food.proteinPer100g, "g"],
    ["Carbs", food.carbsPer100g, "g"],
    ["of which sugar", food.sugarPer100g, "g"],
    ["Fat", food.fatPer100g, "g"],
    ["Sodium", food.sodiumMgPer100g, "mg"],
  ];
  return (
    <View style={styles.table} accessibilityLabel={`Nutrition per 100 ${measure} and for your amount`}>
      <View style={styles.tr}>
        <Text variant="labelStrong" color={c.ink2} style={{ flex: 1.4 }}>
          Nutrition
        </Text>
        <Text variant="labelStrong" color={c.ink2} style={styles.num}>
          per 100 {measure}
        </Text>
        <Text variant="labelStrong" color={c.ink2} style={styles.num}>
          You
        </Text>
      </View>
      {rows
        .filter(([, per]) => per != null)
        .map(([label, per, unit]) => {
          const sub = label.startsWith("of which");
          return (
            <View key={label} style={[styles.tr, styles.rowLine]}>
              <Text
                variant={sub ? "bodySm" : "bodyStrong"}
                color={sub ? c.ink2 : c.ink}
                style={{ flex: 1.4, paddingLeft: sub ? 12 : 0 }}
              >
                {label}
              </Text>
              <Text variant="bodySm" color={c.ink2} tabular style={styles.num}>
                {fmt(per!, unit)} {unit}
              </Text>
              <Text variant="bodyStrong" tabular style={styles.num}>
                {fmt(per! * k, unit)} {unit}
              </Text>
            </View>
          );
        })}
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  table: {
    borderRadius: radius.card,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    ...shadows.card,
  },
  tr: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  rowLine: { borderTopWidth: 1, borderTopColor: c.line },
  num: { flex: 1, textAlign: "right" },
}));
