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
      const headers: Record<string, string> = {
        "content-type": "application/json",
        ...(extra as Record<string, string>),
      };
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

describe("phase 4 analytics", () => {
  const stamp = Date.now();
  const emails = [`an.a.${stamp}@example.com`, `an.admin.${stamp}@example.com`];
  const agent = createAgent();
  const slug = `analytics-${stamp}`;

  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it("aggregates real clicks, filters period, and protects admin analytics", async () => {
    const register = await agent.request("POST", "/api/auth/register", {
      name: "Analyst",
      email: emails[0],
      password: "password1",
      confirmPassword: "password1",
    });
    assert.equal(register.status, 201);
    const token = (register.json.data as { token: string }).token;

    const empty = await agent.request("GET", "/api/analytics/report?range=7d", undefined, token);
    assert.equal(empty.status, 200);
    const emptyData = empty.json.data as { summary: { clicks: number; uniqueClicks: number }; series: unknown[] };
    assert.equal(emptyData.summary.clicks, 0);
    assert.equal(emptyData.summary.uniqueClicks, 0);
    assert.ok(Array.isArray(emptyData.series));

    const product = await agent.request(
      "POST",
      "/api/products",
      {
        name: "Produto Analytics",
        platform: "HOTMART",
        affiliateUrl: "https://hotmart.com/analytics",
        commission: 30,
        status: "ACTIVE",
      },
      token,
    );
    assert.equal(product.status, 201);
    const productId = (product.json.data as { id: string }).id;

    const campaign = await agent.request(
      "POST",
      "/api/campaigns",
      { productId, name: "Campanha Analytics", budget: 100, status: "ACTIVE" },
      token,
    );
    assert.equal(campaign.status, 201);
    const campaignId = (campaign.json.data as { id: string }).id;

    const created = await agent.request(
      "POST",
      "/api/links",
      { productId, campaignId, name: "Link Analytics", slug, url: "https://hotmart.com/analytics" },
      token,
    );
    assert.equal(created.status, 201);
    const linkId = (created.json.data as { id: string }).id;

    const hit = await agent.request(
      "GET",
      `/go/${slug}?utm_source=youtube&utm_medium=desc&utm_campaign=launch`,
      undefined,
      undefined,
      { referer: "https://youtube.com/watch", "user-agent": "phase4-test-agent" },
    );
    assert.equal(hit.status, 302);

    const report = await agent.request("GET", "/api/analytics/report?range=today", undefined, token);
    assert.equal(report.status, 200);
    const reportData = report.json.data as {
      summary: { clicks: number; uniqueClicks: number; topSource: string };
      series: Array<{ date: string; clicks: number }>;
      topLinks: Array<{ id: string; clicks: number }>;
      topCampaigns: Array<{ id: string; clicks: number }>;
      topSources: Array<{ label: string; count: number }>;
      topReferrers: Array<{ label: string; count: number }>;
      utmCampaigns: Array<{ label: string; count: number }>;
    };
    assert.equal(reportData.summary.clicks, 1);
    assert.equal(reportData.summary.uniqueClicks, 1);
    assert.ok(reportData.series.some((point) => point.clicks === 1));
    assert.equal(reportData.topLinks[0]?.id, linkId);
    assert.equal(reportData.topCampaigns[0]?.id, campaignId);
    assert.ok(reportData.topSources.some((item) => item.label === "youtube"));
    assert.ok(reportData.topReferrers.some((item) => item.label.includes("youtube.com")));
    assert.ok(reportData.utmCampaigns.some((item) => item.label === "launch"));

    const past = await agent.request(
      "GET",
      "/api/analytics/report?range=custom&from=2020-01-01&to=2020-01-02",
      undefined,
      token,
    );
    assert.equal(past.status, 200);
    const pastData = past.json.data as { summary: { clicks: number } };
    assert.equal(pastData.summary.clicks, 0);

    const linkAnalytics = await agent.request("GET", `/api/analytics/links/${linkId}?range=7d`, undefined, token);
    assert.equal(linkAnalytics.status, 200);
    const linkData = linkAnalytics.json.data as {
      summary: { clicks: number };
      recentClicks: Array<{ utmSource: string; referrer: string }>;
    };
    assert.equal(linkData.summary.clicks, 1);
    assert.equal(linkData.recentClicks[0]?.utmSource, "youtube");
    assert.ok(linkData.recentClicks[0]?.referrer.includes("youtube.com"));

    const campaignAnalytics = await agent.request(
      "GET",
      `/api/analytics/campaigns/${campaignId}?range=7d`,
      undefined,
      token,
    );
    assert.equal(campaignAnalytics.status, 200);
    const campaignData = campaignAnalytics.json.data as { summary: { clicks: number } };
    assert.equal(campaignData.summary.clicks, 1);

    const forbidden = await agent.request("GET", "/api/admin/analytics?range=7d", undefined, token);
    assert.equal(forbidden.status, 403);

    const adminRes = await agent.request("POST", "/api/auth/register", {
      name: "Admin",
      email: emails[1],
      password: "password1",
      confirmPassword: "password1",
    });
    const adminId = (adminRes.json.data as { user: { id: string } }).user.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    const login = await agent.request("POST", "/api/auth/login", {
      email: emails[1],
      password: "password1",
    });
    const adminToken = (login.json.data as { token: string }).token;
    const adminAnalytics = await agent.request("GET", "/api/admin/analytics?range=7d", undefined, adminToken);
    assert.equal(adminAnalytics.status, 200);
    const adminData = adminAnalytics.json.data as { summary: { clicks: number } };
    assert.ok(adminData.summary.clicks >= 1);
  });
});
