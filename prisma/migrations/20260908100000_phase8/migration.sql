ALTER TYPE "ContentKind" ADD VALUE 'VIDEO';

ALTER TABLE "content" ADD COLUMN "tags" TEXT;
ALTER TABLE "content" ADD COLUMN "videoPath" TEXT;
ALTER TABLE "content" ADD COLUMN "videoFileName" TEXT;

ALTER TABLE "publications" ADD COLUMN "externalId" TEXT;

CREATE TABLE "oauth_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "IntegrationPlatform" NOT NULL,
    "state" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth_states_state_key" ON "oauth_states"("state");
CREATE INDEX "oauth_states_userId_idx" ON "oauth_states"("userId");
CREATE INDEX "oauth_states_expiresAt_idx" ON "oauth_states"("expiresAt");
CREATE INDEX "oauth_states_platform_idx" ON "oauth_states"("platform");

ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
