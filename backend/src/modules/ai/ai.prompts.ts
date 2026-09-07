import type { ContentKind, GenerateContentInput } from "./ai.types.js";

const KIND_INSTRUCTIONS: Record<ContentKind, string> = {
  POST: "Write a social media post that promotes the product and invites the reader to click the affiliate link. Keep it 80-180 words.",
  CAPTION: "Write a short social caption (1-3 sentences) with a clear call to action. Include 3-5 relevant hashtags at the end.",
  AD: "Write a paid ad copy with a strong hook, 2-3 benefit bullets, and a direct call to action. Keep it under 120 words.",
  PRODUCT_DESCRIPTION: "Write a product description highlighting benefits, who it is for, and a closing call to action. Keep it 120-220 words.",
  SCRIPT: "Write a short video or reel script (30-60 seconds) with HOOK, BODY, and CTA sections.",
};

export function buildContentPrompt(input: GenerateContentInput): string {
  const campaignBlock = input.campaignName
    ? `Campaign: ${input.campaignName}${input.campaignDescription ? ` — ${input.campaignDescription}` : ""}`
    : "Campaign: none";
  const extra = input.extraContext?.trim() ? `Extra context from the user: ${input.extraContext.trim()}` : "";

  return [
    "You are a copywriter for an affiliate marketer.",
    "Use ONLY the real product and campaign data provided. Do not invent features, prices, bonuses, or claims.",
    `Tone: ${input.tone}.`,
    KIND_INSTRUCTIONS[input.kind],
    "",
    `Product name: ${input.productName}`,
    `Product platform: ${input.productPlatform}`,
    `Product description: ${input.productDescription?.trim() || "not provided"}`,
    campaignBlock,
    extra,
    "",
    "Respond in Portuguese (Brazil).",
    "Return ONLY valid JSON with this shape:",
    '{"title":"string","body":"string","titles":["string","string","string"],"description":"string"}',
    "titles must contain exactly 3 alternative titles.",
    "description must be a 1-2 sentence summary of the generated content.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function parseGeneratedJson(raw: string): {
  title: string;
  body: string;
  titles: string[];
  description: string;
} {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("INVALID_AI_RESPONSE");
  }
  const parsed = JSON.parse(candidate.slice(start, end + 1)) as {
    title?: unknown;
    body?: unknown;
    titles?: unknown;
    description?: unknown;
  };
  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
  const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
  const titles = Array.isArray(parsed.titles)
    ? parsed.titles.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
  if (!title || !body) {
    throw new Error("INVALID_AI_RESPONSE");
  }
  const uniqueTitles = [title, ...titles].filter((item, index, list) => list.indexOf(item) === index).slice(0, 3);
  while (uniqueTitles.length < 3) uniqueTitles.push(title);
  return {
    title,
    body,
    titles: uniqueTitles,
    description: description || body.slice(0, 180),
  };
}
