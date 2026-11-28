-- AlterEnum
ALTER TYPE "AiCallType" ADD VALUE 'SUPPORT_CHAT';

-- CreateTable
CREATE TABLE "support_faqs" (
    "slug" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_faqs_pkey" PRIMARY KEY ("slug")
);
