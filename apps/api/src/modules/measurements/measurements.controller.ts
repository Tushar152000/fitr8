import { Controller, Get, Post } from "@nestjs/common";
import {
  MeasurementAddSchema,
  type MeasurementAddInput,
  type MeasurementsDto,
} from "@fitr8/contracts";
import { UserId } from "../../common/auth/decorators.js";
import { ZodBody } from "../../common/http/zod.js";
import { MeasurementsService } from "./measurements.service.js";

/** Profile / Measurements. */
@Controller("measurements")
export class MeasurementsController {
  constructor(private readonly measurements: MeasurementsService) {}

  /** Weight, body fat %, waist, chest, hips, arms and neck: newest value + the day it was measured. */
  @Get()
  latest(@UserId() userId: string): Promise<MeasurementsDto> {
    return this.measurements.latest(userId);
  }

  /** "Add measurement": any of weight, waist, neck, chest, hips, arms → today's row. 201 + latest. */
  @Post()
  add(
    @UserId() userId: string,
    @ZodBody(MeasurementAddSchema) input: MeasurementAddInput,
  ): Promise<MeasurementsDto> {
    return this.measurements.add(userId, input);
  }
}
