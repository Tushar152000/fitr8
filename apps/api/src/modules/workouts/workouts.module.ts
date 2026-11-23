import { Module } from "@nestjs/common";
import { HealthDataModule } from "../health-data/health-data.module.js";
import { MealsModule } from "../meals/meals.module.js";
import { PlanModule } from "../plan/plan.module.js";
import { TrainingController } from "./training.controller.js";
import { TrainingPlanner } from "./training-planner.js";
import { TrainingService } from "./training.service.js";
import { WorkoutsController } from "./workouts.controller.js";
import { WorkoutsService } from "./workouts.service.js";

/**
 * Training: the strength engine (/workouts, gym sessions and set logs) and the training week of
 * the Workout tab (/training, Premium). Owns exercises, workout_plans, workout_logs,
 * training_profiles, training_weeks and training_logs.
 */
@Module({
  imports: [PlanModule, MealsModule, HealthDataModule],
  controllers: [WorkoutsController, TrainingController],
  providers: [WorkoutsService, TrainingPlanner, TrainingService],
  exports: [WorkoutsService, TrainingPlanner, TrainingService],
})
export class WorkoutsModule {}
