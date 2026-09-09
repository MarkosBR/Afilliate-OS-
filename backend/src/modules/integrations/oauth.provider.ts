import { AppError } from "../../middleware/errorHandler.js";
import type { IntegrationPlatform, OAuthProvider, OAuthTokenSet } from "./oauth.types.js";

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
  return new UnconfiguredOAuthProvider(platform);
}
