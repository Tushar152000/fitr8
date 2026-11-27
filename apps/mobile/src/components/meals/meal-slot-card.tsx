import type { MealSuggestionDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { Image } from "expo-image";
import { ChevronRight, Plus, Repeat, Sparkles, Trash2 } from "lucide-react-native";
import { createElement, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { AnimatedRow, PressableScale, Text } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { confirmAction } from "@/lib/confirm";
import { refreshDay } from "@/lib/query";
import { showToast } from "@/lib/toast";
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
 * slot shows "Not logged yet · ~N kcal suggested"; only the `current` slot (the meal for the time
 * of day, today) adds the coach's suggestion. Every slot has the same compact header with "+"; the
 * Snap / Add food buttons were removed (2026-11-28: the Quick log "Snap your dinner" hero does it,
 * and two gradient buttons were too much green). The slot icon is a solid ink tile.
 * `pastDay` = a past day in the logging window; `canLog` false = an older, read-only day.
 * 2026-11-28: a photo-logged meal shows its photo as the first row's thumbnail (typed meals, the
 * free plan's way in, keep the food icon); a confirmed meal swipes left for Delete and right for
 * Log again (POST /api/meals/relog, into today; no AI scan, so every plan). Read-only days: no swipe.
 */
export function MealSlotCard({
  type,
  current,
  meals,
  timezone,
  pastDay,
  canLog,
  suggestedKcal,
}: {
  type: MealType;
  current: boolean;
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
  // One group per meal (its food rows), so a swipe acts on the whole meal.
  const groups = meals.map((m) => ({
    meal: m,
    rows:
      m.status === "CONFIRMED" && m.items.length
        ? m.items.map((item, i) => ({ key: `${m.id}-${i}`, item }))
        : [{ key: m.id, item: null as Meal["items"][number] | null }],
  }));

  return (
    <AnimatedRow style={styles.card}>
      <View style={styles.header}>
        {/* Solid ink tile (2026-11-28: less green on Meals); flips to light in dark mode. */}
        <View style={styles.slotIcon}>{createElement(slot.icon, { size: 18, color: c.onStrong, strokeWidth: 2 })}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading3">{slot.title}</Text>
          <Text variant="labelRegular" color={c.ink2} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {canLog && (
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
          {groups.map((g, gi) => {
            const rows = g.rows.map((r, i) => (
              <FoodRow
                key={r.key}
                meal={g.meal}
                item={r.item}
                photo={i === 0 ? g.meal.photoUrl : null}
                last={gi === groups.length - 1 && i === g.rows.length - 1}
              />
            ));
            return canLog && g.meal.status === "CONFIRMED" ? (
              <SwipeMeal key={g.meal.id} meal={g.meal} pastDay={pastDay}>
                {rows}
              </SwipeMeal>
            ) : (
              <View key={g.meal.id}>{rows}</View>
            );
          })}
        </>
      )}

      {/* The current meal, still empty: the coach's idea for it (the camera is the Snap button above). */}
      {empty && current && canLog && (
        <View style={styles.empty}>
          <Suggestion type={type} date={pastDay} />
        </View>
      )}
    </AnimatedRow>
  );
}

/** Figma "Food Row": icon tile (keyword match on the name), name, amount, kcal. A meal still being read shows its status. */
function FoodRow({
  meal,
  item,
  photo,
  last,
}: {
  meal: Meal;
  item: Meal["items"][number] | null;
  /** The meal's photo (photo logs only), shown in place of the food icon. */
  photo: string | null;
  last: boolean;
}) {
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
      {photo ? (
        <Image
          source={{ uri: photo, cacheKey: photo.split("?")[0] }}
          style={styles.photo}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.foodIcon}>{createElement(foodIcon(name), { size: 18, color: c.ink, strokeWidth: 2 })}</View>
      )}
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

/**
 * A confirmed meal's rows with swipe actions: swipe left → Delete (asks first), swipe right → Log
 * again into today (same meal slot). Each action is a button revealed by the swipe.
 */
function SwipeMeal({ meal, pastDay, children }: { meal: Meal; pastDay: string | null; children: ReactNode }) {
  const c = useColors();
  const styles = useStyles();
  const slot = SLOT[meal.mealType as MealType].title.toLowerCase();

  async function remove(sw: SwipeableMethods) {
    sw.close();
    const ok = await confirmAction(
      "Delete this meal?",
      `It comes off ${pastDay ? "that day's" : "today's"} totals.`,
      "Delete",
    );
    if (!ok) return;
    try {
      await api(`/api/meals/${meal.id}`, { method: "DELETE" });
      refreshDay();
    } catch (e) {
      showToast(errorMessage(e, "Couldn't delete. Try again."), 3000, true);
    }
  }

  async function again(sw: SwipeableMethods) {
    sw.close();
    try {
      await api("/api/meals/relog", { json: { mealId: meal.id, mealType: meal.mealType } });
      refreshDay();
      showToast(`Logged again to today's ${slot}`);
    } catch (e) {
      showToast(errorMessage(e, "Couldn't log it again. Try again."), 3000, true);
    }
  }

  return (
    <ReanimatedSwipeable
      friction={1.6}
      overshootLeft={false}
      overshootRight={false}
      leftThreshold={40}
      rightThreshold={40}
      renderLeftActions={(_p, _t, sw) => (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Log ${slot} again today`}
          onPress={() => void again(sw)}
          style={[styles.action, { backgroundColor: c.brandSoft }]}
        >
          <Repeat size={18} color={c.brandText} strokeWidth={2.2} />
          <Text variant="captionStrong" color={c.brandText}>
            Log again
          </Text>
        </PressableScale>
      )}
      renderRightActions={(_p, _t, sw) => (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Delete this meal"
          onPress={() => void remove(sw)}
          style={[styles.action, { backgroundColor: c.danger }]}
        >
          <Trash2 size={18} color={c.onDanger} strokeWidth={2.2} />
          <Text variant="captionStrong" color={c.onDanger}>
            Delete
          </Text>
        </PressableScale>
      )}
    >
      <View style={styles.swipeFront}>{children}</View>
    </ReanimatedSwipeable>
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
  slotIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.tile,
    backgroundColor: c.strong,
    alignItems: "center",
    justifyContent: "center",
  },
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
  photo: { width: 36, height: 36, borderRadius: radius.tile, backgroundColor: c.ground },
  // Swipe actions sit behind the rows; the rows need the card colour to cover them.
  swipeFront: { backgroundColor: c.surface },
  action: { width: 92, alignItems: "center", justifyContent: "center", gap: 4 },
  empty: { gap: 12, paddingTop: 4, paddingBottom: 12 },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radius.box,
    backgroundColor: c.ground,
  },
}));
