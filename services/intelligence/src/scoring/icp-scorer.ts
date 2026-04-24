import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IcpScoringInput {
  companyName: string;
  industry: string;
  useCase: string;
  estimatedSize?: string;
  chains?: string[];
  products?: string[];
  country?: string;
}

export const IcpScoreSchema = z.object({
  score: z.number().min(0).max(100),
  tier: z.enum(["A", "B", "C", "Disqualified"]),
  rationale: z.string(),
  nextAction: z.enum(["Book Demo", "Nurture", "Discard", "Route to Partner"]),
  expansionFlags: z.array(z.string()),
  riskFlags: z.array(z.string()),
  personalization: z.string(),
});

export type IcpScore = z.infer<typeof IcpScoreSchema>;

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an ICP scoring agent for Crossmint — the leading enterprise Web3 infrastructure platform powering wallets, stablecoin payments, tokenization, and agentic finance for 40,000+ companies including MoneyGram, Western Union, Wirex, and Toku.

Score inbound leads against Crossmint's ICP:
- Tier A (80-100): Fintech building on stablecoin rails — remittance, payroll, neobank, cross-border payments. Enterprise with blockchain unit. AI agent platforms needing payment infrastructure.
- Tier B (50-79): Gaming/NFT with wallet or payment needs. Mid-market fintech exploring crypto rails. Developer platforms needing tokenization.
- Tier C (20-49): Early-stage developer, unclear use case, no financial component.
- Disqualified (0-19): Consumer app, no blockchain need, competitor.

Respond ONLY with valid JSON matching this exact structure:
{
  "score": number (0-100),
  "tier": "A" | "B" | "C" | "Disqualified",
  "rationale": "string (2-3 sentences explaining the score)",
  "nextAction": "Book Demo" | "Nurture" | "Discard" | "Route to Partner",
  "expansionFlags": ["string array of opportunities e.g. 'Agentic Payments fit'"],
  "riskFlags": ["string array of concerns e.g. 'Early stage'"],
  "personalization": "string (one sentence on outreach angle)"
}`;

function buildUserPrompt(input: IcpScoringInput): string {
  const lines = [
    `Company: ${input.companyName}`,
    `Industry: ${input.industry}`,
    `Use Case: ${input.useCase}`,
  ];
  if (input.country) lines.push(`Country: ${input.country}`);
  if (input.estimatedSize) lines.push(`Estimated Size: ${input.estimatedSize}`);
  if (input.chains?.length) lines.push(`Chains: ${input.chains.join(", ")}`);
  if (input.products?.length) lines.push(`Products of Interest: ${input.products.join(", ")}`);
  return lines.join("\n");
}

// ── Core scorer ───────────────────────────────────────────────────────────────

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model response");
  return JSON.parse(match[0]);
}

async function callModel(
  client: Anthropic,
  userPrompt: string
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response content type");
  return block.text;
}

export async function scoreLead(input: IcpScoringInput): Promise<IcpScore> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userPrompt = buildUserPrompt(input);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await callModel(client, userPrompt);
      const raw = extractJson(text);
      return IcpScoreSchema.parse(raw);
    } catch (err) {
      if (attempt === 1) throw err;
      console.warn("ICP score parse failed, retrying once...", err);
    }
  }

  // Unreachable — loop always throws on attempt 1 if both fail
  throw new Error("scoreLead: exhausted retries");
}
