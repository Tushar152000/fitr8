import type { MealSuggestionDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { ChevronRight, Plus, Sparkles } from "lucide-react-native";
import { createElement } from "react";
import { Pressable, View } from "react-native";
import { AnimatedRow, IconTile, PillButton, PressableScale, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { foodIcon } from "@/lib/food-icon";
import { formatInt, formatPortion, mealTitle, type MealType } from "@/lib/format";
import { SLOT, slotTime } from "@/lib/meal-slots";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { Day } from "@/lib/types";

type Meal = Day["meals"][number];

/** GET /api/meals/suggestion: rule-based, from the user's saved and recent meals. Refreshed with the day. */
export const suggestionQuery = (mealType: MealType, date: string | null) => ({
  queryKey: ["meal-suggestion", date ?? "today", mealType],
  queryFn: () =>
    api<MealSuggestionDto>(`/api/meals/suggestion?mealType=${mealType}${date ? `&date=${date}` : ""}`).then(
      (r) => r.suggestion,
    ),
});

const STATUS_TEXT: Partial<Record<Meal["status"], string>> = {
  PENDING: "Reading your plate…",
  ANALYZING: "Reading your plate…",
  READY: "Tap to confirm",
  FAILED: "Couldn't read this one",
};

/**
 * One meal slot on the Meals tab (Figma "Breakfast" … "Dinner" cards): icon tile, name, time of the
 * first meal and its kcal, "+" to log more, then a row per food (tap → that meal's review). An empty
 * slot shows "Not logged yet · ~N kcal suggested", the coach's suggestion and Snap / Add food.
 * `pastDay` = a past day in the logging window; `canLog` false = an older, read-only day.
 */
export function MealSlotCard({
  type,
  meals,
  timezone,
  pastDay,
  canLog,
  suggestedKcal,
}: {
  type: MealType;
  meals: Meal[];
  timezone: string;
  pastDay: string | null;
  canLog: boolean;
  suggestedKcal: number | null;
}) {
  const c = useColors();
  const styles = useStyles();
  const slot = SLOT[type];
  const params = { meal: type, ...(pastDay ? { date: pastDay } : {}) };
  // Today the camera comes first; a past day is typed (the meal is long eaten).
  const addPath = pastDay ? "/log/type" : "/log";
  const kcal = meals.reduce((sum, m) => sum + (m.status === "CONFIRMED" ? m.totalKcal : 0), 0);
  const empty = meals.length === 0;
  const subtitle = empty
    ? `${pastDay ? "Nothing logged" : "Not logged yet"}${canLog && suggestedKcal ? ` · ~${formatInt(Math.round(suggestedKcal / 10) * 10)} kcal suggested` : ""}`
    : `${slotTime(meals[0].createdAt, timezone)} · ${formatInt(kcal)} kcal`;
  const rows = meals.flatMap((m): { key: string; meal: Meal; item: Meal["items"][number] | null }[] =>
    m.status === "CONFIRMED" && m.items.length
      ? m.items.map((item, i) => ({ key: `${m.id}-${i}`, meal: m, item }))
      : [{ key: m.id, meal: m, item: null }],
  );

  return (
    <AnimatedRow style={styles.card}>
      <View style={styles.header}>
        <IconTile icon={slot.icon} accent />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading3">{slot.title}</Text>
          <Text variant="labelRegular" color={c.ink2} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {!empty && canLog && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Add to ${slot.title.toLowerCase()}`}
            onPress={() => router.push({ pathname: addPath, params })}
            hitSlop={4}
            style={styles.add}
          >
            <Plus size={20} color={c.ink} strokeWidth={2} />
          </PressableScale>
        )}
      </View>

      {!empty && (
        <>
          <View style={styles.divider} />
          {rows.map((r, i) => (
            <FoodRow key={r.key} meal={r.meal} item={r.item} last={i === rows.length - 1} />
          ))}
        </>
      )}

      {empty && canLog && (
        <View style={styles.empty}>
          <Suggestion type={type} date={pastDay} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PillButton
              label={`Snap ${slot.title.toLowerCase()}`}
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: "/log", params })}
            />
            <PillButton
              variant="soft"
              label="Add food"
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: "/log/type", params })}
            />
          </View>
        </View>
      )}
    </AnimatedRow>
  );
}

/** Figma "Food Row": icon tile (keyword match on the name), name, amount, kcal. A meal still being read shows its status. */
function FoodRow({ meal, item, last }: { meal: Meal; item: Meal["items"][number] | null; last: boolean }) {
  const c = useColors();
  const styles = useStyles();
  const name =
    item?.name ??
    mealTitle(
      meal.items.map((i) => i.name),
      meal.source === "TEXT" ? (meal.inputText ?? "Typed meal") : "Photo",
    );
  // An API older than the v2 dashboard sends items with a name only: show no amount, don't crash.
  const note = item
    ? typeof item.quantity === "number" && item.unit && typeof item.grams === "number"
      ? formatPortion(item.quantity, item.unit, item.grams, item.isLiquid)
      : ""
    : (STATUS_TEXT[meal.status] ?? "");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens the meal"
      onPress={() => router.push(`/log/${meal.id}` as Href)}
      style={({ pressed }) => [styles.food, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.foodIcon}>{createElement(foodIcon(name), { size: 18, color: c.ink, strokeWidth: 2 })}</View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {name.charAt(0).toUpperCase() + name.slice(1)}
        </Text>
        <Text variant="labelRegular" color={!item && meal.status === "READY" ? c.brandText : c.ink2} numberOfLines={1}>
          {note}
        </Text>
      </View>
      {item ? (
        <View style={{ alignItems: "flex-end" }}>
          <Text variant="bodyStrong" tabular>
            {formatInt(item.kcal)}
          </Text>
          <Text variant="caption" color={c.ink2}>
            kcal
          </Text>
        </View>
      ) : (
        <ChevronRight size={18} color={c.ink3} />
      )}
      {!last && <View style={styles.rowDivider} />}
    </Pressable>
  );
}

/** "Coach suggests: …" (rule-based); tap asks the coach about it. Nothing when there's no suggestion. */
function Suggestion({ type, date }: { type: MealType; date: string | null }) {
  const c = useColors();
  const styles = useStyles();
  const s = useQuery(suggestionQuery(type, date)).data;
  if (!s) return null;
  const slot = SLOT[type].title.toLowerCase();
  const ask = `Is ${s.title} (${formatInt(s.kcal)} kcal, ${formatInt(s.proteinG)} g protein) a good ${slot === "snacks" ? "snack" : slot} for me ${date ? "that day" : "today"}?`;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityHint="Asks your coach about it"
      onPress={() => router.push({ pathname: "/coach", params: { ask } })}
      style={styles.suggestion}
    >
      <Sparkles size={18} color={c.brandText} strokeWidth={2} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="labelStrong" numberOfLines={1}>
          Coach suggests: {s.title}
        </Text>
        <Text variant="caption" color={c.ink2}>
          {formatInt(s.kcal)} kcal · {formatInt(s.proteinG)} g protein — fits what you have left
        </Text>
      </View>
      <ChevronRight size={16} color={c.ink2} strokeWidth={2} />
    </PressableScale>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    overflow: "hidden",
    ...shadows.card,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  add: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.ground,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: c.line },
  food: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  foodIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: c.ground,
    alignItems: "center",
    justifyContent: "center",
  },
  rowDivider: { position: "absolute", left: 48, right: 0, bottom: 0, height: 1, backgroundColor: c.line },
  empty: { gap: 12, paddingTop: 4, paddingBottom: 12 },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: c.ground,
  },
}));
