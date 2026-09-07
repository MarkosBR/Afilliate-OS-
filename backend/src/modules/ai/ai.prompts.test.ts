import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContentPrompt, parseGeneratedJson } from "./ai.prompts.js";

describe("ai prompts", () => {
  it("builds a prompt with real product data only", () => {
    const prompt = buildContentPrompt({
      kind: "POST",
      tone: "professional",
      productName: "Curso Alpha",
      productDescription: "Aulas reais de marketing",
      productPlatform: "HOTMART",
      campaignName: "Lancamento Q1",
      campaignDescription: "Campanha interna",
    });
    assert.match(prompt, /Curso Alpha/);
    assert.match(prompt, /Aulas reais de marketing/);
    assert.match(prompt, /Lancamento Q1/);
    assert.doesNotMatch(prompt, /fake product/i);
  });

  it("parses fenced json from the provider", () => {
    const parsed = parseGeneratedJson(`\`\`\`json
{"title":"Titulo","body":"Corpo do conteudo","titles":["A","B","C"],"description":"Resumo"}
\`\`\``);
    assert.equal(parsed.title, "Titulo");
    assert.equal(parsed.body, "Corpo do conteudo");
    assert.deepEqual(parsed.titles, ["Titulo", "A", "B"]);
    assert.equal(parsed.description, "Resumo");
  });
});
