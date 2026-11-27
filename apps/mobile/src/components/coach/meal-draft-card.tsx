import type { CoachMealDraftCard } from "@fitr8/contracts";
import { router, type Href } from "expo-router";
import { ChevronRight, Utensils } from "lucide-react-native";
import { View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { PillButton, Text } from "@/components/ui";
import { formatInt, MEAL_LABEL, type MealType } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * The meal the coach drafted (`draft_meal`), as a card in the chat (2026-11-28: the coach said
 * "review it in the app" with nothing to tap). Items and kcal when read, "Reading your meal…" while
 * it's still being analysed; "Review & log" opens the meal's review screen. Not logged until then.
 */
export function MealDraftCard({ card }: { card: CoachMealDraftCard }) {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const reading = card.status === "PENDING" || card.status === "ANALYZING";
  const slot = MEAL_LABEL[card.mealType as MealType] ?? "Meal";
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.duration(280)} style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Utensils size={16} color={c.brandText} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="labelStrong">{slot} · ready to review</Text>
          <Text variant="caption" color={c.ink2}>
            {reading ? "Reading your meal…" : "Not logged until you confirm"}
          </Text>
        </View>
        {card.kcal != null && (
          <Text variant="bodyStrong" tabular>
            {formatInt(card.kcal)}
            <Text variant="caption" color={c.ink2}>
              {" "}
              kcal
            </Text>
          </Text>
        )}
      </View>
      {card.items.length > 0 && (
        <View style={styles.items}>
          {card.items.map((it, i) => (
            <View key={`${it.name}-${i}`} style={styles.item}>
              <Text variant="labelMedium" numberOfLines={1} style={{ flex: 1 }}>
                {it.name.charAt(0).toUpperCase() + it.name.slice(1)}
              </Text>
              {it.kcal != null && (
                <Text variant="labelMedium" color={c.ink2} tabular>
                  {formatInt(it.kcal)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
      <PillButton
        label="Review & log"
        trailingIcon={ChevronRight}
        onPress={() => router.push(`/log/${card.mealId}` as Href)}
        style={{ alignSelf: "stretch" }}
      />
    </Animated.View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.tile,
    backgroundColor: c.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  items: { gap: 6, padding: 12, borderRadius: radius.box, backgroundColor: c.ground },
  item: { flexDirection: "row", alignItems: "center", gap: 8 },
}));
