import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";

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

async function createProduct(agent: Agent, token: string, name: string) {
  const created = await agent.request(
    "POST",
    "/api/products",
    {
      name,
      description: "Descricao real do produto",
      platform: "HOTMART",
      affiliateUrl: "https://hotmart.com/produto",
      commission: 40,
    },
    token,
  );
  assert.equal(created.status, 201);
  return created.json.data as { id: string; name: string };
}

describe("phase 5 content and ai", { concurrency: false }, () => {
  const stamp = Date.now();
  const emails = [`content.a.${stamp}@example.com`, `content.b.${stamp}@example.com`];
  let agent: Agent;
  const originalProvider = env.AI_PROVIDER;
  const originalKey = env.AI_API_KEY;
  const originalFetch = globalThis.fetch;

  before(async () => {
    await prisma.$connect();
    agent = createAgent();
  });

  after(async () => {
    env.AI_PROVIDER = originalProvider;
    env.AI_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  it("isolates content crud and validates payloads", async () => {
    const alpha = await register(agent, emails[0]);
    const beta = await register(agent, emails[1]);
    const product = await createProduct(agent, alpha.token, "Produto Conteudo");

    const unauth = await agent.request("GET", "/api/content");
    assert.equal(unauth.status, 401);

    const invalid = await agent.request("POST", "/api/content", { title: "A" }, alpha.token);
    assert.equal(invalid.status, 400);

    const created = await agent.request(
      "POST",
      "/api/content",
      {
        productId: product.id,
        title: "Post manual",
        body: "Texto do afiliado",
        kind: "POST",
        status: "DRAFT",
      },
      alpha.token,
    );
    assert.equal(created.status, 201);
    const content = created.json.data as { id: string; userId: string; status: string; source: string };
    assert.equal(content.userId, alpha.user.id);
    assert.equal(content.status, "DRAFT");
    assert.equal(content.source, "MANUAL");

    const listBeta = await agent.request("GET", "/api/content", undefined, beta.token);
    assert.equal(listBeta.status, 200);
    assert.deepEqual(listBeta.json.data, []);

    const forbidden = await agent.request("GET", `/api/content/${content.id}`, undefined, beta.token);
    assert.equal(forbidden.status, 404);

    const updated = await agent.request(
      "PATCH",
      `/api/content/${content.id}`,
      { title: "Post editado", status: "DRAFT" },
      alpha.token,
    );
    assert.equal(updated.status, 200);

    const removed = await agent.request("DELETE", `/api/content/${content.id}`, undefined, alpha.token);
    assert.equal(removed.status, 200);
  });

  it("requires auth and a configured provider for generation", async () => {
    env.AI_PROVIDER = "";
    env.AI_API_KEY = "";
    const unauth = await agent.request("POST", "/api/ai/generate", {
      productId: "x",
      kind: "POST",
      tone: "professional",
    });
    assert.equal(unauth.status, 401);

    const alpha = await register(agent, `content.ai.${stamp}@example.com`);
    emails.push(`content.ai.${stamp}@example.com`);
    const product = await createProduct(agent, alpha.token, "Produto IA");

    const unconfigured = await agent.request(
      "POST",
      "/api/ai/generate",
      { productId: product.id, kind: "POST", tone: "professional" },
      alpha.token,
    );
    assert.equal(unconfigured.status, 503);
    assert.equal((unconfigured.json.error as { code: string }).code, "AI_NOT_CONFIGURED");

    env.AI_PROVIDER = "openai";
    env.AI_API_KEY = "test-key";
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("api.openai.com")) {
        return new Response("fail", { status: 500 });
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    const providerError = await agent.request(
      "POST",
      "/api/ai/generate",
      { productId: product.id, kind: "CAPTION", tone: "casual" },
      alpha.token,
    );
    assert.equal(providerError.status, 502);
    assert.equal((providerError.json.error as { code: string }).code, "AI_PROVIDER_ERROR");

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("api.openai.com")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: "Titulo gerado",
                    body: `Conteudo sobre ${product.name}`,
                    titles: ["Opcao 1", "Opcao 2", "Opcao 3"],
                    description: "Resumo gerado",
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    const success = await agent.request(
      "POST",
      "/api/ai/generate",
      { productId: product.id, kind: "AD", tone: "persuasive" },
      alpha.token,
    );
    assert.equal(success.status, 200);
    const data = success.json.data as { title: string; body: string; provider: string; titles: string[] };
    assert.equal(data.provider, "openai");
    assert.equal(data.title, "Titulo gerado");
    assert.match(data.body, /Produto IA/);
    assert.equal(data.titles.length, 3);

    const saved = await agent.request(
      "POST",
      "/api/content",
      {
        productId: product.id,
        title: data.title,
        body: data.body,
        kind: "AD",
        source: "AI",
        generatedBy: data.provider,
        status: "DRAFT",
      },
      alpha.token,
    );
    assert.equal(saved.status, 201);
    const savedContent = saved.json.data as { status: string; source: string; generatedBy: string };
    assert.equal(savedContent.status, "DRAFT");
    assert.equal(savedContent.source, "AI");
    assert.equal(savedContent.generatedBy, "openai");
  });
});
