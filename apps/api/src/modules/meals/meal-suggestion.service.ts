import { Injectable } from "@nestjs/common";
import type { MealSuggestionDto, MealTypeValue } from "@fitr8/contracts";
import { formatInt, formatQty, mealTitle, sentenceCase } from "@fitr8/domain/format";
import { pickMealSuggestion, type MealCandidate } from "@fitr8/domain/nutrition";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { TargetsService } from "../plan/targets.service.js";
import { UsersService } from "../users/users.service.js";
import { usualSignature } from "./usuals.service.js";

const DAY = 86_400_000;
/** How far back "recent" meals and foods go, and how many meals are read. */
const RECENT_DAYS = 60;
const RECENT_MEALS = 200;

/** "Chicken breast, 200 g" / "Roti, 2 pieces". */
function foodTitle(i: { name: string; quantity: number; unit: string }) {
  const unit = i.unit === "g" || i.unit === "ml" ? i.unit : ` ${i.unit}`;
  return `${sentenceCase(i.name)}, ${formatQty(i.quantity)}${unit}`;
}

/**
 * The Meals screen's "Coach suggests" card for an unlogged slot. Rule-based (no AI): the rule is
 * `pickMealSuggestion` in @fitr8/domain; this reads the day's target and confirmed meals, and the
 * user's saved meals and recently logged meals and foods as candidates.
 */
@Injectable()
export class MealSuggestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly targets: TargetsService,
    private readonly users: UsersService,
  ) {}

  async suggest(userId: string, mealType: MealTypeValue, ymd?: string): Promise<MealSuggestionDto> {
    const date = await this.users.mealDate(userId, ymd);
    const [target, dayMeals, saved, recent] = await Promise.all([
      this.targets.targetForDay(userId, date),
      this.prisma.mealLog.findMany({
        where: { userId, date, status: "CONFIRMED" },
        select: { mealType: true, totalKcal: true, totalProtein: true },
      }),
      this.prisma.savedMeal.findMany({
        where: { userId },
        select: { name: true, mealType: true, totalKcal: true, totalProtein: true },
      }),
      this.prisma.mealLog.findMany({
        where: {
          userId,
          status: "CONFIRMED",
          createdAt: { gte: new Date(Date.now() - RECENT_DAYS * DAY) },
        },
        select: {
          mealType: true,
          inputText: true,
          totalKcal: true,
          totalProtein: true,
          items: { select: { name: true, quantity: true, unit: true, kcal: true, proteinG: true } },
        },
        orderBy: { createdAt: "desc" },
        take: RECENT_MEALS,
      }),
    ]);
    if (!target) return { suggestion: null };

    const kcalLeft = target.kcal - dayMeals.reduce((s, m) => s + m.totalKcal, 0);
    const proteinLeftG = target.proteinG - dayMeals.reduce((s, m) => s + m.totalProtein, 0);

    const candidates: MealCandidate[] = saved.map((m) => ({
      title: m.name,
      kcal: m.totalKcal,
      proteinG: m.totalProtein,
      kind: "saved",
      mealType: m.mealType,
    }));
    // Newest first, so each distinct meal / food keeps its latest slot.
    const seenMeals = new Set<string>();
    const seenFoods = new Set<string>();
    for (const m of recent) {
      if (!m.items.length) continue;
      const signature = usualSignature(m.items);
      if (!seenMeals.has(signature)) {
        seenMeals.add(signature);
        const single = m.items.length === 1;
        candidates.push({
          // A one-food meal reads as that food with its amount.
          title: single
            ? foodTitle(m.items[0])
            : mealTitle(
                m.items.map((i) => i.name),
                m.inputText ?? "Meal",
              ),
          kcal: m.totalKcal,
          proteinG: m.totalProtein,
          kind: single ? "food" : "meal",
          mealType: m.mealType,
        });
      }
      if (m.items.length < 2) continue;
      for (const i of m.items) {
        const key = usualSignature([i]);
        if (seenFoods.has(key)) continue;
        seenFoods.add(key);
        candidates.push({
          title: foodTitle(i),
          kcal: i.kcal,
          proteinG: i.proteinG,
          kind: "food",
          mealType: m.mealType,
        });
      }
    }

    const pick = pickMealSuggestion(candidates, {
      kcalLeft,
      proteinLeftG,
      mealType,
      loggedTypes: dayMeals.map((m) => m.mealType),
    });
    if (!pick) return { suggestion: null };

    const left =
      proteinLeftG >= 1
        ? `${formatInt(kcalLeft)} kcal and ${formatInt(proteinLeftG)} g protein`
        : `${formatInt(kcalLeft)} kcal`;
    return {
      suggestion: {
        title: pick.title,
        kcal: Math.round(pick.kcal),
        proteinG: Math.round(pick.proteinG),
        kind: pick.kind,
        reason: `Fits the ${left} you have left.`,
      },
    };
  }
}
