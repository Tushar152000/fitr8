import { Controller, HttpCode, Post, Req } from "@nestjs/common";
import { SupportChatSchema, type SupportChatInput, type SupportChatReply } from "@fitr8/contracts";
import type { Request } from "express";
import { Public } from "../../common/auth/decorators.js";
import { StrictRateLimit } from "../../common/http/rate-limit.js";
import { ZodBody } from "../../common/http/zod.js";
import { SupportService } from "./support.service.js";

/** The website's "Ask FITR8" help chat. Public: visitors aren't signed in. */
@Controller("support")
export class SupportController {
  constructor(private readonly support: SupportService) {}

  /** One question in, one plain reply out. */
  @Public()
  @StrictRateLimit()
  @Post("chat")
  @HttpCode(200)
  chat(
    @ZodBody(SupportChatSchema) body: SupportChatInput,
    @Req() req: Request,
  ): Promise<SupportChatReply> {
    return this.support.chat(body, req.ip ?? req.socket.remoteAddress ?? "unknown");
  }
}
