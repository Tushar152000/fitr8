import type { FoodDto } from "@fitr8/contracts";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { BackHeader } from "@/components/back-header";
import { Button, FieldError, Screen, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { MEAL_LABEL } from "@/lib/format";
import { useMealChoice } from "@/lib/meal-param";
import { refreshDay } from "@/lib/query";
import { useColors } from "@/lib/theme";
import { showDay } from "@/lib/view-day";
import { MealWhen } from "../meal-when";
import { TotalCard } from "../total-card";
import { NutritionTable } from "./nutrition-table";
import { ProductAmount, type AmountMode } from "./product-amount";
import { ProductSummary } from "./product-summary";
import { haptic } from "@/lib/haptics";

/** Design 7d: a known product. Amount in servings (0.5 steps) or grams (5 g steps). */
export function ProductScreen({ food, code }: { food: FoodDto; code: string }) {
  const c = useColors();
  const { mealType, setMealType, date, dateBody } = useMealChoice();
  const hasServing = Boolean(food.servingSizeG);
  const [mode, setMode] = useState<AmountMode>(hasServing ? "SERVINGS" : "GRAMS");
  const [servings, setServings] = useState(1);
  const [grams, setGrams] = useState(hasServing ? food.servingSizeG! : 100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountG = mode === "SERVINGS" && food.servingSizeG ? servings * food.servingSizeG : grams;
  const fromOff = food.source === "OPEN_FOOD_FACTS";

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/meals/quick-add", {
        json:
          mode === "SERVINGS" && food.servingSizeG
            ? { foodId: food.id, mealType, quantity: servings, unit: "serving", grams: amountG, ...dateBody }
            : { foodId: food.id, mealType, quantity: grams, unit: "g", grams, ...dateBody },
      });
      track("meal_logged", { method: "barcode" });
      haptic.success();
      refreshDay();
      showDay(date);
      router.dismissTo("/today");
    } catch (e) {
      setError(errorMessage(e, "Couldn't add it. Try again."));
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <TotalCard kcal={food.kcalPer100g * (amountG / 100)}>
            <Text weight={600} size={13} color={c.protein}>
              No AI scan used
            </Text>
          </TotalCard>
          {error && <FieldError>{error}</FieldError>}
          <Button onPress={add} loading={busy}>
            {`Add to ${MEAL_LABEL[mealType].toLowerCase()}`}
          </Button>
        </>
      }
    >
      <BackHeader />
      <ProductSummary food={food} />

      <View style={{ gap: 12 }}>
        <ProductAmount
          food={food}
          mode={mode}
          onModeChange={setMode}
          servings={servings}
          onServingsChange={setServings}
          grams={grams}
          onGramsChange={setGrams}
          amountG={amountG}
        />

        <MealWhen mealType={mealType} onMealType={setMealType} date={date} />

        <NutritionTable food={food} amountG={amountG} />

        {fromOff && (
          <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap" }}>
            <Text size={12} color={c.ink3}>
              Data: Open Food Facts (ODbL).{" "}
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(`https://world.openfoodfacts.org/product/${code}`)}
            >
              <Text size={12} weight={600} color={c.brandText}>
                Report it
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}
