import { AppError } from "../../middleware/errorHandler.js";
import type { IntegrationPlatform, OAuthProvider, OAuthTokenSet } from "./oauth.types.js";
import { YouTubeOAuthProvider, isYouTubeOAuthConfigured } from "./youtube.oauth.js";
import { TikTokOAuthProvider, isTikTokOAuthConfigured } from "./tiktok.oauth.js";

export class UnconfiguredOAuthProvider implements OAuthProvider {
  constructor(readonly platform: IntegrationPlatform) {}

  getAuthorizationUrl(_state: string): string {
    throw new AppError(501, "OAUTH_NOT_CONFIGURED", "OAuth is not configured for this platform.");
  }

  async exchangeCode(_code: string): Promise<OAuthTokenSet> {
    throw new AppError(501, "OAUTH_NOT_CONFIGURED", "OAuth is not configured for this platform.");
  }

  async refreshToken(_refreshToken: string): Promise<OAuthTokenSet> {
    throw new AppError(501, "OAUTH_NOT_CONFIGURED", "OAuth is not configured for this platform.");
  }

  async revokeToken(_accessToken: string): Promise<void> {
    throw new AppError(501, "OAUTH_NOT_CONFIGURED", "OAuth is not configured for this platform.");
  }
}

export function getOAuthProvider(platform: IntegrationPlatform): OAuthProvider {
  if (platform === "YOUTUBE" && isYouTubeOAuthConfigured()) {
    return new YouTubeOAuthProvider();
  }
  if (platform === "TIKTOK" && isTikTokOAuthConfigured()) {
    return new TikTokOAuthProvider();
  }
  return new UnconfiguredOAuthProvider(platform);
}
