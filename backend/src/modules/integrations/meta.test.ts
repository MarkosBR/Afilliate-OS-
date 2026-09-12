import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { encryptSecret } from "../../lib/secrets.js";
import { saveUserVideo } from "../../lib/media.js";
import { getPlatformAdapter } from "../publications/platform.adapter.js";
import { executePublication } from "../publications/publication.executor.js";
import { FacebookPlatformAdapter } from "./facebook.adapter.js";
import { InstagramPlatformAdapter } from "./instagram.adapter.js";
import { resetMetaFetch, setMetaFetch } from "./meta.http.js";
import { YouTubePlatformAdapter } from "./youtube.adapter.js";
import { TikTokPlatformAdapter } from "./tiktok.adapter.js";

const prisma = new PrismaClient();

type Agent = ReturnType<typeof createAgent>;

function createAgent() {
  const app = createApp();
  return {
    async request(method: string, path: string, body?: unknown, token?: string) {
      const server = app.listen(0);
      await new Promise<void>((resolve) => server.once("listening", () => resolve()));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No address");
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (token) headers.authorization = `Bearer ${token}`;
      try {
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const json = (await response.json()) as Record<string, unknown>;
        return { status: response.status, json, headers: response.headers };
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    },
  };
}

async function register(agent: Agent, email: string) {
  const response = await agent.request("POST", "/api/auth/register", {
    name: email.split("@")[0],
    email,
    password: "password1",
    confirmPassword: "password1",
  });
  assert.equal(response.status, 201);
  return response.json.data as { token: string; user: { id: string } };
}

function assertNoSecrets(payload: unknown) {
  const text = JSON.stringify(payload);
  assert.equal(text.includes("accessToken"), false);
  assert.equal(text.includes("refreshToken"), false);
  assert.equal(text.includes("enc:v1:"), false);
}

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function mockMeta(
  options: {
    withInstagram?: boolean;
    feedOk?: boolean;
    igStatus?: string | (() => string);
  } = {},
) {
  const withInstagram = options.withInstagram !== false;
  const feedOk = options.feedOk !== false;
  setMetaFetch(async (input, init) => {
    const body = init?.body as { destroy?: () => void } | undefined;
    if (body && typeof body.destroy === "function") body.destroy();
    const raw = String(input);
    const url = new URL(raw);
    const path = url.pathname;

    if (path.includes("/oauth/access_token")) {
      return json({ access_token: "meta-user-token", expires_in: 5184000, token_type: "bearer" });
    }
    if (path.endsWith("/me/permissions") && (init?.method === "DELETE" || init?.method === "delete")) {
      return json({ success: true });
    }
    if (path.endsWith("/me/accounts")) {
      return json({
        data: [
          {
            id: "page-1",
            name: "Pagina Teste",
            access_token: "page-token",
            instagram_business_account: withInstagram
              ? { id: "ig-1", username: "ig_teste", name: "IG Teste" }
              : undefined,
          },
        ],
      });
    }
    if (path.endsWith("/me")) {
      return json({ id: "user-1", name: "Meta User" });
    }
    if (path.endsWith("/page-1/feed")) {
      if (!feedOk) return json({ error: { message: "fail", code: 1 } }, 500);
      return json({ id: "fb-post-1" });
    }
    if (path.endsWith("/page-1/videos")) {
      if (!feedOk) return json({ error: { message: "fail", code: 1 } }, 500);
      return json({ id: "fb-video-1" });
    }
    if (path.endsWith("/page-1")) {
      return json({ id: "page-1", name: "Pagina Teste" });
    }
    if (path.endsWith("/ig-1/media_publish")) {
      return json({ id: "ig-media-1" });
    }
    if (path.endsWith("/ig-1/media")) {
      return json({ id: "ig-container-1", uri: "https://rupload.example/ig-container-1" });
    }
    if (path.endsWith("/ig-1")) {
      return json({ id: "ig-1", username: "ig_teste", name: "IG Teste" });
    }
    if (path.includes("ig-container-1") || raw.startsWith("https://rupload.example")) {
      if (raw.startsWith("https://rupload.example")) return new Response(null, { status: 200 });
      const status = typeof options.igStatus === "function" ? options.igStatus() : (options.igStatus ?? "FINISHED");
      if (status === "ERROR") return json({ status_code: "ERROR" });
      return json({ status_code: status, id: "ig-container-1" });
    }
    if (path.includes("/permissions")) return json({ success: true });
    return json({ error: { message: "not found" } }, 404);
  });
}

describe("phase 10 meta", { concurrency: false }, () => {
  const stamp = Date.now();
  const emails: string[] = [];
  let agent: Agent;
  const original = {
    appId: env.META_APP_ID,
    appSecret: env.META_APP_SECRET,
    redirect: env.META_REDIRECT_URI,
  };

  before(async () => {
    await prisma.$connect();
    agent = createAgent();
  });

  after(async () => {
    env.META_APP_ID = original.appId;
    env.META_APP_SECRET = original.appSecret;
    env.META_REDIRECT_URI = original.redirect;
    resetMetaFetch();
    if (emails.length) await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it("requires auth and returns OAUTH_NOT_CONFIGURED", async () => {
    env.META_APP_ID = "";
    env.META_APP_SECRET = "";
    env.META_REDIRECT_URI = "";
    const unauth = await agent.request("GET", "/api/integrations/meta/connect?json=1");
    assert.equal(unauth.status, 401);

    const email = `meta.a.${stamp}@example.com`;
    emails.push(email);
    const alpha = await register(agent, email);
    const missing = await agent.request("GET", "/api/integrations/meta/connect?json=1", undefined, alpha.token);
    assert.equal(missing.status, 501);
    assert.equal((missing.json.error as { code: string }).code, "OAUTH_NOT_CONFIGURED");
    assertNoSecrets(missing.json);
  });

  it("rejects invalid state and invalid callback", async () => {
    const email = `meta.b.${stamp}@example.com`;
    emails.push(email);
    await register(agent, email);
    const invalidState = await agent.request("GET", "/api/integrations/meta/callback?code=abc&state=bad&json=1");
    assert.equal(invalidState.status, 400);
    assert.equal((invalidState.json.error as { code: string }).code, "OAUTH_STATE_INVALID");

    const invalidCallback = await agent.request("GET", "/api/integrations/meta/callback?json=1");
    assert.equal(invalidCallback.status, 400);
    assert.equal((invalidCallback.json.error as { code: string }).code, "OAUTH_CALLBACK_FAILED");
    assertNoSecrets(invalidCallback.json);
  });

  it("connects facebook and instagram with mocked oauth and never returns tokens", async () => {
    env.META_APP_ID = "app-id";
    env.META_APP_SECRET = "app-secret";
    env.META_REDIRECT_URI = "http://localhost:3001/api/integrations/meta/callback";
    mockMeta();

    const email = `meta.c.${stamp}@example.com`;
    emails.push(email);
    const alpha = await register(agent, email);
    const connect = await agent.request("GET", "/api/integrations/meta/connect?json=1", undefined, alpha.token);
    assert.equal(connect.status, 200);
    const url = (connect.json.data as { authorizationUrl: string }).authorizationUrl;
    assert.match(url, /facebook\.com/);
    assert.match(url, /state=/);
    assert.match(url, /pages_manage_posts/);
    assertNoSecrets(connect.json);

    const state = new URL(url).searchParams.get("state");
    assert.ok(state);
    const callback = await agent.request(
      "GET",
      `/api/integrations/meta/callback?code=ok&state=${encodeURIComponent(state)}&json=1`,
    );
    assert.equal(callback.status, 200);
    const account = callback.json.data as { platform: string; status: string; displayName: string };
    assert.equal(account.platform, "FACEBOOK");
    assert.equal(account.status, "CONNECTED");
    assert.equal(account.displayName, "Pagina Teste");
    assertNoSecrets(callback.json);

    const listed = await agent.request("GET", "/api/integrations", undefined, alpha.token);
    assertNoSecrets(listed.json);
    const items = listed.json.data as Array<{ platform: string; status: string; displayName: string | null }>;
    const facebook = items.find((item) => item.platform === "FACEBOOK");
    const instagram = items.find((item) => item.platform === "INSTAGRAM");
    assert.equal(facebook?.status, "CONNECTED");
    assert.equal(instagram?.status, "CONNECTED");
    assert.equal(instagram?.displayName, "IG Teste");
  });

  it("isolates connected accounts, adapters and disconnects credentials", async () => {
    const alpha = await register(agent, `meta.d.${stamp}@example.com`);
    const beta = await register(agent, `meta.e.${stamp}@example.com`);
    emails.push(`meta.d.${stamp}@example.com`, `meta.e.${stamp}@example.com`);

    const alphaAccount = await prisma.connectedAccount.create({
      data: {
        userId: alpha.user.id,
        platform: "FACEBOOK",
        status: "CONNECTED",
        displayName: "Alpha FB",
        accessToken: encryptSecret("alpha-fb"),
        refreshToken: encryptSecret("alpha-refresh"),
      },
    });
    const betaAccount = await prisma.connectedAccount.create({
      data: {
        userId: beta.user.id,
        platform: "FACEBOOK",
        status: "CONNECTED",
        displayName: "Beta FB",
        accessToken: encryptSecret("beta-fb"),
      },
    });

    const stolen = await agent.request("GET", `/api/integrations/${betaAccount.id}`, undefined, alpha.token);
    assert.equal(stolen.status, 404);

    assert.equal(getPlatformAdapter("FACEBOOK") instanceof FacebookPlatformAdapter, true);
    assert.equal(getPlatformAdapter("INSTAGRAM") instanceof InstagramPlatformAdapter, true);
    assert.equal(getPlatformAdapter("YOUTUBE") instanceof YouTubePlatformAdapter, true);
    assert.equal(getPlatformAdapter("TIKTOK") instanceof TikTokPlatformAdapter, true);
    assert.equal(getPlatformAdapter("YOUTUBE") instanceof FacebookPlatformAdapter, false);
    assert.equal(getPlatformAdapter("WHATSAPP") instanceof FacebookPlatformAdapter, false);

    mockMeta();
    const disconnected = await agent.request("POST", `/api/integrations/${alphaAccount.id}/disconnect`, {}, alpha.token);
    assert.equal(disconnected.status, 200);
    assert.equal((disconnected.json.data as { status: string }).status, "DISCONNECTED");
    assertNoSecrets(disconnected.json);
    const stored = await prisma.connectedAccount.findUnique({ where: { id: alphaAccount.id } });
    assert.equal(stored?.accessToken, null);
    assert.equal(stored?.refreshToken, null);
  });

  it("rejects other users publications and unapproved content", async () => {
    const alpha = await register(agent, `meta.f.${stamp}@example.com`);
    const beta = await register(agent, `meta.g.${stamp}@example.com`);
    emails.push(`meta.f.${stamp}@example.com`, `meta.g.${stamp}@example.com`);
    const content = await prisma.content.create({
      data: { userId: alpha.user.id, title: "Post Alpha", kind: "POST", status: "DRAFT" },
    });
    const publication = await prisma.publication.create({
      data: {
        userId: alpha.user.id,
        contentId: content.id,
        platform: "FACEBOOK",
        scheduledAt: new Date(Date.now() + 3600_000),
        status: "SCHEDULED",
      },
    });
    const stolen = await agent.request("POST", `/api/publications/${publication.id}/publish`, {}, beta.token);
    assert.equal(stolen.status, 404);

    await assert.rejects(() => executePublication(publication.id, alpha.user.id), (error: { code?: string }) => {
      assert.equal(error.code, "PUBLICATION_NOT_READY");
      return true;
    });
  });

  it("rejects unsupported instagram accounts", async () => {
    env.META_APP_ID = "app-id";
    env.META_APP_SECRET = "app-secret";
    env.META_REDIRECT_URI = "http://localhost:3001/api/integrations/meta/callback";
    mockMeta();
    const alpha = await register(agent, `meta.h.${stamp}@example.com`);
    emails.push(`meta.h.${stamp}@example.com`);
    const account = await prisma.connectedAccount.create({
      data: {
        userId: alpha.user.id,
        platform: "INSTAGRAM",
        status: "CONNECTED",
        accessToken: encryptSecret("token"),
        refreshToken: encryptSecret("refresh"),
        tokenExpiresAt: new Date(Date.now() + 3600_000),
        metadata: { reason: "INSTAGRAM_ACCOUNT_NOT_SUPPORTED" },
      },
    });
    const content = await prisma.content.create({
      data: { userId: alpha.user.id, title: "IG", kind: "VIDEO", status: "SCHEDULED", videoPath: null },
    });
    const publication = await prisma.publication.create({
      data: {
        userId: alpha.user.id,
        contentId: content.id,
        connectedAccountId: account.id,
        platform: "INSTAGRAM",
        scheduledAt: new Date(Date.now() - 1000),
        status: "SCHEDULED",
      },
    });
    await assert.rejects(() => executePublication(publication.id, alpha.user.id), (error: { code?: string }) => {
      assert.equal(error.code, "INSTAGRAM_ACCOUNT_NOT_SUPPORTED");
      return true;
    });
    const failed = await prisma.publication.findUnique({ where: { id: publication.id } });
    assert.equal(failed?.status, "FAILED");
    assert.equal(failed?.errorMessage, "INSTAGRAM_ACCOUNT_NOT_SUPPORTED");
  });

  it("marks FAILED on Meta API error, PENDING while processing and PUBLISHED on confirm", async () => {
    env.META_APP_ID = "app-id";
    env.META_APP_SECRET = "app-secret";
    env.META_REDIRECT_URI = "http://localhost:3001/api/integrations/meta/callback";
    mockMeta({ feedOk: false });
    const alpha = await register(agent, `meta.i.${stamp}@example.com`);
    emails.push(`meta.i.${stamp}@example.com`);
    const facebook = await prisma.connectedAccount.create({
      data: {
        userId: alpha.user.id,
        platform: "FACEBOOK",
        status: "CONNECTED",
        externalAccountId: "page-1",
        accessToken: encryptSecret("page-token"),
        refreshToken: encryptSecret("user-token"),
        tokenExpiresAt: new Date(Date.now() + 3600_000),
        metadata: { pageId: "page-1", igUserId: "ig-1" },
      },
    });
    const instagram = await prisma.connectedAccount.create({
      data: {
        userId: alpha.user.id,
        platform: "INSTAGRAM",
        status: "CONNECTED",
        externalAccountId: "ig-1",
        accessToken: encryptSecret("page-token"),
        refreshToken: encryptSecret("user-token"),
        tokenExpiresAt: new Date(Date.now() + 3600_000),
        metadata: { pageId: "page-1", igUserId: "ig-1" },
      },
    });
    const post = await prisma.content.create({
      data: { userId: alpha.user.id, title: "FB post", body: "texto", kind: "POST", status: "SCHEDULED" },
    });
    const failPub = await prisma.publication.create({
      data: {
        userId: alpha.user.id,
        contentId: post.id,
        connectedAccountId: facebook.id,
        platform: "FACEBOOK",
        scheduledAt: new Date(Date.now() - 1000),
        status: "SCHEDULED",
      },
    });
    await assert.rejects(() => executePublication(failPub.id, alpha.user.id), (error: { code?: string }) => {
      assert.equal(error.code, "FACEBOOK_PUBLISH_FAILED");
      return true;
    });
    const failed = await prisma.publication.findUnique({ where: { id: failPub.id } });
    assert.equal(failed?.status, "FAILED");
    assert.equal(failed?.publishedAt, null);

    mockMeta({ feedOk: true });
    await prisma.content.update({ where: { id: post.id }, data: { status: "SCHEDULED" } });
    const okFb = await prisma.publication.create({
      data: {
        userId: alpha.user.id,
        contentId: post.id,
        connectedAccountId: facebook.id,
        platform: "FACEBOOK",
        scheduledAt: new Date(Date.now() - 1000),
        status: "SCHEDULED",
      },
    });
    const publishedFb = await executePublication(okFb.id, alpha.user.id);
    assert.equal(publishedFb.status, "PUBLISHED");
    assert.equal(publishedFb.externalId, "fb-post-1");

    const storedVideo = await saveUserVideo(alpha.user.id, "clip.mp4", Buffer.from("fake-mp4-bytes"));
    const reel = await prisma.content.create({
      data: {
        userId: alpha.user.id,
        title: "IG reel",
        body: "caption",
        kind: "VIDEO",
        status: "SCHEDULED",
        videoPath: `${alpha.user.id}/${storedVideo.storedName}`,
        videoFileName: storedVideo.originalName,
      },
    });
    mockMeta({ igStatus: "IN_PROGRESS" });
    const processingPub = await prisma.publication.create({
      data: {
        userId: alpha.user.id,
        contentId: reel.id,
        connectedAccountId: instagram.id,
        platform: "INSTAGRAM",
        scheduledAt: new Date(Date.now() - 1000),
        status: "SCHEDULED",
      },
    });
    const pending = await executePublication(processingPub.id, alpha.user.id);
    assert.equal(pending.status, "PENDING");
    assert.equal(pending.externalId, "ig-container-1");
    const storedPending = await prisma.publication.findUnique({ where: { id: processingPub.id } });
    assert.equal(storedPending?.status, "PENDING");
    assert.equal(storedPending?.errorMessage, "INSTAGRAM_PROCESSING");
    assert.equal(storedPending?.publishedAt, null);

    mockMeta({ igStatus: "FINISHED" });
    const publishedIg = await executePublication(processingPub.id, alpha.user.id);
    assert.equal(publishedIg.status, "PUBLISHED");
    assert.equal(publishedIg.externalId, "ig-media-1");
    const storedIg = await prisma.publication.findUnique({ where: { id: processingPub.id } });
    assert.equal(storedIg?.status, "PUBLISHED");
    assert.ok(storedIg?.publishedAt);
  });
});
