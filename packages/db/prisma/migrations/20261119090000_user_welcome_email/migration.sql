-- AlterTable
ALTER TABLE "users" ADD COLUMN     "welcomeEmailSentAt" TIMESTAMP(3);

-- Users who finished onboarding before this shipped never get the welcome email.
UPDATE "users" SET "welcomeEmailSentAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "userId" FROM "profiles" WHERE "onboardedAt" IS NOT NULL);
