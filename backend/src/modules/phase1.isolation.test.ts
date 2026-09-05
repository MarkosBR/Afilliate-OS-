import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../app.js";

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
  const data = response.json.data as { token: string; user: { id: string } };
  return data;
}

describe("phase 1 auth and isolation", () => {
  const stamp = Date.now();
  const emails = [`alpha.${stamp}@example.com`, `beta.${stamp}@example.com`];
  let agent: Agent;

  before(async () => {
    await prisma.$connect();
    agent = createAgent();
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it("registers, logs in, and isolates products between users", async () => {
    const alpha = await register(agent, emails[0]);
    const beta = await register(agent, emails[1]);

    const created = await agent.request(
      "POST",
      "/api/products",
      {
        name: "Produto Alpha",
        description: "Somente do usuario A",
        platform: "HOTMART",
        externalId: "ext-1",
        affiliateUrl: "https://hotmart.com/alpha",
        commission: 50,
        status: "ACTIVE",
      },
      alpha.token,
    );
    assert.equal(created.status, 201);
    const product = created.json.data as { id: string };

    const listBeta = await agent.request("GET", "/api/products", undefined, beta.token);
    assert.equal(listBeta.status, 200);
    assert.deepEqual(listBeta.json.data, []);

    const forbidden = await agent.request("GET", `/api/products/${product.id}`, undefined, beta.token);
    assert.equal(forbidden.status, 404);

    const unauth = await agent.request("GET", "/api/products");
    assert.equal(unauth.status, 401);

    const login = await agent.request("POST", "/api/auth/login", {
      email: emails[0],
      password: "password1",
    });
    assert.equal(login.status, 200);
  });
});
