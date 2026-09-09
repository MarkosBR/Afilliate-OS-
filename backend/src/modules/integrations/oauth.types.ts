export type IntegrationPlatform = "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "YOUTUBE" | "WHATSAPP" | "TELEGRAM";

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scopes?: string[];
  externalAccountId?: string | null;
  displayName?: string | null;
};

export interface OAuthProvider {
  readonly platform: IntegrationPlatform;
  getAuthorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthTokenSet>;
  refreshToken(refreshToken: string): Promise<OAuthTokenSet>;
  revokeToken(accessToken: string): Promise<void>;
}
