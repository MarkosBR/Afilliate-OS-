-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable affiliate_links
ALTER TABLE "affiliate_links" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "affiliate_links" ADD COLUMN "status" "LinkStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "affiliate_links" ADD COLUMN "clicks" INTEGER NOT NULL DEFAULT 0;

-- Unique slug globally (drop per-user unique if present)
DROP INDEX IF EXISTS "affiliate_links_userId_slug_key";
CREATE UNIQUE INDEX "affiliate_links_slug_key" ON "affiliate_links"("slug");

CREATE INDEX "affiliate_links_campaignId_idx" ON "affiliate_links"("campaignId");
CREATE INDEX "affiliate_links_status_idx" ON "affiliate_links"("status");

ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable analytics tracking fields
ALTER TABLE "analytics" ADD COLUMN "referrer" TEXT;
ALTER TABLE "analytics" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "analytics" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "analytics" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "analytics" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "analytics" ADD COLUMN "utmContent" TEXT;
ALTER TABLE "analytics" ADD COLUMN "utmTerm" TEXT;
ALTER TABLE "analytics" ADD COLUMN "fingerprint" TEXT;

CREATE INDEX "analytics_fingerprint_idx" ON "analytics"("fingerprint");
