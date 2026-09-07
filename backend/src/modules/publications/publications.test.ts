import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";

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

async function createDraft(agent: Agent, token: string, title: string) {
  const created = await agent.request(
    "POST",
    "/api/content",
    { title, body: "Texto real", kind: "POST", status: "PUBLISHED" },
    token,
  );
  assert.equal(created.status, 201);
  const content = created.json.data as { id: string; status: string };
  assert.equal(content.status, "DRAFT");
  return content;
}

function futureIso(hours = 24) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

describe("phase 6 scheduling", { concurrency: false }, () => {
  const stamp = Date.now();
  const emails = [`sched.a.${stamp}@example.com`, `sched.b.${stamp}@example.com`];
  let agent: Agent;

  before(async () => {
    await prisma.$connect();
    agent = createAgent();
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it("approves, schedules, filters calendar, isolates users and cancels", async () => {
    const alpha = await register(agent, emails[0]);
    const beta = await register(agent, emails[1]);
    const draft = await createDraft(agent, alpha.token, "Peca Alpha");

    const unauth = await agent.request("GET", "/api/calendar");
    assert.equal(unauth.status, 401);

    const tooSoon = await agent.request(
      "POST",
      `/api/content/${draft.id}/schedule`,
      { platform: "INSTAGRAM", scheduledAt: futureIso(2) },
      alpha.token,
    );
    assert.equal(tooSoon.status, 400);
    assert.equal((tooSoon.json.error as { code: string }).code, "CONTENT_NOT_APPROVED");

    const approve = await agent.request("POST", `/api/content/${draft.id}/approve`, {}, alpha.token);
    assert.equal(approve.status, 200);
    assert.equal((approve.json.data as { status: string }).status, "APPROVED");

    const past = await agent.request(
      "POST",
      `/api/content/${draft.id}/schedule`,
      { platform: "INSTAGRAM", scheduledAt: new Date(Date.now() - 60_000).toISOString() },
      alpha.token,
    );
    assert.equal(past.status, 400);
    assert.equal((past.json.error as { code: string }).code, "INVALID_DATE");

    const missing = await agent.request(
      "POST",
      "/api/content/does-not-exist/schedule",
      { platform: "TIKTOK", scheduledAt: futureIso() },
      alpha.token,
    );
    assert.equal(missing.status, 404);

    const scheduledAt = futureIso(48);
    const created = await agent.request(
      "POST",
      `/api/content/${draft.id}/schedule`,
      { platform: "INSTAGRAM", scheduledAt },
      alpha.token,
    );
    assert.equal(created.status, 201);
    const publication = created.json.data as {
      id: string;
      status: string;
      platform: string;
      contentId: string;
      userId: string;
    };
    assert.equal(publication.status, "SCHEDULED");
    assert.equal(publication.platform, "INSTAGRAM");
    assert.equal(publication.contentId, draft.id);
    assert.equal(publication.userId, alpha.user.id);

    const duplicate = await agent.request(
      "POST",
      `/api/content/${draft.id}/schedule`,
      { platform: "INSTAGRAM", scheduledAt: futureIso(72) },
      alpha.token,
    );
    assert.equal(duplicate.status, 409);

    const contentAfter = await agent.request("GET", `/api/content/${draft.id}`, undefined, alpha.token);
    assert.equal((contentAfter.json.data as { status: string }).status, "SCHEDULED");

    const calendar = await agent.request(
      "GET",
      `/api/calendar?from=${encodeURIComponent(new Date().toISOString())}&to=${encodeURIComponent(futureIso(96))}&status=SCHEDULED&platform=INSTAGRAM`,
      undefined,
      alpha.token,
    );
    assert.equal(calendar.status, 200);
    const entries = calendar.json.data as Array<{ id: string; platform: string }>;
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, publication.id);

    const filteredOut = await agent.request(
      "GET",
      `/api/calendar?platform=TIKTOK&status=SCHEDULED`,
      undefined,
      alpha.token,
    );
    assert.equal(filteredOut.status, 200);
    assert.deepEqual(filteredOut.json.data, []);

    const betaCalendar = await agent.request("GET", "/api/calendar", undefined, beta.token);
    assert.equal(betaCalendar.status, 200);
    assert.deepEqual(betaCalendar.json.data, []);

    const stolen = await agent.request("GET", `/api/publications/${publication.id}`, undefined, beta.token);
    assert.equal(stolen.status, 404);

    const stealCancel = await agent.request("POST", `/api/publications/${publication.id}/cancel`, {}, beta.token);
    assert.equal(stealCancel.status, 404);

    const got = await agent.request("GET", `/api/publications/${publication.id}`, undefined, alpha.token);
    assert.equal(got.status, 200);
    assert.equal((got.json.data as { status: string }).status, "SCHEDULED");

    const cancelled = await agent.request("POST", `/api/publications/${publication.id}/cancel`, {}, alpha.token);
    assert.equal(cancelled.status, 200);
    assert.equal((cancelled.json.data as { status: string }).status, "CANCELLED");

    const contentReopened = await agent.request("GET", `/api/content/${draft.id}`, undefined, alpha.token);
    assert.equal((contentReopened.json.data as { status: string }).status, "APPROVED");

    const rejected = await agent.request("POST", `/api/content/${draft.id}/reject`, {}, alpha.token);
    assert.equal(rejected.status, 200);
    assert.equal((rejected.json.data as { status: string }).status, "DRAFT");
  });
});
