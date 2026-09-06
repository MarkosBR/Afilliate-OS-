import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";

const prisma = new PrismaClient();

function createAgent() {
  const app = createApp();
  return {
    async request(method: string, path: string, body?: unknown, token?: string, extra?: HeadersInit) {
      const server = app.listen(0);
      await new Promise<void>((resolve) => server.once("listening", () => resolve()));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No address");
      const headers: Record<string, string> = { "content-type": "application/json", ...(extra as Record<string, string>) };
      if (token) headers.authorization = `Bearer ${token}`;
      try {
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          redirect: "manual",
        });
        const contentType = response.headers.get("content-type") ?? "";
        const json = contentType.includes("application/json")
          ? ((await response.json()) as Record<string, unknown>)
          : {};
        return { status: response.status, json, location: response.headers.get("location") };
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    },
  };
}

describe("phase 3 link tracking", () => {
  const stamp = Date.now();
  const emails = [`track.a.${stamp}@example.com`, `track.b.${stamp}@example.com`, `track.admin.${stamp}@example.com`];
  const agent = createAgent();
  const slug = `produto-${stamp}`;

  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it("tracks public clicks, isolates users, and keeps admin gated", async () => {
    const a = await agent.request("POST", "/api/auth/register", {
      name: "Alpha",
      email: emails[0],
      password: "password1",
      confirmPassword: "password1",
    });
    assert.equal(a.status, 201);
    const aToken = (a.json.data as { token: string }).token;
    const aUserId = (a.json.data as { user: { id: string } }).user.id;

    const b = await agent.request("POST", "/api/auth/register", {
      name: "Beta",
      email: emails[1],
      password: "password1",
      confirmPassword: "password1",
    });
    assert.equal(b.status, 201);
    const bToken = (b.json.data as { token: string }).token;

    const product = await agent.request(
      "POST",
      "/api/products",
      {
        name: "Produto Track",
        platform: "HOTMART",
        affiliateUrl: "https://hotmart.com/produto-track",
        commission: 40,
        status: "ACTIVE",
      },
      aToken,
    );
    assert.equal(product.status, 201);
    const productId = (product.json.data as { id: string }).id;

    const created = await agent.request(
      "POST",
      "/api/links",
      { productId, name: "Link Track", slug, url: "https://hotmart.com/produto-track" },
      aToken,
    );
    assert.equal(created.status, 201);
    const link = created.json.data as { id: string; slug: string; trackUrl: string; clicks: number };
    assert.equal(link.slug, slug);
    assert.equal(link.trackUrl, `/go/${slug}`);
    assert.equal(link.clicks, 0);

    const duplicate = await agent.request(
      "POST",
      "/api/links",
      { productId, name: "Outro", slug },
      aToken,
    );
    assert.equal(duplicate.status, 409);

    const isolated = await agent.request("GET", `/api/links/${link.id}`, undefined, bToken);
    assert.equal(isolated.status, 404);

    const missing = await agent.request("GET", "/go/nao-existe");
    assert.equal(missing.status, 404);

    const hit = await agent.request(
      "GET",
      `/go/${slug}?utm_source=tiktok&utm_medium=bio&utm_campaign=launch`,
      undefined,
      undefined,
      { referer: "https://tiktok.com/@page" },
    );
    assert.equal(hit.status, 302);
    assert.equal(hit.location, "https://hotmart.com/produto-track");

    const replay = await agent.request(
      "GET",
      `/go/${slug}?utm_source=tiktok&utm_medium=bio&utm_campaign=launch`,
      undefined,
      undefined,
      { referer: "https://tiktok.com/@page" },
    );
    assert.equal(replay.status, 302);

    const stats = await agent.request("GET", `/api/links/${link.id}/stats`, undefined, aToken);
    assert.equal(stats.status, 200);
    const statsData = stats.json.data as { clicks: number; recentClicks: Array<{ utmSource: string }> };
    assert.equal(statsData.clicks, 1);
    assert.equal(statsData.recentClicks[0]?.utmSource, "tiktok");

    const analytics = await agent.request("GET", "/api/analytics/breakdown?days=7", undefined, aToken);
    assert.equal(analytics.status, 200);
    const breakdown = analytics.json.data as { summary: { clicks: number } };
    assert.equal(breakdown.summary.clicks, 1);

    const paused = await agent.request("PATCH", `/api/links/${link.id}`, { status: "INACTIVE" }, aToken);
    assert.equal(paused.status, 200);
    const inactive = await agent.request("GET", `/go/${slug}`);
    assert.equal(inactive.status, 404);

    const forbidden = await agent.request("GET", "/api/admin/dashboard", undefined, aToken);
    assert.equal(forbidden.status, 403);

    const adminRes = await agent.request("POST", "/api/auth/register", {
      name: "Admin",
      email: emails[2],
      password: "password1",
      confirmPassword: "password1",
    });
    assert.equal(adminRes.status, 201);
    const adminId = (adminRes.json.data as { user: { id: string } }).user.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    const login = await agent.request("POST", "/api/auth/login", {
      email: emails[2],
      password: "password1",
    });
    const adminToken = (login.json.data as { token: string }).token;
    const dashboard = await agent.request("GET", "/api/admin/dashboard", undefined, adminToken);
    assert.equal(dashboard.status, 200);
    const adminData = dashboard.json.data as { clicks: number; activeLinks: number };
    assert.ok(adminData.clicks >= 1);
    assert.equal(typeof adminData.activeLinks, "number");
    assert.ok(aUserId);
  });
});
