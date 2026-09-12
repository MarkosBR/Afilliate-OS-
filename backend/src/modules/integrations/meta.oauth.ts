import { env } from "../../config/env.js";
import { AppError } from "../../middleware/errorHandler.js";
import type { OAuthProvider, OAuthTokenSet } from "./oauth.types.js";
import { META_GRAPH_BASE, META_OAUTH_DIALOG_URL, META_SCOPES, META_TOKEN_URL } from "./meta.constants.js";
import { metaFetch } from "./meta.http.js";

export type MetaPageAccount = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igUserId: string | null;
  igUsername: string | null;
  igName: string | null;
};

export type MetaTokenSet = OAuthTokenSet & {
  userId?: string | null;
  pages: MetaPageAccount[];
};

type GraphErrorPayload = {
  error?: { message?: string; type?: string; code?: number };
};

export function isMetaOAuthConfigured() {
  return Boolean(env.META_APP_ID.trim() && env.META_APP_SECRET.trim() && env.META_REDIRECT_URI.trim());
}

export function assertMetaOAuthConfigured() {
  if (!isMetaOAuthConfigured()) {
    throw new AppError(501, "OAUTH_NOT_CONFIGURED", "Meta OAuth is not configured.");
  }
}

function graphError(payload: GraphErrorPayload | null | undefined, fallback: string, code: string, status = 502) {
  const message = payload?.error?.message || fallback;
  if (payload?.error?.code === 190) {
    throw new AppError(401, "META_TOKEN_EXPIRED", "Meta token has expired.");
  }
  throw new AppError(status, code, message);
}

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown> & GraphErrorPayload;
}

function parseTokenPayload(payload: Record<string, unknown>): OAuthTokenSet {
  const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
  if (!accessToken) {
    throw new AppError(502, "META_OAUTH_ERROR", "Meta did not return an access token.");
  }
  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : Number(payload.expires_in ?? 0);
  return {
    accessToken,
    refreshToken: null,
    expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
    scopes: [...META_SCOPES],
  };
}

export class MetaOAuthProvider implements OAuthProvider {
  readonly platform = "FACEBOOK" as const;

  getAuthorizationUrl(state: string): string {
    assertMetaOAuthConfigured();
    const params = new URLSearchParams({
      client_id: env.META_APP_ID,
      redirect_uri: env.META_REDIRECT_URI,
      response_type: "code",
      scope: META_SCOPES.join(","),
      state,
    });
    return `${META_OAUTH_DIALOG_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<MetaTokenSet> {
    assertMetaOAuthConfigured();
    const shortLived = await this.requestToken({
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      redirect_uri: env.META_REDIRECT_URI,
      code,
    });
    const longLived = await this.exchangeLongLived(shortLived.accessToken).catch(() => shortLived);
    const profile = await this.fetchUser(longLived.accessToken);
    const pages = await this.fetchPages(longLived.accessToken);
    const primary = pages[0];
    return {
      ...longLived,
      refreshToken: longLived.accessToken,
      externalAccountId: primary?.pageId ?? profile.externalAccountId,
      displayName: primary?.pageName ?? profile.displayName,
      userId: profile.externalAccountId,
      pages,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokenSet> {
    assertMetaOAuthConfigured();
    return this.exchangeLongLived(refreshToken);
  }

  async revokeToken(accessToken: string): Promise<void> {
    if (!accessToken || !isMetaOAuthConfigured()) return;
    await metaFetch(`${META_GRAPH_BASE}/me/permissions?access_token=${encodeURIComponent(accessToken)}`, {
      method: "DELETE",
    }).catch(() => undefined);
  }

  async fetchUser(accessToken: string): Promise<{ externalAccountId: string | null; displayName: string | null }> {
    const response = await metaFetch(`${META_GRAPH_BASE}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`);
    const payload = await readJson(response);
    if (!response.ok || payload.error) {
      graphError(payload, "Failed to load Meta user information.", "META_API_ERROR");
    }
    return {
      externalAccountId: typeof payload.id === "string" ? payload.id : null,
      displayName: typeof payload.name === "string" ? payload.name : null,
    };
  }

  async fetchPages(accessToken: string): Promise<MetaPageAccount[]> {
    const url = `${META_GRAPH_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=${encodeURIComponent(accessToken)}`;
    const response = await metaFetch(url);
    const payload = await readJson(response);
    if (!response.ok || payload.error) {
      graphError(payload, "Failed to load Facebook Pages.", "META_API_ERROR");
    }
    const data = Array.isArray(payload.data) ? payload.data : [];
    return data
      .map((item) => {
        const row = item as {
          id?: string;
          name?: string;
          access_token?: string;
          instagram_business_account?: { id?: string; username?: string; name?: string };
        };
        if (!row.id || !row.access_token) return null;
        const ig = row.instagram_business_account;
        return {
          pageId: row.id,
          pageName: row.name || row.id,
          pageAccessToken: row.access_token,
          igUserId: ig?.id ?? null,
          igUsername: ig?.username ?? null,
          igName: ig?.name ?? null,
        } satisfies MetaPageAccount;
      })
      .filter((item): item is MetaPageAccount => Boolean(item));
  }

  private async exchangeLongLived(shortLivedToken: string): Promise<OAuthTokenSet> {
    return this.requestToken({
      grant_type: "fb_exchange_token",
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      fb_exchange_token: shortLivedToken,
    });
  }

  private async requestToken(params: Record<string, string>): Promise<OAuthTokenSet> {
    const response = await metaFetch(`${META_TOKEN_URL}?${new URLSearchParams(params).toString()}`);
    const payload = await readJson(response);
    if (!response.ok || payload.error) {
      graphError(payload, "Failed to exchange Meta authorization code.", "META_OAUTH_ERROR");
    }
    return parseTokenPayload(payload);
  }
}
