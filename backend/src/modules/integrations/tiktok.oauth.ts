import { env } from "../../config/env.js";
import { AppError } from "../../middleware/errorHandler.js";
import type { OAuthProvider, OAuthTokenSet } from "./oauth.types.js";
import {
  TIKTOK_AUTH_URL,
  TIKTOK_REVOKE_URL,
  TIKTOK_SCOPES,
  TIKTOK_TOKEN_URL,
  TIKTOK_USER_INFO_URL,
} from "./tiktok.constants.js";
import { tiktokFetch } from "./tiktok.http.js";

export function isTikTokOAuthConfigured() {
  return Boolean(env.TIKTOK_CLIENT_KEY.trim() && env.TIKTOK_CLIENT_SECRET.trim() && env.TIKTOK_REDIRECT_URI.trim());
}

export function assertTikTokOAuthConfigured() {
  if (!isTikTokOAuthConfigured()) {
    throw new AppError(501, "OAUTH_NOT_CONFIGURED", "TikTok OAuth is not configured.");
  }
}

function parseTokenPayload(payload: Record<string, unknown>): OAuthTokenSet & { openId?: string } {
  const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
  if (!accessToken) {
    throw new AppError(502, "OAUTH_CALLBACK_FAILED", "TikTok did not return an access token.");
  }
  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : Number(payload.expires_in ?? 0);
  const scopeRaw = typeof payload.scope === "string" ? payload.scope : "";
  const scopes = scopeRaw
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    accessToken,
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : null,
    expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
    scopes: scopes.length ? scopes : [...TIKTOK_SCOPES],
    externalAccountId: typeof payload.open_id === "string" ? payload.open_id : null,
    openId: typeof payload.open_id === "string" ? payload.open_id : undefined,
  };
}

export class TikTokOAuthProvider implements OAuthProvider {
  readonly platform = "TIKTOK" as const;

  getAuthorizationUrl(state: string): string {
    assertTikTokOAuthConfigured();
    const params = new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY,
      redirect_uri: env.TIKTOK_REDIRECT_URI,
      response_type: "code",
      scope: TIKTOK_SCOPES.join(","),
      state,
    });
    return `${TIKTOK_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    assertTikTokOAuthConfigured();
    const body = new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.TIKTOK_REDIRECT_URI,
    });
    const response = await tiktokFetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
      body,
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok || payload.error) {
      throw new AppError(502, "OAUTH_CALLBACK_FAILED", "Failed to exchange TikTok authorization code.");
    }
    const tokens = parseTokenPayload(payload);
    const profile = await this.fetchUser(tokens.accessToken);
    return {
      ...tokens,
      externalAccountId: profile.externalAccountId ?? tokens.externalAccountId ?? null,
      displayName: profile.displayName,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    assertTikTokOAuthConfigured();
    const body = new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const response = await tiktokFetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
      body,
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok || payload.error) {
      throw new AppError(401, "TIKTOK_TOKEN_EXPIRED", "TikTok token could not be refreshed.");
    }
    return parseTokenPayload(payload);
  }

  async revokeToken(accessToken: string): Promise<void> {
    if (!accessToken || !isTikTokOAuthConfigured()) return;
    const body = new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      token: accessToken,
    });
    await tiktokFetch(TIKTOK_REVOKE_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
      body,
    }).catch(() => undefined);
  }

  async fetchUser(accessToken: string): Promise<{ externalAccountId: string | null; displayName: string | null }> {
    const response = await tiktokFetch(`${TIKTOK_USER_INFO_URL}?fields=open_id,display_name,username`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const payload = (await response.json()) as {
      data?: { user?: { open_id?: string; display_name?: string; username?: string } };
      error?: { code?: string };
    };
    if (!response.ok || (payload.error?.code && payload.error.code !== "ok")) {
      throw new AppError(502, "TIKTOK_API_ERROR", "Failed to load TikTok account information.");
    }
    const user = payload.data?.user;
    return {
      externalAccountId: user?.open_id ?? null,
      displayName: user?.display_name || user?.username || null,
    };
  }
}
