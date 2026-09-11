import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { encryptSecret } from "../../lib/secrets.js";
import { serializeConnectedAccount } from "../../lib/serializers.js";
import { executeDuePublications } from "../publications/publication.executor.js";
import { getPlatformAdapter } from "../publications/platform.adapter.js";

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
        return { status: response.status, json };
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

describe("phase 7 integrations", { concurrency: false }, () => {
  const stamp = Date.now();
  const emails = [`int.a.${stamp}@example.com`, `int.b.${stamp}@example.com`];
  let agent: Agent;

  before(async () => {
    await prisma.$connect();
    agent = createAgent();
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it("requires auth and never returns tokens", async () => {
    const unauth = await agent.request("GET", "/api/integrations");
    assert.equal(unauth.status, 401);

    const email = `int.list.${stamp}@example.com`;
    emails.push(email);
    const alpha = await register(agent, email);
    const listed = await agent.request("GET", "/api/integrations", undefined, alpha.token);
    assert.equal(listed.status, 200);
    assert.deepEqual(listed.json.data, []);
    assertNoSecrets(listed.json);
  });

  it("rejects invalid platforms and unimplemented oauth", async () => {
    const alpha = await register(agent, `int.c.${stamp}@example.com`);
    emails.push(`int.c.${stamp}@example.com`);

    const invalid = await agent.request("POST", "/api/integrations/OTHER/connect", {}, alpha.token);
    assert.equal(invalid.status, 400);

    const connect = await agent.request("POST", "/api/integrations/INSTAGRAM/connect", {}, alpha.token);
    assert.equal(connect.status, 501);
    assert.equal((connect.json.error as { code: string }).code, "OAUTH_NOT_CONFIGURED");
    assertNoSecrets(connect.json);

    const listed = await agent.request("GET", "/api/integrations", undefined, alpha.token);
    assert.equal(listed.status, 200);
    const items = listed.json.data as Array<{ id: string; platform: string; status: string }>;
    assert.equal(items.length, 1);
    assert.equal(items[0].platform, "INSTAGRAM");
    assert.equal(items[0].status, "DISCONNECTED");
    assertNoSecrets(listed.json);

    const got = await agent.request("GET", `/api/integrations/${items[0].id}`, undefined, alpha.token);
    assert.equal(got.status, 200);
    assertNoSecrets(got.json);
  });

  it("isolates accounts and wipes credentials on disconnect", async () => {
    const alpha = await register(agent, emails[0]);
    const beta = await register(agent, emails[1]);

    const alphaAccount = await prisma.connectedAccount.create({
      data: {
        userId: alpha.user.id,
        platform: "FACEBOOK",
        status: "CONNECTED",
        displayName: "Alpha Facebook",
        accessToken: encryptSecret("alpha-access"),
        refreshToken: encryptSecret("alpha-refresh"),
      },
    });
    const betaAccount = await prisma.connectedAccount.create({
      data: {
        userId: beta.user.id,
        platform: "FACEBOOK",
        status: "CONNECTED",
        displayName: "Beta Facebook",
        accessToken: encryptSecret("beta-access"),
        refreshToken: encryptSecret("beta-refresh"),
      },
    });

    const alphaList = await agent.request("GET", "/api/integrations", undefined, alpha.token);
    const alphaItems = alphaList.json.data as Array<{ id: string; platform: string }>;
    assert.equal(alphaItems.some((item) => item.id === betaAccount.id), false);
    assertNoSecrets(alphaList.json);

    const stolenGet = await agent.request("GET", `/api/integrations/${betaAccount.id}`, undefined, alpha.token);
    assert.equal(stolenGet.status, 404);

    const stolenDisconnect = await agent.request(
      "POST",
      `/api/integrations/${betaAccount.id}/disconnect`,
      {},
      alpha.token,
    );
    assert.equal(stolenDisconnect.status, 404);

    const disconnected = await agent.request(
      "POST",
      `/api/integrations/${alphaAccount.id}/disconnect`,
      {},
      alpha.token,
    );
    assert.equal(disconnected.status, 200);
    const payload = disconnected.json.data as { status: string; displayName: string | null };
    assert.equal(payload.status, "DISCONNECTED");
    assert.equal(payload.displayName, null);
    assertNoSecrets(disconnected.json);

    const stored = await prisma.connectedAccount.findUnique({ where: { id: alphaAccount.id } });
    assert.equal(stored?.accessToken, null);
    assert.equal(stored?.refreshToken, null);
    assert.equal(stored?.status, "DISCONNECTED");
  });

  it("blocks scheduling with another users connected account", async () => {
    const alpha = await register(agent, `int.d.${stamp}@example.com`);
    const beta = await register(agent, `int.e.${stamp}@example.com`);
    emails.push(`int.d.${stamp}@example.com`, `int.e.${stamp}@example.com`);

    const betaAccount = await prisma.connectedAccount.create({
      data: {
        userId: beta.user.id,
        platform: "INSTAGRAM",
        status: "CONNECTED",
        accessToken: encryptSecret("beta-ig"),
      },
    });

    const created = await agent.request(
      "POST",
      "/api/content",
      { title: "Peca integracao", body: "Texto", kind: "POST" },
      alpha.token,
    );
    assert.equal(created.status, 201);
    const content = created.json.data as { id: string };
    const approve = await agent.request("POST", `/api/content/${content.id}/approve`, {}, alpha.token);
    assert.equal(approve.status, 200);

    const stolen = await agent.request(
      "POST",
      `/api/content/${content.id}/schedule`,
      {
        platform: "INSTAGRAM",
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        connectedAccountId: betaAccount.id,
      },
      alpha.token,
    );
    assert.equal(stolen.status, 403);
    assert.equal((stolen.json.error as { code: string }).code, "UNAUTHORIZED_INTEGRATION");
  });

  it("keeps adapter registry unimplemented and executor without real send", async () => {
    assert.throws(() => getPlatformAdapter("OTHER"), /Invalid integration platform/);
    const adapter = getPlatformAdapter("INSTAGRAM");
    await assert.rejects(() => adapter.publish({
      publicationId: "x",
      contentId: "y",
      platform: "INSTAGRAM",
      scheduledAt: new Date(),
    }));
    assert.equal(getPlatformAdapter("YOUTUBE").platform, "YOUTUBE");
    assert.equal(getPlatformAdapter("TIKTOK").platform, "TIKTOK");

    const serialized = serializeConnectedAccount({
      id: "acc",
      userId: "user",
      platform: "FACEBOOK",
      externalAccountId: "ext",
      displayName: "Page",
      status: "CONNECTED",
      scopes: ["pages"],
      accessToken: "secret-access",
      refreshToken: "secret-refresh",
      tokenExpiresAt: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    assert.equal("accessToken" in serialized, false);
    assert.equal("refreshToken" in serialized, false);

    const alpha = await register(agent, `int.f.${stamp}@example.com`);
    emails.push(`int.f.${stamp}@example.com`);
    const content = await prisma.content.create({
      data: {
        userId: alpha.user.id,
        title: "Due",
        body: "Ready",
        kind: "POST",
        status: "SCHEDULED",
      },
    });
    const publication = await prisma.publication.create({
      data: {
        userId: alpha.user.id,
        contentId: content.id,
        platform: "INSTAGRAM",
        scheduledAt: new Date(Date.now() - 60_000),
        status: "SCHEDULED",
      },
    });
    const results = await executeDuePublications(new Date(), alpha.user.id);
    const match = results.find((item) => item.id === publication.id);
    assert.equal(match?.status, "FAILED");
    const updated = await prisma.publication.findUnique({ where: { id: publication.id } });
    assert.equal(updated?.status, "FAILED");
    assert.equal(updated?.publishedAt, null);
  });
});
