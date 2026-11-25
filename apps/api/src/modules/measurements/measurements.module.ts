import { Module } from "@nestjs/common";
import { ProgressModule } from "../progress/progress.module.js";
import { MeasurementsController } from "./measurements.controller.js";
import { MeasurementsService } from "./measurements.service.js";

/** Profile / Measurements (body_metrics via progress's CheckinsService; see MeasurementsService). */
@Module({
  imports: [ProgressModule],
  controllers: [MeasurementsController],
  providers: [MeasurementsService],
})
export class MeasurementsModule {}
