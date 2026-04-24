import type { Account } from "../mock-data/accounts";

// ── REST helpers ──────────────────────────────────────────────────────────────

async function restRequest<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const apiUrl = process.env.TWENTY_API_URL;
  const apiKey = process.env.TWENTY_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("Missing required env vars: TWENTY_API_URL, TWENTY_API_KEY");
  }

  const res = await fetch(`${apiUrl}/rest${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twenty REST ${method} ${path} → HTTP ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Field value converters ────────────────────────────────────────────────────

// Twenty SELECT fields expect the option VALUE (SCREAMING_SNAKE_CASE)
function toSelectValue(label: string): string {
  return label.toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

// Map MockAccount → expansion potential heuristic
function deriveExpansionPotential(
  account: Account
): "LOW" | "MEDIUM" | "HIGH" {
  const allModules = [
    "Embedded Wallets",
    "Treasury",
    "Stablecoin Orchestration",
    "Onramp",
    "Offramp",
    "Tokenization",
    "Agentic Payments",
  ];
  const coverage = account.activeModules.length / allModules.length;
  if (coverage >= 0.7) return "LOW"; // already deeply integrated
  if (coverage >= 0.4) return "MEDIUM";
  return "HIGH";
}

// ── Payload builders ──────────────────────────────────────────────────────────

function buildCompanyPayload(account: Account): Record<string, unknown> {
  const url = account.domain.startsWith("https://")
    ? account.domain
    : `https://${account.domain}`;

  return {
    name: account.name,
    domainName: {
      primaryLinkUrl: url,
      primaryLinkLabel: "",
    },
  };
}

function buildCustomFieldsPayload(account: Account): Record<string, unknown> {
  return {
    healthScore: account.healthScore,
    monthlyApiCalls: account.monthlyApiCalls,
    activeWalletCount: account.walletCount,
    activeChainCount: account.activeChainCount,
    estimatedArr: account.estimatedArr,
    churnRisk: toSelectValue(account.churnRisk),
    segment: toSelectValue(account.segment),
    expansionPotential: deriveExpansionPotential(account),
    lastProductActivity: new Date(account.lastProductActivity).toISOString(),
    // icpNotes is RICH_TEXT — Twenty REST API does not support write operations on this type
  };
}

// ── Upsert ────────────────────────────────────────────────────────────────────

interface TwentyMutationResponse {
  data: { id: string };
}

function isDuplicateError(message: string): boolean {
  const upper = message.toUpperCase();
  return (
    upper.includes("ALREADY_EXISTS") ||
    upper.includes("ALREADY EXISTS") ||
    upper.includes("DUPLICATE") ||
    upper.includes("UNIQUE") ||
    upper.includes("CONFLICT")
  );
}

interface TwentyCompanyListResponse {
  data: { companies: { id: string; name: string }[] };
}

async function lookupCompanyByName(name: string): Promise<string> {
  const result = await restRequest<TwentyCompanyListResponse>(
    "GET",
    "/companies"
  );
  const match = result?.data?.companies?.find((c) => c.name === name);
  if (!match) throw new Error(`lookupCompanyByName: no company found with name "${name}"`);
  return match.id;
}

async function patchCustomFields(id: string, account: Account): Promise<void> {
  await restRequest("PATCH", `/companies/${id}`, buildCustomFieldsPayload(account));
}

export async function upsertCompany(account: Account): Promise<string> {
  console.log(`  Creating company: ${account.name}`);
  let id: string;

  try {
    const result = await restRequest<TwentyMutationResponse>(
      "POST",
      "/companies",
      buildCompanyPayload(account)
    );
    id = result.data.id;
  } catch (err) {
    if (err instanceof Error && isDuplicateError(err.message)) {
      console.log(`  Company already exists, looking up ID: ${account.name}`);
      id = await lookupCompanyByName(account.name);
    } else {
      throw err;
    }
  }

  // Step 2: PATCH custom health fields — idempotent, runs on both create and update paths
  console.log(`  Patching custom fields for: ${account.name} (${id})`);
  await patchCustomFields(id, account);

  return id;
}
