import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { encryptSecret } from "../../lib/secrets.js";
import { saveUserVideo } from "../../lib/media.js";
import { getPlatformAdapter } from "../publications/platform.adapter.js";
import { executePublication } from "../publications/publication.executor.js";
import { YouTubePlatformAdapter } from "./youtube.adapter.js";
import { resetYouTubeFetch, setYouTubeFetch } from "./youtube.http.js";

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

function mockGoogle(successUpload = true) {
  setYouTubeFetch(async (input, init) => {
    const body = init?.body as { destroy?: () => void } | undefined;
    if (body && typeof body.destroy === "function") body.destroy();
    const url = String(input);
    if (url.includes("oauth2.googleapis.com/token")) {
      return new Response(
        JSON.stringify({
          access_token: "ya29.mock-access",
          refresh_token: "1//mock-refresh",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("youtube/v3/channels")) {
      return new Response(
        JSON.stringify({ items: [{ id: "UCmockchannel", snippet: { title: "Canal Teste" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("upload/youtube/v3/videos") && !url.startsWith("https://upload.example")) {
      return new Response(null, { status: 200, headers: { location: "https://upload.example/resume" } });
    }
    if (url.startsWith("https://upload.example")) {
      if (!successUpload) {
        return new Response(JSON.stringify({ error: { message: "fail" } }), { status: 500 });
      }
      return new Response(JSON.stringify({ id: "yt-video-1" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("oauth2.googleapis.com/revoke")) {
      return new Response(null, { status: 200 });
    }
    return new Response("{}", { status: 404 });
  });
}

describe("phase 8 youtube", { concurrency: false }, () => {
  const stamp = Date.now();
  const emails: string[] = [];
  let agent: Agent;
  const original = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirect: env.GOOGLE_REDIRECT_URI,
  };

  before(async () => {
    await prisma.$connect();
    agent = createAgent();
  });

  after(async () => {
    env.GOOGLE_CLIENT_ID = original.clientId;
    env.GOOGLE_CLIENT_SECRET = original.clientSecret;
    env.GOOGLE_REDIRECT_URI = original.redirect;
    resetYouTubeFetch();
    if (emails.length) await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it("requires auth and returns OAUTH_NOT_CONFIGURED", async () => {
    env.GOOGLE_CLIENT_ID = "";
    env.GOOGLE_CLIENT_SECRET = "";
    env.GOOGLE_REDIRECT_URI = "";
    const unauth = await agent.request("GET", "/api/integrations/youtube/connect?json=1");
    assert.equal(unauth.status, 401);

    const email = `yt.a.${stamp}@example.com`;
    emails.push(email);
    const alpha = await register(agent, email);
    const missing = await agent.request("GET", "/api/integrations/youtube/connect?json=1", undefined, alpha.token);
    assert.equal(missing.status, 501);
    assert.equal((missing.json.error as { code: string }).code, "OAUTH_NOT_CONFIGURED");
    assertNoSecrets(missing.json);
  });

  it("rejects invalid state and invalid callback", async () => {
    const email = `yt.b.${stamp}@example.com`;
    emails.push(email);
    await register(agent, email);
    const invalidState = await agent.request("GET", "/api/integrations/youtube/callback?code=abc&state=bad&json=1");
    assert.equal(invalidState.status, 400);
    assert.equal((invalidState.json.error as { code: string }).code, "OAUTH_STATE_INVALID");

    const invalidCallback = await agent.request("GET", "/api/integrations/youtube/callback?json=1");
    assert.equal(invalidCallback.status, 400);
    assert.equal((invalidCallback.json.error as { code: string }).code, "OAUTH_CALLBACK_FAILED");
    assertNoSecrets(invalidCallback.json);
  });

  it("connects youtube with mocked oauth and never returns tokens", async () => {
    env.GOOGLE_CLIENT_ID = "client-id";
    env.GOOGLE_CLIENT_SECRET = "client-secret";
    env.GOOGLE_REDIRECT_URI = "http://localhost:3001/api/integrations/youtube/callback";
    mockGoogle();

    const email = `yt.c.${stamp}@example.com`;
    emails.push(email);
    const alpha = await register(agent, email);
    const connect = await agent.request("GET", "/api/integrations/youtube/connect?json=1", undefined, alpha.token);
    assert.equal(connect.status, 200);
    const url = (connect.json.data as { authorizationUrl: string }).authorizationUrl;
    assert.match(url, /accounts\.google\.com/);
    assert.match(url, /state=/);
    assertNoSecrets(connect.json);

    const state = new URL(url).searchParams.get("state");
    assert.ok(state);
    const callback = await agent.request(
      "GET",
      `/api/integrations/youtube/callback?code=ok&state=${encodeURIComponent(state)}&json=1`,
    );
    assert.equal(callback.status, 200);
    const account = callback.json.data as { platform: string; status: string; displayName: string };
    assert.equal(account.platform, "YOUTUBE");
    assert.equal(account.status, "CONNECTED");
    assert.equal(account.displayName, "Canal Teste");
    assertNoSecrets(callback.json);

    const listed = await agent.request("GET", "/api/integrations", undefined, alpha.token);
    assertNoSecrets(listed.json);
  });

  it("isolates connected accounts, adapters and disconnects credentials", async () => {
    const alpha = await register(agent, `yt.d.${stamp}@example.com`);
    const beta = await register(agent, `yt.e.${stamp}@example.com`);
    emails.push(`yt.d.${stamp}@example.com`, `yt.e.${stamp}@example.com`);

    const alphaAccount = await prisma.connectedAccount.create({
      data: {
        userId: alpha.user.id,
        platform: "YOUTUBE",
        status: "CONNECTED",
        displayName: "Alpha YT",
        accessToken: encryptSecret("alpha-yt"),
        refreshToken: encryptSecret("alpha-refresh"),
      },
    });
    const betaAccount = await prisma.connectedAccount.create({
      data: {
        userId: beta.user.id,
        platform: "YOUTUBE",
        status: "CONNECTED",
        displayName: "Beta YT",
        accessToken: encryptSecret("beta-yt"),
      },
    });

    const stolen = await agent.request("GET", `/api/integrations/${betaAccount.id}`, undefined, alpha.token);
    assert.equal(stolen.status, 404);

    assert.equal(getPlatformAdapter("YOUTUBE") instanceof YouTubePlatformAdapter, true);
    assert.equal(getPlatformAdapter("INSTAGRAM") instanceof YouTubePlatformAdapter, false);

    mockGoogle();
    const disconnected = await agent.request("POST", `/api/integrations/${alphaAccount.id}/disconnect`, {}, alpha.token);
    assert.equal(disconnected.status, 200);
    assert.equal((disconnected.json.data as { status: string }).status, "DISCONNECTED");
    assertNoSecrets(disconnected.json);
    const stored = await prisma.connectedAccount.findUnique({ where: { id: alphaAccount.id } });
    assert.equal(stored?.accessToken, null);
    assert.equal(stored?.refreshToken, null);
  });

  it("rejects other users publications and unapproved content", async () => {
    const alpha = await register(agent, `yt.f.${stamp}@example.com`);
    const beta = await register(agent, `yt.g.${stamp}@example.com`);
    emails.push(`yt.f.${stamp}@example.com`, `yt.g.${stamp}@example.com`);
    const content = await prisma.content.create({
      data: { userId: alpha.user.id, title: "Video Alpha", kind: "VIDEO", status: "DRAFT" },
    });
    const publication = await prisma.publication.create({
      data: {
        userId: alpha.user.id,
        contentId: content.id,
        platform: "YOUTUBE",
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

  it("requires video, marks FAILED on API error and PUBLISHED on success", async () => {
    mockGoogle(false);
    const alpha = await register(agent, `yt.h.${stamp}@example.com`);
    emails.push(`yt.h.${stamp}@example.com`);
    const account = await prisma.connectedAccount.create({
      data: {
        userId: alpha.user.id,
        platform: "YOUTUBE",
        status: "CONNECTED",
        accessToken: encryptSecret("token"),
        refreshToken: encryptSecret("refresh"),
        tokenExpiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const noVideo = await prisma.content.create({
      data: { userId: alpha.user.id, title: "Sem video", kind: "VIDEO", status: "SCHEDULED", videoPath: null },
    });
    const pubNoVideo = await prisma.publication.create({
      data: {
        userId: alpha.user.id,
        contentId: noVideo.id,
        connectedAccountId: account.id,
        platform: "YOUTUBE",
        scheduledAt: new Date(Date.now() - 1000),
        status: "SCHEDULED",
      },
    });
    await assert.rejects(() => executePublication(pubNoVideo.id, alpha.user.id), (error: { code?: string }) => {
      assert.equal(error.code, "VIDEO_REQUIRED");
      return true;
    });
    const failedNoVideo = await prisma.publication.findUnique({ where: { id: pubNoVideo.id } });
    assert.equal(failedNoVideo?.status, "FAILED");
    assert.equal(failedNoVideo?.errorMessage, "VIDEO_REQUIRED");

    const stored = await saveUserVideo(alpha.user.id, "clip.mp4", Buffer.from("fake-mp4-bytes"));
    const withVideo = await prisma.content.create({
      data: {
        userId: alpha.user.id,
        title: "Com video",
        body: "Descricao",
        kind: "VIDEO",
        status: "SCHEDULED",
        tags: "afiliado,teste",
        videoPath: `${alpha.user.id}/${stored.storedName}`,
        videoFileName: stored.originalName,
      },
    });
    const failPub = await prisma.publication.create({
      data: {
        userId: alpha.user.id,
        contentId: withVideo.id,
        connectedAccountId: account.id,
        platform: "YOUTUBE",
        scheduledAt: new Date(Date.now() - 1000),
        status: "SCHEDULED",
      },
    });
    await assert.rejects(() => executePublication(failPub.id, alpha.user.id), (error: { code?: string }) => {
      assert.equal(error.code, "YOUTUBE_UPLOAD_FAILED");
      return true;
    });
    const failedUpload = await prisma.publication.findUnique({ where: { id: failPub.id } });
    assert.equal(failedUpload?.status, "FAILED");

    mockGoogle(true);
    await prisma.content.update({ where: { id: withVideo.id }, data: { status: "SCHEDULED" } });
    const okPub = await prisma.publication.create({
      data: {
        userId: alpha.user.id,
        contentId: withVideo.id,
        connectedAccountId: account.id,
        platform: "YOUTUBE",
        scheduledAt: new Date(Date.now() - 1000),
        status: "SCHEDULED",
      },
    });
    const published = await executePublication(okPub.id, alpha.user.id);
    assert.equal(published.status, "PUBLISHED");
    assert.equal(published.externalId, "yt-video-1");
    const storedPub = await prisma.publication.findUnique({ where: { id: okPub.id } });
    assert.equal(storedPub?.status, "PUBLISHED");
    assert.equal(storedPub?.externalId, "yt-video-1");
    assert.ok(storedPub?.publishedAt);
  });
});
