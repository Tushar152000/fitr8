import { Controller, Get, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { z } from "zod";
import type { AdminFeedbackPageDto } from "@fitr8/contracts";
import { NoStoreInterceptor } from "../../common/http/no-store.interceptor.js";
import { ZodPipe } from "../../common/http/zod.js";
import { wire } from "../../common/http/wire.js";
import { Staff as Actor, StaffGuard } from "../admin/staff.guard.js";
import type { StaffActor } from "../admin/staff.service.js";
import { FeedbackService } from "./feedback.service.js";

const PageQuery = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1) });

/** The Feedback section of the admin (/admin/feedback): users' in-app feedback, newest first. */
@Controller("admin/feedback")
@UseGuards(StaffGuard)
@UseInterceptors(NoStoreInterceptor)
export class FeedbackAdminController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  list(
    @Actor() actor: StaffActor,
    @Query(new ZodPipe(PageQuery)) { page }: z.infer<typeof PageQuery>,
  ): Promise<AdminFeedbackPageDto> {
    return wire(this.feedback.list(actor, page));
  }
}
