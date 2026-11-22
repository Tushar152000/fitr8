-- The welcome email now goes out when an account is created, not after onboarding.
-- Every account that exists before this ships has already signed up: never welcome them now.
UPDATE "users" SET "welcomeEmailSentAt" = CURRENT_TIMESTAMP WHERE "welcomeEmailSentAt" IS NULL;
