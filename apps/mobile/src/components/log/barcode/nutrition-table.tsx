import type { FoodDto } from "@fitr8/contracts";
import { StyleSheet, View } from "react-native";
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
        <Text weight={600} size={12} color={c.ink3} style={{ flex: 1.4 }}>
          Nutrition
        </Text>
        <Text weight={600} size={12} color={c.ink3} style={styles.num}>
          per 100 {measure}
        </Text>
        <Text weight={600} size={12} color={c.ink3} style={styles.num}>
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
                weight={sub ? 400 : 600}
                color={sub ? c.ink2 : c.ink}
                style={{ flex: 1.4, paddingLeft: sub ? 12 : 0 }}
              >
                {label}
              </Text>
              <Text color={c.ink2} tabular style={styles.num}>
                {fmt(per!, unit)} {unit}
              </Text>
              <Text weight={600} tabular style={styles.num}>
                {fmt(per! * k, unit)} {unit}
              </Text>
            </View>
          );
        })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  table: {
    borderRadius: radius.card,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tr: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  num: { flex: 1, textAlign: "right" },
}));
