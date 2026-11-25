import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { visibleFoodTo } from "./food-visibility.js";

/** The food database: search for adding a missed item. */
@Injectable()
export class FoodsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Name or alias match, with per-100 g nutrition and household units. `q` is raw user input. */
  async search(userId: string, q: string) {
    const query = q.trim().toLowerCase().slice(0, 60);
    const foods = await this.prisma.food.findMany({
      where: {
        AND: [
          query
            ? {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { aliases: { has: query } },
                ],
              }
            : {},
          // Unreviewed label scans are visible to their submitter only.
          visibleFoodTo(userId),
        ],
      },
      select: {
        id: true,
        name: true,
        kcalPer100g: true,
        proteinPer100g: true,
        carbsPer100g: true,
        fatPer100g: true,
        isLiquid: true,
        units: { select: { unit: true, grams: true } },
      },
      orderBy: { name: "asc" },
      take: 12,
    });
    return {
      foods: foods.map((f) => ({
        id: f.id,
        name: f.name,
        per100g: {
          kcal: f.kcalPer100g,
          protein: f.proteinPer100g,
          carbs: f.carbsPer100g,
          fat: f.fatPer100g,
        },
        units: f.units,
        isLiquid: f.isLiquid,
      })),
    };
  }
}
