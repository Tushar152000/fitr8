-- Profile photo the user uploaded (private storage key); additive, nullable.
ALTER TABLE "users" ADD COLUMN "imageKey" TEXT;
