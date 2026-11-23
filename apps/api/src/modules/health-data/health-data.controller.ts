import { Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import {
  HealthConnectSchema,
  HealthPlatformSchema,
  HealthSummaryQuerySchema,
  HealthSyncSchema,
  type HealthConnectInput,
  type HealthConnectionDto,
  type HealthStatusDto,
  type HealthSummaryDto,
  type HealthSyncInput,
  type HealthSyncResultDto,
} from "@fitr8/contracts";
import { z } from "zod";
import { UserId } from "../../common/auth/decorators.js";
import { ZodBody, ZodQuery } from "../../common/http/zod.js";
import { HealthDataService } from "./health-data.service.js";

/** Apple Health / Health Connect: thin HTTP adapter over HealthDataService. */
@Controller("health-data")
export class HealthDataController {
  constructor(private readonly health: HealthDataService) {}

  /** Connected platforms and how many records are stored. */
  @Get()
  status(@UserId() userId: string): Promise<HealthStatusDto> {
    return this.health.status(userId);
  }

  /** The user allowed access on the phone. */
  @Post("connect")
  @HttpCode(200)
  connect(
    @UserId() userId: string,
    @ZodBody(HealthConnectSchema) input: HealthConnectInput,
  ): Promise<HealthConnectionDto> {
    return this.health.connect(userId, input);
  }

  /** A batch of records and daily totals from the phone (repeat-safe). */
  @Post("sync")
  @HttpCode(200)
  sync(
    @UserId() userId: string,
    @ZodBody(HealthSyncSchema) input: HealthSyncInput,
  ): Promise<HealthSyncResultDto> {
    return this.health.sync(userId, input);
  }

  /** Steps, heart rate, BMI, SpO2, sleep and recovery for a day (default today). */
  @Get("summary")
  summary(
    @UserId() userId: string,
    @ZodQuery(HealthSummaryQuerySchema) { date }: { date?: string },
  ): Promise<HealthSummaryDto> {
    return this.health.summary(userId, date);
  }

  /** Disconnect a platform; `?deleteData=true` also deletes every record it sent. */
  @Delete("connections/:platform")
  @HttpCode(204)
  async disconnect(
    @UserId() userId: string,
    @Param("platform") platform: string,
    @Query("deleteData") deleteData?: string,
  ) {
    await this.health.disconnect(
      userId,
      HealthPlatformSchema.parse(platform),
      z.enum(["true", "false"]).default("false").parse(deleteData) === "true",
    );
  }
}
