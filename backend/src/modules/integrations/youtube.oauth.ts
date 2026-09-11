import { env } from "../../config/env.js";
import { AppError } from "../../middleware/errorHandler.js";
import type { OAuthProvider, OAuthTokenSet } from "./oauth.types.js";
import {
  GOOGLE_AUTH_URL,
  GOOGLE_REVOKE_URL,
  GOOGLE_TOKEN_URL,
  YOUTUBE_CHANNELS_URL,
  YOUTUBE_SCOPES,
} from "./youtube.constants.js";
import { youtubeFetch } from "./youtube.http.js";

export function isYouTubeOAuthConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID.trim() && env.GOOGLE_CLIENT_SECRET.trim() && env.GOOGLE_REDIRECT_URI.trim());
}

export function assertYouTubeOAuthConfigured() {
  if (!isYouTubeOAuthConfigured()) {
    throw new AppError(501, "OAUTH_NOT_CONFIGURED", "YouTube OAuth is not configured.");
  }
}

function parseTokenPayload(payload: Record<string, unknown>): OAuthTokenSet {
  const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
  if (!accessToken) {
    throw new AppError(502, "OAUTH_CALLBACK_FAILED", "Google did not return an access token.");
  }
  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : Number(payload.expires_in ?? 0);
  const scope = typeof payload.scope === "string" ? payload.scope.split(" ").filter(Boolean) : [...YOUTUBE_SCOPES];
  return {
    accessToken,
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : null,
    expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
    scopes: scope,
  };
}

export class YouTubeOAuthProvider implements OAuthProvider {
  readonly platform = "YOUTUBE" as const;

  getAuthorizationUrl(state: string): string {
    assertYouTubeOAuthConfigured();
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: YOUTUBE_SCOPES.join(" "),
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    assertYouTubeOAuthConfigured();
    const body = new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    });
    const response = await youtubeFetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new AppError(502, "OAUTH_CALLBACK_FAILED", "Failed to exchange YouTube authorization code.");
    }
    const tokens = parseTokenPayload(payload);
    const channel = await this.fetchChannel(tokens.accessToken);
    return { ...tokens, ...channel };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    assertYouTubeOAuthConfigured();
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    });
    const response = await youtubeFetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new AppError(401, "YOUTUBE_TOKEN_EXPIRED", "YouTube token could not be refreshed.");
    }
    return parseTokenPayload(payload);
  }

  async revokeToken(accessToken: string): Promise<void> {
    if (!accessToken) return;
    await youtubeFetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(accessToken)}`, { method: "POST" }).catch(() => undefined);
  }

  async fetchChannel(accessToken: string): Promise<{ externalAccountId: string | null; displayName: string | null }> {
    const response = await youtubeFetch(`${YOUTUBE_CHANNELS_URL}?part=snippet&mine=true`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const payload = (await response.json()) as {
      items?: Array<{ id?: string; snippet?: { title?: string } }>;
    };
    if (!response.ok) {
      throw new AppError(502, "YOUTUBE_API_ERROR", "Failed to load YouTube channel information.");
    }
    const channel = payload.items?.[0];
    return {
      externalAccountId: channel?.id ?? null,
      displayName: channel?.snippet?.title ?? null,
    };
  }
}
