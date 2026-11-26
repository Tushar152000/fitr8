import { Injectable } from "@nestjs/common";
import type { FeedbackInput } from "@fitr8/contracts";
import { feedbackCan } from "@fitr8/domain/feedback";
import { AppError } from "../../common/errors.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import type { StaffActor } from "../admin/staff.service.js";

const HOUR_MS = 60 * 60 * 1000;
/** Messages one account may send per rolling hour (counted in the table, so every instance agrees). */
export const FEEDBACK_HOURLY_LIMIT = 5;
export const FEEDBACK_PAGE_SIZE = 50;

/**
 * Help & support "Send feedback": stores each message with the sender, app version and platform.
 * Staff with `feedbackCan(role, "read")` list them at /admin/feedback. Owns `feedback`.
 */
@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async send(userId: string, input: FeedbackInput, now = new Date()) {
    const recent = await this.prisma.feedback.count({
      where: { userId, createdAt: { gt: new Date(now.getTime() - HOUR_MS) } },
    });
    if (recent >= FEEDBACK_HOURLY_LIMIT)
      throw new AppError(
        429,
        "Thanks, we've got your recent messages. Please try again in a little while.",
      );
    return this.prisma.feedback.create({
      data: {
        userId,
        message: input.message,
        topic: input.topic ?? null,
        appVersion: input.appVersion ?? null,
        platform: input.platform ?? null,
      },
      select: { id: true, createdAt: true },
    });
  }

  /** Newest first, a page at a time, with who sent each message. */
  async list(actor: StaffActor, page: number) {
    if (!feedbackCan(actor.role, "read"))
      throw new AppError(403, "Your role on the team can't do that");
    const [total, rows] = await Promise.all([
      this.prisma.feedback.count(),
      this.prisma.feedback.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * FEEDBACK_PAGE_SIZE,
        take: FEEDBACK_PAGE_SIZE,
        select: {
          id: true,
          message: true,
          topic: true,
          appVersion: true,
          platform: true,
          createdAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
      }),
    ]);
    return {
      items: rows,
      page,
      pages: Math.max(1, Math.ceil(total / FEEDBACK_PAGE_SIZE)),
      total,
    };
  }
}
