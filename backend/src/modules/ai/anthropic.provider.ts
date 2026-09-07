import { AppError } from "../../middleware/errorHandler.js";
import { buildContentPrompt, parseGeneratedJson } from "./ai.prompts.js";
import type { AiProvider, GenerateContentInput, GenerateContentOutput } from "./ai.types.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";

  constructor(private readonly apiKey: string) {}

  async generateText(prompt: string): Promise<string> {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new AppError(502, "AI_PROVIDER_ERROR", "AI provider request failed.");
    }

    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = payload.content?.find((part) => part.type === "text")?.text?.trim();
    if (!text) {
      throw new AppError(502, "AI_PROVIDER_ERROR", "AI provider returned an empty response.");
    }
    return text;
  }

  async generateContent(input: GenerateContentInput): Promise<GenerateContentOutput> {
    const raw = await this.generateText(buildContentPrompt(input));
    try {
      return parseGeneratedJson(raw);
    } catch {
      throw new AppError(502, "AI_PROVIDER_ERROR", "AI provider returned invalid content.");
    }
  }

  async generateTitles(input: GenerateContentInput): Promise<string[]> {
    const result = await this.generateContent(input);
    return result.titles;
  }

  async generateDescription(input: GenerateContentInput): Promise<string> {
    const result = await this.generateContent(input);
    return result.description;
  }
}
