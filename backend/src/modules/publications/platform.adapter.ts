import type { IntegrationPlatform, PublicationPlatform } from "@prisma/client";
import { AppError } from "../../middleware/errorHandler.js";
import { YouTubePlatformAdapter } from "../integrations/youtube.adapter.js";

export type FuturePublishInput = {
  publicationId: string;
  contentId: string;
  platform: PublicationPlatform;
  scheduledAt: Date;
};

export type ConnectionInfo = {
  id: string;
  platform: IntegrationPlatform;
  status: string;
  displayName: string | null;
  externalAccountId: string | null;
};

export interface PlatformAdapter {
  readonly platform: IntegrationPlatform;
  validateConnection(account: ConnectionInfo): Promise<boolean>;
  publish(input: FuturePublishInput): Promise<{ externalId: string }>;
  getAccountInfo(account: ConnectionInfo): Promise<{ displayName: string | null; externalAccountId: string | null }>;
  disconnect(account: ConnectionInfo): Promise<void>;
}

export class UnimplementedPlatformAdapter implements PlatformAdapter {
  constructor(readonly platform: IntegrationPlatform) {}

  async validateConnection(_account: ConnectionInfo): Promise<boolean> {
    throw new AppError(501, "PLATFORM_NOT_IMPLEMENTED", "This platform is not implemented yet.");
  }

  async publish(_input: FuturePublishInput): Promise<{ externalId: string }> {
    throw new AppError(501, "PLATFORM_NOT_IMPLEMENTED", "This platform is not implemented yet.");
  }

  async getAccountInfo(_account: ConnectionInfo): Promise<{ displayName: string | null; externalAccountId: string | null }> {
    throw new AppError(501, "PLATFORM_NOT_IMPLEMENTED", "This platform is not implemented yet.");
  }

  async disconnect(_account: ConnectionInfo): Promise<void> {
    return;
  }
}

const adapters = new Map<IntegrationPlatform, PlatformAdapter>();

for (const platform of ["INSTAGRAM", "FACEBOOK", "TIKTOK", "WHATSAPP", "TELEGRAM"] as const) {
  adapters.set(platform, new UnimplementedPlatformAdapter(platform));
}
adapters.set("YOUTUBE", new YouTubePlatformAdapter());

export function getPlatformAdapter(platform: IntegrationPlatform | PublicationPlatform): PlatformAdapter {
  if (platform === "OTHER") {
    throw new AppError(400, "INVALID_PLATFORM", "Invalid integration platform.");
  }
  const adapter = adapters.get(platform);
  if (!adapter) {
    throw new AppError(400, "INVALID_PLATFORM", "Invalid integration platform.");
  }
  return adapter;
}

export function findDuePublicationsQuery() {
  return {
    status: "SCHEDULED" as const,
    scheduledAt: { lte: new Date() },
  };
}
