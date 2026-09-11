export type ContentKind = "POST" | "CAPTION" | "AD" | "PRODUCT_DESCRIPTION" | "SCRIPT" | "VIDEO";
export type ContentTone = "professional" | "casual" | "persuasive" | "urgent" | "friendly";

export type GenerateContentInput = {
  kind: ContentKind;
  tone: ContentTone;
  productName: string;
  productDescription: string | null;
  productPlatform: string;
  campaignName?: string | null;
  campaignDescription?: string | null;
  extraContext?: string | null;
};

export type GenerateContentOutput = {
  title: string;
  body: string;
  titles: string[];
  description: string;
};

export interface AiProvider {
  readonly name: string;
  generateText(prompt: string): Promise<string>;
  generateContent(input: GenerateContentInput): Promise<GenerateContentOutput>;
  generateTitles(input: GenerateContentInput): Promise<string[]>;
  generateDescription(input: GenerateContentInput): Promise<string>;
}
