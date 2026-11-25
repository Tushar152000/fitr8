import { Controller, Post } from "@nestjs/common";
import { FeedbackSchema, type FeedbackInput, type FeedbackSentDto } from "@fitr8/contracts";
import { UserId } from "../../common/auth/decorators.js";
import { StrictRateLimit } from "../../common/http/rate-limit.js";
import { ZodBody } from "../../common/http/zod.js";
import { wire } from "../../common/http/wire.js";
import { FeedbackService } from "./feedback.service.js";

/** Help & support → "Send feedback" (signed in). */
@Controller("feedback")
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  /** Stores the message for the team. 201 `{ id, createdAt }`; 429 after a few in an hour. */
  @StrictRateLimit()
  @Post()
  send(
    @UserId() userId: string,
    @ZodBody(FeedbackSchema) input: FeedbackInput,
  ): Promise<FeedbackSentDto> {
    return wire(this.feedback.send(userId, input));
  }
}
