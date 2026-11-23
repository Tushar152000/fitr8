import { Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import {
  TrainingLogSchema,
  TrainingProfileSchema,
  TrainingWeekQuerySchema,
  type TrainingLogDto,
  type TrainingLogInput,
  type TrainingProfileInput,
  type TrainingStateDto,
  type TrainingWeekDto,
  type TrainingWeekQuery,
} from "@fitr8/contracts";
import { UserId } from "../../common/auth/decorators.js";
import { ZodBody, ZodQuery } from "../../common/http/zod.js";
import { TrainingService } from "./training.service.js";

/** The Workout tab (Premium): thin HTTP adapter over TrainingService. */
@Controller("training")
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  /** Training profile (null before setup), setup defaults and the onboarding summary. */
  @Get()
  state(@UserId() userId: string): Promise<TrainingStateDto> {
    return this.training.state(userId);
  }

  /** Save the setup (16b) and get this week (16c). */
  @Post("profile")
  @HttpCode(200)
  saveProfile(
    @UserId() userId: string,
    @ZodBody(TrainingProfileSchema) input: TrainingProfileInput,
  ): Promise<TrainingWeekDto> {
    return this.training.saveProfile(userId, input);
  }

  /** The week containing `start` (default this week). */
  @Get("week")
  week(
    @UserId() userId: string,
    @ZodQuery(TrainingWeekQuerySchema) { start }: TrainingWeekQuery,
  ): Promise<TrainingWeekDto> {
    return this.training.week(userId, start);
  }

  /** Log a session (replaces the same type's log that day). */
  @Post("logs")
  log(
    @UserId() userId: string,
    @ZodBody(TrainingLogSchema) input: TrainingLogInput,
  ): Promise<TrainingLogDto> {
    return this.training.log(userId, input);
  }

  /** Undo a logged session. */
  @Delete("logs/:id")
  @HttpCode(204)
  async deleteLog(@UserId() userId: string, @Param("id") id: string) {
    await this.training.deleteLog(userId, id);
  }
}
