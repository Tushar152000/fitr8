import type { FoodDto } from "@fitr8/contracts";
import { View } from "react-native";
import { Card, Segmented, Stepper, Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { useColors } from "@/lib/theme";

/** Most grams/ml one item can log (QuickAddSchema). */
export const MAX_GRAMS = 5000;

export type AmountMode = "SERVINGS" | "GRAMS";

/** The API takes at most 100 servings and 5000 g per item: the steppers stop there. */
export function maxServingsOf(food: FoodDto): number {
  return food.servingSizeG ? Math.min(100, Math.floor((MAX_GRAMS / food.servingSizeG) * 2) / 2) : 100;
}

/** Design 7d: how much was eaten, in servings (0.5 steps) or grams (5 g steps). */
export function ProductAmount({
  food,
  mode,
  onModeChange,
  servings,
  onServingsChange,
  grams,
  onGramsChange,
  amountG,
}: {
  food: FoodDto;
  mode: AmountMode;
  onModeChange: (mode: AmountMode) => void;
  servings: number;
  onServingsChange: (servings: number) => void;
  grams: number;
  onGramsChange: (grams: number) => void;
  /** The amount in g (ml for drinks) whichever unit is shown. */
  amountG: number;
}) {
  const c = useColors();
  const measure = food.isLiquid ? "ml" : "g";
  const maxServings = maxServingsOf(food);
  return (
    <Card>
      {food.servingSizeG ? (
        <Segmented
          label="Amount in"
          value={mode}
          onChange={(next) => {
            // Keep the amount when switching: 1.5 servings of 30 g ↔ 45 g.
            if (next === "GRAMS" && mode === "SERVINGS") onGramsChange(Math.min(MAX_GRAMS, Math.max(5, amountG)));
            if (next === "SERVINGS" && mode === "GRAMS" && food.servingSizeG)
              onServingsChange(Math.min(maxServings, Math.max(0.5, Math.round((grams / food.servingSizeG) * 2) / 2)));
            onModeChange(next);
          }}
          options={[
            { value: "SERVINGS", label: "Servings" },
            { value: "GRAMS", label: food.isLiquid ? "Millilitres" : "Grams" },
          ]}
        />
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {mode === "SERVINGS" ? (
          <Stepper
            label="Servings"
            value={servings}
            step={0.5}
            min={0.5}
            max={maxServings}
            onChange={onServingsChange}
          />
        ) : (
          <Stepper
            label={food.isLiquid ? "Millilitres" : "Grams"}
            value={grams}
            step={5}
            min={5}
            max={MAX_GRAMS}
            onChange={onGramsChange}
          />
        )}
        <Text weight={600} size={13} color={c.ink3} tabular>
          {mode === "SERVINGS" ? `${formatInt(amountG)} ${measure}` : measure}
        </Text>
      </View>
    </Card>
  );
}
