-- AlterTable
ALTER TABLE "body_metrics" ADD COLUMN     "armCm" DOUBLE PRECISION,
ADD COLUMN     "chestCm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "remindMeals" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remindWeighIn" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" VARCHAR(40),
    "message" VARCHAR(2000) NOT NULL,
    "appVersion" VARCHAR(32),
    "platform" VARCHAR(16),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");

-- CreateIndex
CREATE INDEX "feedback_userId_createdAt_idx" ON "feedback"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
