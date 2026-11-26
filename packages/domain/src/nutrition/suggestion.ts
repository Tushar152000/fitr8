import type { MealType } from "../format.js";

/**
 * Rule-based meal suggestion (no AI): from the user's own saved meals and recently logged meals or
 * foods, the one that best fits what's left of the day's calories and protein for the meal slot.
 */

/** Something the user has eaten or saved before, with its totals. */
export interface MealCandidate {
  title: string;
  kcal: number;
  proteinG: number;
  /** Where it comes from: a saved meal, a whole recent meal, or one food from a recent meal. */
  kind: "saved" | "meal" | "food";
  /** The slot it was saved for / logged in, if known. */
  mealType?: MealType | null;
}

export interface SuggestionNeed {
  /** The day's target minus confirmed meals so far. */
  kcalLeft: number;
  proteinLeftG: number;
  /** The slot being suggested for. */
  mealType: MealType;
  /** Slots that already have a confirmed meal that day. */
  loggedTypes: Iterable<MealType>;
}

const MAIN_MEALS: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"];

/** Weights for the score; lower score wins. */
export const SUGGESTION_RULES = {
  /** Bonus for a candidate saved for / logged in the same slot. */
  sameSlotBonus: 0.1,
  /** Bonus for a saved meal (the user chose to keep it). */
  savedBonus: 0.05,
} as const;

/**
 * This slot's share of what's left: the remaining kcal and protein split evenly over the main meals
 * (breakfast, lunch, dinner) not logged yet, counting the asked slot; a snack counts as one more slot.
 */
export function slotShare(need: SuggestionNeed): { kcal: number; proteinG: number } {
  const done = new Set(need.loggedTypes);
  const open = MAIN_MEALS.filter((t) => !done.has(t) || t === need.mealType).length;
  const slots = need.mealType === "SNACK" ? open + 1 : Math.max(open, 1);
  return {
    kcal: Math.max(0, need.kcalLeft) / slots,
    proteinG: Math.max(0, need.proteinLeftG) / slots,
  };
}

/**
 * The candidate closest to the slot's share of kcal that leaves protein least short, never more
 * than the kcal left. Null when nothing is left for the day or nothing fits.
 */
export function pickMealSuggestion(
  candidates: MealCandidate[],
  need: SuggestionNeed,
): MealCandidate | null {
  if (need.kcalLeft <= 0) return null;
  const share = slotShare(need);
  const score = (c: MealCandidate) =>
    Math.abs(c.kcal - share.kcal) / share.kcal +
    (share.proteinG > 0 ? Math.max(0, share.proteinG - c.proteinG) / share.proteinG : 0) -
    (c.mealType === need.mealType ? SUGGESTION_RULES.sameSlotBonus : 0) -
    (c.kind === "saved" ? SUGGESTION_RULES.savedBonus : 0);
  const fit = candidates.filter((c) => c.kcal > 0 && c.kcal <= need.kcalLeft);
  return fit.sort((a, b) => score(a) - score(b))[0] ?? null;
}
