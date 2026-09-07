import { env } from "../../config/env.js";
import { AppError } from "../../middleware/errorHandler.js";
import { AnthropicProvider } from "./anthropic.provider.js";
import { OpenAiProvider } from "./openai.provider.js";
import type { AiProvider } from "./ai.types.js";

export function getConfiguredProviderName(): string | null {
  const name = env.AI_PROVIDER.trim().toLowerCase();
  return name || null;
}

export function isAiConfigured(): boolean {
  return Boolean(getConfiguredProviderName() && env.AI_API_KEY.trim());
}

export function getAiStatus() {
  const provider = getConfiguredProviderName();
  return {
    configured: isAiConfigured(),
    provider: isAiConfigured() ? provider : null,
  };
}

export function createAiProvider(): AiProvider {
  const provider = getConfiguredProviderName();
  const apiKey = env.AI_API_KEY.trim();
  if (!provider || !apiKey) {
    throw new AppError(503, "AI_NOT_CONFIGURED", "AI provider is not configured.");
  }
  if (provider === "openai") return new OpenAiProvider(apiKey);
  if (provider === "anthropic") return new AnthropicProvider(apiKey);
  throw new AppError(503, "AI_NOT_CONFIGURED", "Unsupported AI provider.");
}
