import { Module } from "@nestjs/common";
import { PlanModule } from "../plan/plan.module.js";
import { HealthDataController } from "./health-data.controller.js";
import { HealthDataService } from "./health-data.service.js";

/** Apple Health / Health Connect records (docs/HEALTH.md). Not the `health` module (liveness). */
@Module({
  imports: [PlanModule],
  controllers: [HealthDataController],
  providers: [HealthDataService],
  exports: [HealthDataService],
})
export class HealthDataModule {}
