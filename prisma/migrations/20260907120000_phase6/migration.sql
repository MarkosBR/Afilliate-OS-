ALTER TYPE "ContentStatus" ADD VALUE 'APPROVED';
ALTER TYPE "ContentStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "ContentStatus" ADD VALUE 'FAILED';

CREATE TYPE "PublicationPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'OTHER');
CREATE TYPE "PublicationStatus" AS ENUM ('PENDING', 'SCHEDULED', 'READY', 'PUBLISHED', 'FAILED', 'CANCELLED');
CREATE TYPE "NotificationType" AS ENUM ('CONTENT_APPROVED', 'CONTENT_REJECTED', 'CONTENT_SCHEDULED', 'PUBLICATION_FAILED', 'PUBLICATION_PUBLISHED');

CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "platform" "PublicationPlatform" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "publishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "publications_userId_idx" ON "publications"("userId");
CREATE INDEX "publications_contentId_idx" ON "publications"("contentId");
CREATE INDEX "publications_status_idx" ON "publications"("status");
CREATE INDEX "publications_scheduledAt_idx" ON "publications"("scheduledAt");
CREATE INDEX "publications_platform_idx" ON "publications"("platform");
CREATE INDEX "publications_userId_status_scheduledAt_idx" ON "publications"("userId", "status", "scheduledAt");
CREATE INDEX "publications_contentId_platform_status_idx" ON "publications"("contentId", "platform", "status");
CREATE UNIQUE INDEX "publications_content_platform_active_idx" ON "publications"("contentId", "platform") WHERE "status" IN ('PENDING', 'SCHEDULED', 'READY');

CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

ALTER TABLE "publications" ADD CONSTRAINT "publications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publications" ADD CONSTRAINT "publications_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
