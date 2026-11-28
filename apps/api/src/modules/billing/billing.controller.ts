import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import {
  RazorpaySubscribeSchema,
  TestPurchaseSchema,
  type BillingDto,
  type RazorpayCheckoutDto,
  type RazorpaySubscribeInput,
  type TestPurchaseInput,
} from "@fitr8/contracts";
import { Public, UserId } from "../../common/auth/decorators.js";
import { StrictRateLimit } from "../../common/http/rate-limit.js";
import { ZodBody } from "../../common/http/zod.js";
import { BillingService } from "./billing.service.js";
import { RazorpayService } from "./razorpay.service.js";

/** Thin HTTP adapter for FITR8 Premium. */
@Controller("billing")
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly razorpay: RazorpayService,
  ) {}

  /** The caller's plan, renewal and today's limits. */
  @Get()
  get(@UserId() userId: string): Promise<BillingDto> {
    return this.billing.billing(userId);
  }

  /** The app calls this right after a purchase or "Restore purchases". */
  @Post("refresh")
  @HttpCode(200)
  refresh(@UserId() userId: string): Promise<BillingDto> {
    return this.billing.refresh(userId);
  }

  /** One-tap Premium, no money, while store billing isn't connected (404 after). */
  @Post("test-purchase")
  @HttpCode(200)
  testPurchase(
    @UserId() userId: string,
    @ZodBody(TestPurchaseSchema) input: TestPurchaseInput,
  ): Promise<BillingDto> {
    return this.billing.testPurchase(userId, input);
  }

  /** End a test purchase: back to Free (for trying the free plan again). */
  @Delete("test-purchase")
  @HttpCode(200)
  endTestPurchase(@UserId() userId: string): Promise<BillingDto> {
    return this.billing.endTestPurchase(userId);
  }

  /** Start paying through Razorpay: returns Razorpay's hosted checkout page for the plan picked. */
  @Post("razorpay/subscription")
  @HttpCode(200)
  @StrictRateLimit()
  subscribe(
    @UserId() userId: string,
    @ZodBody(RazorpaySubscribeSchema) input: RazorpaySubscribeInput,
  ): Promise<RazorpayCheckoutDto> {
    return this.razorpay.checkout(userId, input);
  }

  /** Stop renewing a Razorpay subscription; Premium stays until the end of the paid period. */
  @Post("razorpay/cancel")
  @HttpCode(200)
  @StrictRateLimit()
  async cancel(@UserId() userId: string): Promise<BillingDto> {
    await this.razorpay.cancel(userId);
    return this.billing.billing(userId);
  }

  /**
   * Razorpay → us. Public (no session), authenticated by the HMAC signature of the raw body. 200 once
   * handled, so Razorpay stops retrying.
   */
  @Public()
  @Post("razorpay")
  @HttpCode(200)
  razorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature: string | undefined,
    @Headers("x-razorpay-event-id") eventId: string | undefined,
    @Body() body: unknown,
  ) {
    return this.razorpay.handleWebhook(req.rawBody, signature, eventId, body);
  }

  /**
   * RevenueCat → us. Public (no session), authenticated by the shared Authorization header,
   * checked before the body is parsed. Always 200 once handled, so RevenueCat stops retrying.
   */
  @Public()
  @Post("revenuecat")
  @HttpCode(200)
  webhook(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    return this.billing.handleWebhook(authorization, body);
  }
}
