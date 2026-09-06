import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";

const prisma = new PrismaClient();

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

describe("phase 2 admin authorization", () => {
  const stamp = Date.now();
  const emails = [`admin.${stamp}@example.com`, `user.${stamp}@example.com`];
  const agent = createAgent();

  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it("blocks USER from admin and allows ADMIN with logs", async () => {
    const userRes = await agent.request("POST", "/api/auth/register", {
      name: "User",
      email: emails[1],
      password: "password1",
      confirmPassword: "password1",
    });
    assert.equal(userRes.status, 201);
    const userToken = (userRes.json.data as { token: string }).token;

    const forbidden = await agent.request("GET", "/api/admin/dashboard", undefined, userToken);
    assert.equal(forbidden.status, 403);

    const adminRes = await agent.request("POST", "/api/auth/register", {
      name: "Admin",
      email: emails[0],
      password: "password1",
      confirmPassword: "password1",
    });
    assert.equal(adminRes.status, 201);
    const adminId = (adminRes.json.data as { user: { id: string } }).user.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });

    const login = await agent.request("POST", "/api/auth/login", {
      email: emails[0],
      password: "password1",
    });
    assert.equal(login.status, 200);
    const adminToken = (login.json.data as { token: string }).token;

    const dashboard = await agent.request("GET", "/api/admin/dashboard", undefined, adminToken);
    assert.equal(dashboard.status, 200);

    const userId = (userRes.json.data as { user: { id: string } }).user.id;
    const patched = await agent.request(
      "PATCH",
      `/api/admin/users/${userId}`,
      { status: "SUSPENDED" },
      adminToken,
    );
    assert.equal(patched.status, 200);

    const rolePatch = await agent.request(
      "PATCH",
      `/api/admin/users/${userId}`,
      { role: "ADMIN" },
      adminToken,
    );
    assert.equal(rolePatch.status, 200);

    const logs = await agent.request("GET", "/api/admin/logs", undefined, adminToken);
    assert.equal(logs.status, 200);
    const items = (logs.json.data as { items: Array<{ action: string }> }).items;
    assert.ok(items.some((item) => item.action === "ADMIN_LOGIN"));
    assert.ok(items.some((item) => item.action === "USER_SUSPENDED"));
    assert.ok(items.some((item) => item.action === "USER_ROLE_CHANGED"));
  });
});
