import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TwentyCompany {
  id: string;
  name: string;
  domainName?: { primaryLinkUrl?: string };
  employees?: number;
  // Custom fields from twenty-setup.ts
  healthScore?: number;
  churnRisk?: string;
  monthlyApiCalls?: number;
  activeWalletCount?: number;
  activeChainCount?: number;
  estimatedArr?: number;
  segment?: string;
  expansionPotential?: string;
  icpNotes?: string;
  lastProductActivity?: string;
}

interface TwentyPerson {
  id: string;
  name?: { firstName?: string; lastName?: string };
  emails?: { primaryEmail?: string };
  jobTitle?: string;
  companyId?: string;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function callClaude(
  system: string,
  user: string,
  maxTokens = 1024
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected non-text response from Claude");
  return block.text;
}

function parseClaudeJson<T>(text: string): T {
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

async function twentyGet<T>(path: string): Promise<T> {
  const apiUrl = process.env.TWENTY_API_URL;
  const apiKey = process.env.TWENTY_API_KEY;
  if (!apiUrl || !apiKey) throw new Error("Missing TWENTY_API_URL or TWENTY_API_KEY");

  const res = await fetch(`${apiUrl}/rest${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twenty REST GET ${path} → HTTP ${res.status}: ${body}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.json() as Promise<T>;
}

async function fetchCompany(name: string): Promise<TwentyCompany | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await twentyGet<any>("/companies");
  const companies: TwentyCompany[] = json?.data?.companies ?? [];
  return (
    companies.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null
  );
}

async function fetchContacts(companyId: string): Promise<TwentyPerson[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await twentyGet<any>("/people");
  const people: TwentyPerson[] = json?.data?.people ?? [];
  return people.filter((p) => p.companyId === companyId);
}

function fullName(p: TwentyPerson): string {
  return [p.name?.firstName, p.name?.lastName].filter(Boolean).join(" ") || "Unknown";
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const ICP_SYSTEM_PROMPT = `You are an ICP scoring agent for Range — the leading enterprise Web3 infrastructure platform powering wallets, stablecoin payments, tokenization, and agentic finance for 40,000+ companies including MoneyGram, Western Union, Wirex, and Toku.

Score inbound leads against Range's ICP:
- Tier A (80-100): Fintech building on stablecoin rails — remittance, payroll, neobank, cross-border payments. Enterprise with blockchain unit. AI agent platforms needing payment infrastructure.
- Tier B (50-79): Gaming/NFT with wallet or payment needs. Mid-market fintech exploring crypto rails. Developer platforms needing tokenization.
- Tier C (20-49): Early-stage developer, unclear use case, no financial component.
- Disqualified (0-19): Consumer app, no blockchain need, competitor.

Respond ONLY with valid JSON:
{
  "score": number (0-100),
  "tier": "A" | "B" | "C" | "Disqualified",
  "rationale": "2-3 sentences explaining the score",
  "nextAction": "Book Demo" | "Nurture" | "Discard" | "Route to Partner",
  "personalization": "one sentence on outreach angle"
}`;

// ── MCP server ────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "range-crm",
  version: "1.0.0",
});

// ── Tool 1: qualify_lead ──────────────────────────────────────────────────────

server.tool(
  "qualify_lead",
  "Score an inbound lead against Range's ICP. Returns tier (A/B/C/Disqualified), score 0-100, rationale, recommended next action, and personalized outreach angle.",
  {
    companyName: z.string().describe("Name of the company"),
    industry: z.string().describe("Industry or vertical"),
    useCase: z.string().describe("Described use case or problem to solve"),
    country: z.string().optional().describe("Country or region (optional)"),
  },
  async ({ companyName, industry, useCase, country }) => {
    const lines = [
      `Company: ${companyName}`,
      `Industry: ${industry}`,
      `Use Case: ${useCase}`,
    ];
    if (country) lines.push(`Country: ${country}`);

    try {
      const text = await callClaude(ICP_SYSTEM_PROMPT, lines.join("\n"));
      const result = parseClaudeJson(text);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error scoring lead: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 2: get_account_health ────────────────────────────────────────────────

server.tool(
  "get_account_health",
  "Fetch a company's health metrics from Twenty CRM: health score, churn risk, API usage, wallet count, segment, and ARR.",
  {
    companyName: z.string().describe("Exact company name as stored in Twenty CRM"),
  },
  async ({ companyName }) => {
    try {
      const company = await fetchCompany(companyName);

      if (!company) {
        return {
          content: [
            {
              type: "text",
              text: `Company "${companyName}" not found in Twenty CRM. Check spelling or run the seed script.`,
            },
          ],
        };
      }

      const fmt = (n: number | undefined) =>
        n !== undefined ? n.toLocaleString() : "N/A";
      const dollar = (n: number | undefined) =>
        n !== undefined ? `$${n.toLocaleString()}` : "N/A";

      const summary = [
        `# Account Health: ${company.name}`,
        ``,
        `**Segment:** ${company.segment ?? "N/A"}`,
        `**Health Score:** ${company.healthScore ?? "N/A"}/100`,
        `**Churn Risk:** ${company.churnRisk ?? "N/A"}`,
        `**Estimated ARR:** ${dollar(company.estimatedArr)}`,
        `**Expansion Potential:** ${company.expansionPotential ?? "N/A"}`,
        ``,
        `**Monthly API Calls:** ${fmt(company.monthlyApiCalls)}`,
        `**Active Wallets:** ${fmt(company.activeWalletCount)}`,
        `**Active Chains:** ${company.activeChainCount ?? "N/A"}`,
        `**Last Product Activity:** ${company.lastProductActivity ?? "N/A"}`,
        ``,
        `**ICP Notes:** ${company.icpNotes ?? "N/A"}`,
        `**Domain:** ${company.domainName?.primaryLinkUrl ?? "N/A"}`,
      ].join("\n");

      return { content: [{ type: "text", text: summary }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching account health: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 3: prep_meeting_brief ────────────────────────────────────────────────

server.tool(
  "prep_meeting_brief",
  "Generate a structured meeting brief for an account: overview, key contacts, product usage summary, talking points, and risks/opportunities.",
  {
    companyName: z.string().describe("Company name to prepare the brief for"),
  },
  async ({ companyName }) => {
    try {
      const company = await fetchCompany(companyName);

      if (!company) {
        return {
          content: [
            {
              type: "text",
              text: `Company "${companyName}" not found in Twenty CRM.`,
            },
          ],
        };
      }

      const contacts = await fetchContacts(company.id);

      const companyCtx = JSON.stringify(
        {
          name: company.name,
          domain: company.domainName?.primaryLinkUrl,
          segment: company.segment,
          healthScore: company.healthScore,
          churnRisk: company.churnRisk,
          monthlyApiCalls: company.monthlyApiCalls,
          activeWalletCount: company.activeWalletCount,
          activeChainCount: company.activeChainCount,
          estimatedArr: company.estimatedArr,
          expansionPotential: company.expansionPotential,
          lastProductActivity: company.lastProductActivity,
          icpNotes: company.icpNotes,
        },
        null,
        2
      );

      const contactsCtx =
        contacts.length > 0
          ? contacts
              .map(
                (p) =>
                  `- ${fullName(p)}${p.emails?.primaryEmail ? ` <${p.emails.primaryEmail}>` : ""}`
              )
              .join("\n")
          : "No contacts on file.";

      const system = `You are a strategic account intelligence assistant for Range — the leading enterprise Web3 infrastructure platform. You help account executives prepare for high-stakes meetings. Be concise, specific, and actionable. Write in crisp markdown.`;

      const user = `Prepare a meeting brief for ${company.name}.

Company Data:
${companyCtx}

Key Contacts:
${contactsCtx}

Write the brief in this exact structure:

## Overview
(2-3 sentences on who they are, what they do, and their relationship with Range)

## Key Contacts
(list each contact with name and email)

## Product Usage
(summarise their current Range footprint: wallets, chains, API volume, ARR)

## Talking Points
(3-5 bullet points — expansion opportunities, upcoming renewals, relevant Range features)

## Risks & Opportunities
(health score context, churn signals, expansion potential)`;

      const brief = await callClaude(system, user, 1500);

      return { content: [{ type: "text", text: brief }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error generating brief: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 4: draft_outreach ────────────────────────────────────────────────────

server.tool(
  "draft_outreach",
  "Draft a personalized first-touch outreach email for a prospect or existing account, referencing relevant Range case studies based on their segment.",
  {
    companyName: z.string().describe("Target company name"),
    angle: z
      .string()
      .optional()
      .describe(
        "Optional outreach angle or hook (e.g. 'stablecoin expansion', 'agentic payments')"
      ),
  },
  async ({ companyName, angle }) => {
    try {
      const company = await fetchCompany(companyName);

      // Build context even if company not in CRM
      const companyCtx = company
        ? JSON.stringify(
            {
              name: company.name,
              domain: company.domainName?.primaryLinkUrl,
              segment: company.segment,
              estimatedArr: company.estimatedArr,
              activeWalletCount: company.activeWalletCount,
              activeChainCount: company.activeChainCount,
              expansionPotential: company.expansionPotential,
              icpNotes: company.icpNotes,
            },
            null,
            2
          )
        : `Company name: ${companyName} (not yet in CRM — write based on name/industry inference)`;

      // Pick case study reference by segment
      const caseStudyHint = (() => {
        const seg = company?.segment?.toUpperCase() ?? "";
        const name = companyName.toLowerCase();
        const notes = (company?.icpNotes ?? "").toLowerCase();

        if (seg === "STRATEGIC" || seg === "ENTERPRISE") return "MoneyGram (enterprise-scale stablecoin orchestration and wallet infrastructure)";
        if (notes.includes("payroll") || name.includes("pay")) return "Toku ($1B+ payroll on stablecoin rails)";
        if (notes.includes("brazil") || notes.includes("remittance") || name.includes("remit")) return "Ruvo (USD-BRL remittance on Range)";
        if (seg === "SMB" || notes.includes("neobank") || notes.includes("bank")) return "Wirex (smart wallet neobanking)";
        return "Cacao Finance (YC-backed fintech scaling on Range stablecoin rails)";
      })();

      const system = `You are a strategic outreach writer for Range — enterprise Web3 infrastructure for wallets, stablecoin payments, tokenization, and agentic finance.

Range's voice is: confident, technically literate, concise, outcome-focused. Never hype-y or generic. Reference specific outcomes (volume, wallets deployed, countries). One clear CTA per email.`;

      const angleCtx = angle ? `\nSpecific angle to emphasise: ${angle}` : "";

      const user = `Write a personalized first-touch outreach email for ${companyName}.

Company profile:
${companyCtx}${angleCtx}

Relevant case study to reference: ${caseStudyHint}

Format your response EXACTLY as:
Subject: <subject line>

<email body>

Guidelines:
- 150-200 words max
- Open with a specific observation about their business, not a compliment
- Reference the case study naturally (one sentence)
- One concrete CTA (book a 20-min call)
- Sign off as: Alex Chen, Head of Enterprise Partnerships, Range`;

      const text = await callClaude(system, user, 600);

      // Parse subject line and body
      const subjectMatch = text.match(/^Subject:\s*(.+)/im);
      const subject = subjectMatch
        ? subjectMatch[1].trim()
        : `Range infrastructure for ${companyName}`;
      const body = text
        .replace(/^Subject:\s*.+\n?/im, "")
        .trim();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ subject, body }, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error drafting outreach: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Start server ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP servers communicate over stdio — do not log to stdout
  process.stderr.write("Range CRM MCP server running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(
    `Fatal: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
