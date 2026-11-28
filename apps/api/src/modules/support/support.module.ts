import { Module } from "@nestjs/common";
import { SupportController } from "./support.controller.js";
import { SupportFaqService } from "./support-faq.service.js";
import { SupportService } from "./support.service.js";

/** The website support bot: answers visitors' questions from `support_faqs` (docs/CHATBOT-FAQ.md). */
@Module({
  controllers: [SupportController],
  providers: [SupportService, SupportFaqService],
})
export class SupportModule {}
