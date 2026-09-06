CREATE INDEX "analytics_utmSource_idx" ON "analytics"("utmSource");
CREATE INDEX "analytics_utmMedium_idx" ON "analytics"("utmMedium");
CREATE INDEX "analytics_utmCampaign_idx" ON "analytics"("utmCampaign");
CREATE INDEX "analytics_userId_type_createdAt_idx" ON "analytics"("userId", "type", "createdAt");
CREATE INDEX "analytics_linkId_type_createdAt_idx" ON "analytics"("linkId", "type", "createdAt");
CREATE INDEX "analytics_campaignId_type_createdAt_idx" ON "analytics"("campaignId", "type", "createdAt");
