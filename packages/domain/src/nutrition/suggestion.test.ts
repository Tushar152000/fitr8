import { describe, expect, it } from "vitest";
import { pickMealSuggestion, slotShare, type MealCandidate } from "./suggestion.js";

const c = (title: string, kcal: number, proteinG: number, extra: Partial<MealCandidate> = {}) =>
  ({ title, kcal, proteinG, kind: "meal", ...extra }) as MealCandidate;

describe("slotShare", () => {
  it("gives the last open main meal everything that's left", () => {
    expect(
      slotShare({
        kcalLeft: 600,
        proteinLeftG: 40,
        mealType: "DINNER",
        loggedTypes: ["BREAKFAST", "LUNCH"],
      }),
    ).toEqual({ kcal: 600, proteinG: 40 });
  });

  it("splits evenly over the open main meals, counting the asked one", () => {
    expect(
      slotShare({ kcalLeft: 1800, proteinLeftG: 90, mealType: "BREAKFAST", loggedTypes: [] }),
    ).toEqual({ kcal: 600, proteinG: 30 });
    // Lunch already logged but asked again (a second lunch) still counts as a slot.
    expect(
      slotShare({ kcalLeft: 1000, proteinLeftG: 0, mealType: "LUNCH", loggedTypes: ["LUNCH"] }),
    ).toEqual({ kcal: 1000 / 3, proteinG: 0 });
  });

  it("counts a snack as one more slot and never goes negative", () => {
    expect(
      slotShare({
        kcalLeft: 900,
        proteinLeftG: -10,
        mealType: "SNACK",
        loggedTypes: ["BREAKFAST", "LUNCH"],
      }),
    ).toEqual({ kcal: 450, proteinG: 0 });
    expect(
      slotShare({
        kcalLeft: 300,
        proteinLeftG: 20,
        mealType: "SNACK",
        loggedTypes: ["BREAKFAST", "LUNCH", "DINNER"],
      }),
    ).toEqual({ kcal: 300, proteinG: 20 });
  });
});

describe("pickMealSuggestion", () => {
  const dinner = { mealType: "DINNER" as const, loggedTypes: ["BREAKFAST", "LUNCH"] as const };

  it("picks the candidate closest to the slot's kcal with enough protein", () => {
    const pick = pickMealSuggestion(
      [c("Rajma rice", 560, 14), c("Chicken breast 200 g", 520, 38), c("Roti", 120, 3)],
      { ...dinner, kcalLeft: 600, proteinLeftG: 40 },
    );
    expect(pick?.title).toBe("Chicken breast 200 g");
  });

  it("never suggests more than what's left", () => {
    expect(
      pickMealSuggestion([c("Biryani", 900, 30), c("Dal", 250, 12)], {
        ...dinner,
        kcalLeft: 600,
        proteinLeftG: 20,
      })?.title,
    ).toBe("Dal");
    expect(
      pickMealSuggestion([c("Biryani", 900, 30)], { ...dinner, kcalLeft: 600, proteinLeftG: 20 }),
    ).toBeNull();
  });

  it("returns null when nothing is left or there are no candidates", () => {
    expect(
      pickMealSuggestion([c("Dal", 250, 12)], { ...dinner, kcalLeft: 0, proteinLeftG: 20 }),
    ).toBeNull();
    expect(pickMealSuggestion([], { ...dinner, kcalLeft: 500, proteinLeftG: 20 })).toBeNull();
  });

  it("skips empty candidates", () => {
    expect(
      pickMealSuggestion([c("Water", 0, 0)], { ...dinner, kcalLeft: 500, proteinLeftG: 0 }),
    ).toBeNull();
  });

  it("ignores protein when the protein target is already met", () => {
    const pick = pickMealSuggestion([c("Paneer", 400, 25), c("Poha", 480, 6)], {
      ...dinner,
      kcalLeft: 500,
      proteinLeftG: 0,
    });
    expect(pick?.title).toBe("Poha");
  });

  it("prefers the same slot, then saved meals, on near ties", () => {
    const need = { ...dinner, kcalLeft: 500, proteinLeftG: 0 };
    expect(
      pickMealSuggestion([c("A", 500, 0), c("B", 500, 0, { mealType: "DINNER" })], need)?.title,
    ).toBe("B");
    expect(
      pickMealSuggestion([c("A", 500, 0), c("S", 500, 0, { kind: "saved" })], need)?.title,
    ).toBe("S");
  });
});
