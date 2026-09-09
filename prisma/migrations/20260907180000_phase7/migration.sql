CREATE TYPE "IntegrationPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'WHATSAPP', 'TELEGRAM');
CREATE TYPE "ConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'EXPIRED', 'ERROR');

CREATE TABLE "connected_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "IntegrationPlatform" NOT NULL,
    "externalAccountId" TEXT,
    "displayName" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "publications" ADD COLUMN "connectedAccountId" TEXT;

CREATE UNIQUE INDEX "connected_accounts_userId_platform_key" ON "connected_accounts"("userId", "platform");
CREATE INDEX "connected_accounts_userId_idx" ON "connected_accounts"("userId");
CREATE INDEX "connected_accounts_platform_idx" ON "connected_accounts"("platform");
CREATE INDEX "connected_accounts_status_idx" ON "connected_accounts"("status");
CREATE INDEX "connected_accounts_userId_status_idx" ON "connected_accounts"("userId", "status");
CREATE INDEX "publications_connectedAccountId_idx" ON "publications"("connectedAccountId");

ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publications" ADD CONSTRAINT "publications_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "connected_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
