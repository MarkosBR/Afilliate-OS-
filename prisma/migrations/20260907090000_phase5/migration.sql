CREATE TYPE "ContentKind" AS ENUM ('POST', 'CAPTION', 'AD', 'PRODUCT_DESCRIPTION', 'SCRIPT');
CREATE TYPE "ContentSource" AS ENUM ('MANUAL', 'AI');

ALTER TABLE "content" ADD COLUMN "productId" TEXT;
ALTER TABLE "content" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "content" ADD COLUMN "linkId" TEXT;
ALTER TABLE "content" ADD COLUMN "kind" "ContentKind" NOT NULL DEFAULT 'POST';
ALTER TABLE "content" ADD COLUMN "source" "ContentSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "content" ADD COLUMN "generatedBy" TEXT;

CREATE INDEX "content_productId_idx" ON "content"("productId");
CREATE INDEX "content_campaignId_idx" ON "content"("campaignId");
CREATE INDEX "content_linkId_idx" ON "content"("linkId");
CREATE INDEX "content_kind_idx" ON "content"("kind");

ALTER TABLE "content" ADD CONSTRAINT "content_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content" ADD CONSTRAINT "content_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content" ADD CONSTRAINT "content_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "affiliate_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
