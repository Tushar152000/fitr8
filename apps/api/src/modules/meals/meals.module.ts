import { Module } from "@nestjs/common";
import { PlanModule } from "../plan/plan.module.js";
import { MealAnalysisJob } from "./meal-analysis.job.js";
import { MealItemsService } from "./meal-items.service.js";
import { MealSuggestionService } from "./meal-suggestion.service.js";
import { MealsController } from "./meals.controller.js";
import { MealsService } from "./meals.service.js";
import { SavedMealsController } from "./saved-meals.controller.js";
import { SavedMealsService } from "./saved-meals.service.js";
import { ScanQuotaService } from "./scan-quota.service.js";
import { UsualsService } from "./usuals.service.js";

@Module({
  imports: [PlanModule],
  controllers: [MealsController, SavedMealsController],
  providers: [
    MealsService,
    MealItemsService,
    ScanQuotaService,
    UsualsService,
    SavedMealsService,
    MealAnalysisJob,
    MealSuggestionService,
  ],
  exports: [MealsService, MealItemsService, ScanQuotaService, UsualsService],
})
export class MealsModule {}
