import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module.js";
import { FeedbackAdminController } from "./feedback-admin.controller.js";
import { FeedbackController } from "./feedback.controller.js";
import { FeedbackService } from "./feedback.service.js";

/**
 * In-app feedback (Help & support → "Send feedback"): POST /feedback for signed-in users and the
 * admin's Feedback section (/api/admin/feedback, behind StaffGuard). Owns `feedback`.
 */
@Module({
  imports: [AdminModule],
  controllers: [FeedbackController, FeedbackAdminController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
