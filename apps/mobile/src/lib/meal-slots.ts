import { Cookie, Moon, Sun, Utensils, type LucideIcon } from "lucide-react-native";
import type { MealType } from "./format";

/** Meals tab slot cards (Figma "Meals"): title and icon per slot. */
export const SLOT: Record<MealType, { title: string; icon: LucideIcon }> = {
  BREAKFAST: { title: "Breakfast", icon: Sun },
  LUNCH: { title: "Lunch", icon: Utensils },
  SNACK: { title: "Snacks", icon: Cookie },
  DINNER: { title: "Dinner", icon: Moon },
};

const MAIN_MEALS: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"];

/**
 * Copy of `@fitr8/domain/nutrition` `slotShare` (the meal suggestion's rule; keep the two in step):
 * this slot's share of the kcal left, split evenly over the main meals not logged yet (counting the
 * asked slot); a snack counts as one more slot. Drives "~650 kcal suggested" on an empty slot.
 */
export function slotShareKcal(kcalLeft: number, mealType: MealType, loggedTypes: Iterable<MealType>): number {
  const done = new Set(loggedTypes);
  const open = MAIN_MEALS.filter((t) => !done.has(t) || t === mealType).length;
  const slots = mealType === "SNACK" ? open + 1 : Math.max(open, 1);
  return Math.max(0, kcalLeft) / slots;
}

/** "8:30 am" in the given timezone (Figma meal header). */
export function slotTime(date: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })
    .format(new Date(date))
    .replace(/\s?([AP])M$/i, (_, p: string) => ` ${p.toLowerCase()}m`);
}
