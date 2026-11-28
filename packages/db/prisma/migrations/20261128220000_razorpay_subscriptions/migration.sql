-- Razorpay subscriptions for FITR8 Premium; additive (new table only).
CREATE TABLE "razorpay_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trial" BOOLEAN NOT NULL,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "proUntil" TIMESTAMP(3),
    "willRenew" BOOLEAN NOT NULL DEFAULT false,
    "inTrial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "razorpay_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "razorpay_subscriptions_userId_createdAt_idx" ON "razorpay_subscriptions"("userId", "createdAt");

ALTER TABLE "razorpay_subscriptions" ADD CONSTRAINT "razorpay_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
