import type { PublicationPlatform } from "@prisma/client";

export type FuturePublishInput = {
  publicationId: string;
  contentId: string;
  platform: PublicationPlatform;
  scheduledAt: Date;
};

export interface PlatformAdapter {
  readonly platform: PublicationPlatform;
  publish(input: FuturePublishInput): Promise<{ externalId: string }>;
}

export class UnimplementedPlatformAdapter implements PlatformAdapter {
  constructor(readonly platform: PublicationPlatform) {}

  async publish(_input: FuturePublishInput): Promise<{ externalId: string }> {
    throw new Error("PLATFORM_NOT_IMPLEMENTED");
  }
}

export function getPlatformAdapter(platform: PublicationPlatform): PlatformAdapter {
  return new UnimplementedPlatformAdapter(platform);
}

export function findDuePublicationsQuery() {
  return {
    status: "SCHEDULED" as const,
    scheduledAt: { lte: new Date() },
  };
}
