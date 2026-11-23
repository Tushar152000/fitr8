-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('GYM', 'RUN', 'YOGA', 'WALK', 'HOME', 'CYCLE');

-- CreateEnum
CREATE TYPE "TrainingSessionType" AS ENUM ('GYM', 'RUN', 'HIIT', 'YOGA', 'WALK', 'CYCLE');

-- CreateEnum
CREATE TYPE "HealthPlatform" AS ENUM ('APPLE_HEALTH', 'HEALTH_CONNECT');

-- CreateTable
CREATE TABLE "training_profiles" (
    "userId" TEXT NOT NULL,
    "types" "TrainingType"[],
    "daysPerWeek" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "training_weeks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "inputsKey" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "TrainingSessionType" NOT NULL,
    "minutes" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "kcal" INTEGER NOT NULL,
    "exercises" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_connections" (
    "userId" TEXT NOT NULL,
    "platform" "HealthPlatform" NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_connections_pkey" PRIMARY KEY ("userId","platform")
);

-- CreateTable
CREATE TABLE "health_samples" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "HealthPlatform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "origin" TEXT,
    "device" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_daily" (
    "userId" TEXT NOT NULL,
    "platform" "HealthPlatform" NOT NULL,
    "date" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_daily_pkey" PRIMARY KEY ("userId","platform","date","metric")
);

-- CreateIndex
CREATE UNIQUE INDEX "training_weeks_userId_weekStart_key" ON "training_weeks"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "training_logs_userId_date_idx" ON "training_logs"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "training_logs_userId_date_type_key" ON "training_logs"("userId", "date", "type");

-- CreateIndex
CREATE INDEX "health_samples_userId_type_startAt_idx" ON "health_samples"("userId", "type", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "health_samples_userId_platform_externalId_key" ON "health_samples"("userId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "health_daily_userId_metric_date_idx" ON "health_daily"("userId", "metric", "date");

-- AddForeignKey
ALTER TABLE "training_profiles" ADD CONSTRAINT "training_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_weeks" ADD CONSTRAINT "training_weeks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_logs" ADD CONSTRAINT "training_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_connections" ADD CONSTRAINT "health_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_samples" ADD CONSTRAINT "health_samples_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_daily" ADD CONSTRAINT "health_daily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
