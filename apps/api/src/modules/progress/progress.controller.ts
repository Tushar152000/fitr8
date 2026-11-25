import { Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  CalendarQuerySchema,
  CheckinDateSchema,
  CheckinSchema,
  CheckinUpdateSchema,
  type CalendarDto,
  type CalendarQuery,
  type CheckinDto,
  type CheckinInput,
  type CheckinUpdateInput,
  type CheckinsDto,
  type DashboardDto,
  type HistoryDto,
  type ProgressDto,
  type StreakDto,
} from "@fitr8/contracts";
import { UserId } from "../../common/auth/decorators.js";
import { ZodBody, ZodPipe, ZodQuery } from "../../common/http/zod.js";
import { wire } from "../../common/http/wire.js";
import { UsersService } from "../users/users.service.js";
import { CheckinsService } from "./checkins.service.js";
import { DashboardService } from "./dashboard.service.js";
import { HistoryService } from "./history.service.js";
import { ProgressService } from "./progress.service.js";

/** Thin HTTP adapter for weigh-ins, the Today dashboard, history and progress. */
@Controller()
export class ProgressController {
  constructor(
    private readonly checkins: CheckinsService,
    private readonly dashboard: DashboardService,
    private readonly history: HistoryService,
    private readonly progress: ProgressService,
    private readonly users: UsersService,
  ) {}

  /** Log a weigh-in (replaces that day's). */
  @Post("checkins")
  logWeighIn(
    @UserId() userId: string,
    @ZodBody(CheckinSchema) input: CheckinInput,
  ): Promise<CheckinDto> {
    return wire(this.checkins.logWeighIn(userId, input));
  }

  /** Correct the weigh-in of `:date` (YYYY-MM-DD); 404 when there is none that day. */
  @Patch("checkins/:date")
  updateWeighIn(
    @UserId() userId: string,
    @Param("date", new ZodPipe(CheckinDateSchema)) date: string,
    @ZodBody(CheckinUpdateSchema) { weightKg }: CheckinUpdateInput,
  ): Promise<CheckinDto> {
    return wire(this.checkins.updateWeighIn(userId, date, weightKg));
  }

  /** Delete the weigh-in of `:date`; the day's other measurements stay. */
  @Delete("checkins/:date")
  @HttpCode(204)
  async removeWeighIn(
    @UserId() userId: string,
    @Param("date", new ZodPipe(CheckinDateSchema)) date: string,
  ): Promise<void> {
    await this.checkins.removeWeighIn(userId, date);
  }

  @Get("checkins")
  listCheckins(@UserId() userId: string): Promise<CheckinsDto> {
    return wire(this.checkins.list(userId));
  }

  /** Screen 6 data: the day's targets and meals, plus the logging streak. `?date=YYYY-MM-DD`, default today. */
  @Get("dashboard")
  getDashboard(@UserId() userId: string, @Query("date") date?: string): Promise<DashboardDto> {
    return wire(this.dashboard.getDay(userId, date));
  }

  /** Today's streak sheet: current and best streak, whether today is logged, this Mon–Sun week. */
  @Get("streak")
  getStreak(@UserId() userId: string): Promise<StreakDto> {
    return this.dashboard.streak(userId);
  }

  /** Meals calendar: each day of `?month=YYYY-MM` (default this month) on/over target, missed or none. */
  @Get("calendar")
  getCalendar(
    @UserId() userId: string,
    @ZodQuery(CalendarQuerySchema) { month }: CalendarQuery,
  ): Promise<CalendarDto> {
    return this.history.month(userId, month);
  }

  /** GET /api/history?days=7|30 — daily totals, targets and confirmed meals (design 12). */
  @Get("history")
  async getHistory(@UserId() userId: string, @Query("days") days?: string): Promise<HistoryDto> {
    return this.history.getHistory(userId, days === "30" ? 30 : 7, await this.users.today(userId));
  }

  /** Screen 11 data: weigh-in trend vs plan, and the last 7 days' stats. */
  @Get("progress")
  getProgress(@UserId() userId: string): Promise<ProgressDto> {
    return wire(this.progress.get(userId));
  }
}
