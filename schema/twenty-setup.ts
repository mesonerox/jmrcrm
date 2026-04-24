// Run: TWENTY_API_URL=http://localhost:3000 TWENTY_API_KEY=<your_api_key> \
//      npx ts-node schema/twenty-setup.ts

import * as process from "process";

// ── Config ────────────────────────────────────────────────────────────────────

const { TWENTY_API_URL, TWENTY_API_KEY } = process.env;

if (!TWENTY_API_URL || !TWENTY_API_KEY) {
  console.error(
    "ERROR: Missing required env vars: TWENTY_API_URL, TWENTY_API_KEY"
  );
  process.exit(1);
}

const METADATA_URL = `${TWENTY_API_URL}/metadata`;

// ── Types ─────────────────────────────────────────────────────────────────────

type FieldType =
  | "TEXT"
  | "RICH_TEXT"
  | "NUMBER"
  | "BOOLEAN"
  | "DATE_TIME"
  | "SELECT";

interface SelectOption {
  value: string; // SCREAMING_SNAKE_CASE
  label: string; // human-readable
  color: string; // TagColor
  position: number;
}

interface FieldDef {
  name: string; // camelCase
  label: string;
  type: FieldType;
  icon?: string;
  options?: SelectOption[];
}

interface ObjectDef {
  nameSingular: string; // camelCase
  namePlural: string;
  labelSingular: string;
  labelPlural: string;
  description: string;
  icon: string;
  fields: FieldDef[];
}

interface ObjectNode {
  id: string;
  nameSingular: string;
  isCustom: boolean;
  fields: { edges: { node: { id: string; name: string; type: string } }[] };
}

// REST metadata types (for reading existing fields)
interface RestFieldNode {
  id: string;
  name: string;
  type: string;
}

interface RestObjectNode {
  id: string;
  nameSingular: string;
  fields: RestFieldNode[];
}

// ── GraphQL helpers ───────────────────────────────────────────────────────────

async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(METADATA_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TWENTY_API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`    HTTP ${res.status} ${res.statusText}:`, body);
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join("; ");
    console.error("    GraphQL errors:", JSON.stringify(json.errors, null, 2));
    throw new GqlError(msg);
  }

  return json.data as T;
}

class GqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GqlError";
  }
}

function isAlreadyExists(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toUpperCase();
  return (
    msg.includes("ALREADY_EXISTS") ||
    msg.includes("ALREADY EXISTS") ||
    msg.includes("OBJECT_METADATA_ALREADY_EXISTS") ||
    msg.includes("FIELD_METADATA_ALREADY_EXISTS")
  );
}

// ── Fetch existing objects ────────────────────────────────────────────────────

async function fetchAllObjects(): Promise<Map<string, ObjectNode>> {
  const QUERY = `
    query FetchAllObjects {
      objects(paging: { first: 200 }) {
        edges {
          node {
            id
            nameSingular
            isCustom
            fields(paging: { first: 200 }) {
              edges {
                node {
                  id
                  name
                  type
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await gql<{
    objects: { edges: { node: ObjectNode }[] };
  }>(QUERY);

  const map = new Map<string, ObjectNode>();
  for (const { node } of data.objects.edges) {
    map.set(node.nameSingular, node);
  }
  return map;
}

// ── Create object ─────────────────────────────────────────────────────────────

const CREATE_OBJECT = `
  mutation CreateOneObject($input: CreateOneObjectInput!) {
    createOneObject(input: $input) {
      id
      nameSingular
    }
  }
`;

async function createObject(
  def: ObjectDef,
  existing: Map<string, ObjectNode>
): Promise<string> {
  const existingObj = existing.get(def.nameSingular);
  if (existingObj) {
    console.log(`  Skipping object: ${def.labelSingular} (exists)`);
    return existingObj.id;
  }

  console.log(`  Creating object: ${def.labelSingular}`);
  try {
    const data = await gql<{
      createOneObject: { id: string; nameSingular: string };
    }>(CREATE_OBJECT, {
      input: {
        object: {
          nameSingular: def.nameSingular,
          namePlural: def.namePlural,
          labelSingular: def.labelSingular,
          labelPlural: def.labelPlural,
          description: def.description,
          icon: def.icon,
        },
      },
    });
    return data.createOneObject.id;
  } catch (err) {
    if (isAlreadyExists(err)) {
      console.log(`  Skipping object: ${def.labelSingular} (exists)`);
      // Re-fetch to get the ID
      const refreshed = await fetchAllObjects();
      const obj = refreshed.get(def.nameSingular);
      if (!obj) throw new Error(`Could not find object ${def.nameSingular} after exists error`);
      return obj.id;
    }
    throw err;
  }
}

// ── REST metadata cache (used for reading existing fields) ───────────────────

let restMetadataCache: RestObjectNode[] | null = null;

async function fetchRestMetadata(): Promise<RestObjectNode[]> {
  if (restMetadataCache) return restMetadataCache;

  const res = await fetch(`${TWENTY_API_URL}/rest/metadata/objects`, {
    headers: { Authorization: `Bearer ${TWENTY_API_KEY}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`  REST metadata HTTP ${res.status} ${res.statusText}:`, body);
    throw new Error(`REST metadata HTTP ${res.status} ${res.statusText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await res.json() as any;

  const objects: RestObjectNode[] = json?.data?.objects ?? [];
  restMetadataCache = objects;
  return objects;
}

async function fetchExistingFields(objectId: string): Promise<Set<string>> {
  const objects = await fetchRestMetadata();
  const obj = objects.find((o) => o.id === objectId);
  return new Set(obj?.fields.map((f) => f.name) ?? []);
}

// ── Create field ──────────────────────────────────────────────────────────────

const CREATE_FIELD = `
  mutation CreateOneField($input: CreateOneFieldMetadataInput!) {
    createOneField(input: $input) {
      id
      name
      type
    }
  }
`;

async function createField(
  objectMetadataId: string,
  objectName: string,
  existingFieldNames: Set<string>,
  field: FieldDef
): Promise<void> {
  if (existingFieldNames.has(field.name)) {
    console.log(`    Skipping field: ${field.label} (already exists)`);
    return;
  }

  console.log(`    Creating field: ${field.label} (${field.type})`);
  try {
    await gql(CREATE_FIELD, {
      input: {
        field: {
          objectMetadataId,
          type: field.type,
          name: field.name,
          label: field.label,
          icon: field.icon ?? defaultIcon(field.type),
          isNullable: true,
          ...(field.options ? { options: field.options } : {}),
        },
      },
    });
  } catch (err) {
    if (isAlreadyExists(err)) {
      console.log(`    Skipping field: ${field.label} (exists)`);
      return;
    }
    throw err;
  }
}

function defaultIcon(type: FieldType): string {
  const map: Record<FieldType, string> = {
    TEXT: "IconLetterCase",
    RICH_TEXT: "IconFileText",
    NUMBER: "IconNumbers",
    BOOLEAN: "IconToggleLeft",
    DATE_TIME: "IconCalendar",
    SELECT: "IconTag",
  };
  return map[type];
}

// ── Schema definitions ────────────────────────────────────────────────────────

function opts(
  entries: { value: string; label: string; color: string }[]
): SelectOption[] {
  return entries.map((o, i) => ({ ...o, position: i }));
}

const CUSTOM_OBJECTS: ObjectDef[] = [
  // ── 1. InboundLead ─────────────────────────────────────────────────────────
  {
    nameSingular: "inboundLead",
    namePlural: "inboundLeads",
    labelSingular: "Inbound Lead",
    labelPlural: "Inbound Leads",
    description: "Prospective customer who has expressed interest in Crossmint",
    icon: "IconUserPlus",
    fields: [
      { name: "name", label: "Name", type: "TEXT", icon: "IconUser" },
      { name: "email", label: "Email", type: "TEXT", icon: "IconMail" },
      { name: "company", label: "Company", type: "TEXT", icon: "IconBuilding" },
      { name: "jobRole", label: "Job Role", type: "TEXT", icon: "IconBriefcase" },
      { name: "useCase", label: "Use Case", type: "RICH_TEXT", icon: "IconNotes" },
      {
        name: "source",
        label: "Source",
        type: "SELECT",
        options: opts([
          { label: "Website", value: "WEBSITE", color: "blue" },
          { label: "Event", value: "EVENT", color: "purple" },
          { label: "Referral", value: "REFERRAL", color: "green" },
          { label: "Inbound Email", value: "INBOUND_EMAIL", color: "turquoise" },
          { label: "LinkedIn", value: "LINKEDIN", color: "sky" },
        ]),
      },
      { name: "icpScore", label: "ICP Score", type: "NUMBER", icon: "IconTargetArrow" },
      {
        name: "icpTier",
        label: "ICP Tier",
        type: "SELECT",
        options: opts([
          { label: "A", value: "A", color: "green" },
          { label: "B", value: "B", color: "blue" },
          { label: "C", value: "C", color: "yellow" },
          { label: "Disqualified", value: "DISQUALIFIED", color: "red" },
        ]),
      },
      { name: "icpRationale", label: "ICP Rationale", type: "RICH_TEXT", icon: "IconNotes" },
      {
        name: "nextAction",
        label: "Next Action",
        type: "SELECT",
        options: opts([
          { label: "Book Demo", value: "BOOK_DEMO", color: "green" },
          { label: "Nurture", value: "NURTURE", color: "blue" },
          { label: "Discard", value: "DISCARD", color: "red" },
          { label: "Route to Partner", value: "ROUTE_TO_PARTNER", color: "purple" },
        ]),
      },
      { name: "qualifiedAt", label: "Qualified At", type: "DATE_TIME" },
    ],
  },

  // ── 2. WalletDeployment ────────────────────────────────────────────────────
  {
    nameSingular: "walletDeployment",
    namePlural: "walletDeployments",
    labelSingular: "Wallet Deployment",
    labelPlural: "Wallet Deployments",
    description: "A wallet deployed by a customer using Crossmint infrastructure",
    icon: "IconWallet",
    fields: [
      { name: "walletAddress", label: "Wallet Address", type: "TEXT", icon: "IconHash" },
      {
        name: "walletType",
        label: "Wallet Type",
        type: "SELECT",
        options: opts([
          { label: "Custodial", value: "CUSTODIAL", color: "blue" },
          { label: "Smart", value: "SMART", color: "purple" },
          { label: "Treasury", value: "TREASURY", color: "orange" },
          { label: "Agent", value: "AGENT", color: "turquoise" },
        ]),
      },
      {
        name: "deploymentStatus",
        label: "Deployment Status",
        type: "SELECT",
        options: opts([
          { label: "Active", value: "ACTIVE", color: "green" },
          { label: "Inactive", value: "INACTIVE", color: "gray" },
          { label: "Deprecated", value: "DEPRECATED", color: "red" },
        ]),
      },
      { name: "monthlyActiveUsers", label: "Monthly Active Users", type: "NUMBER", icon: "IconUsers" },
      { name: "deployedAt", label: "Deployed At", type: "DATE_TIME" },
    ],
  },

  // ── 3. Chain ───────────────────────────────────────────────────────────────
  {
    nameSingular: "chain",
    namePlural: "chains",
    labelSingular: "Chain",
    labelPlural: "Chains",
    description: "Blockchain network supported by Crossmint",
    icon: "IconLink",
    fields: [
      { name: "name", label: "Name", type: "TEXT", icon: "IconLetterCase" },
      { name: "chainId", label: "Chain ID", type: "TEXT", icon: "IconHash" },
      {
        name: "chainType",
        label: "Chain Type",
        type: "SELECT",
        options: opts([
          { label: "EVM", value: "EVM", color: "blue" },
          { label: "Solana", value: "SOLANA", color: "purple" },
          { label: "Other", value: "OTHER", color: "gray" },
        ]),
      },
      { name: "isActive", label: "Is Active", type: "BOOLEAN", icon: "IconToggleLeft" },
    ],
  },

  // ── 4. Integration ─────────────────────────────────────────────────────────
  {
    nameSingular: "integration",
    namePlural: "integrations",
    labelSingular: "Integration",
    labelPlural: "Integrations",
    description: "A customer's active integration with a Crossmint product module",
    icon: "IconPlug",
    fields: [
      {
        name: "productModule",
        label: "Product Module",
        type: "SELECT",
        options: opts([
          { label: "Embedded Wallets", value: "EMBEDDED_WALLETS", color: "blue" },
          { label: "Treasury", value: "TREASURY", color: "orange" },
          { label: "Stablecoin Orchestration", value: "STABLECOIN_ORCHESTRATION", color: "turquoise" },
          { label: "Onramp", value: "ONRAMP", color: "green" },
          { label: "Offramp", value: "OFFRAMP", color: "sky" },
          { label: "Tokenization", value: "TOKENIZATION", color: "purple" },
          { label: "Agentic Payments", value: "AGENTIC_PAYMENTS", color: "pink" },
        ]),
      },
      {
        name: "deploymentStatus",
        label: "Deployment Status",
        type: "SELECT",
        options: opts([
          { label: "Active", value: "ACTIVE", color: "green" },
          { label: "Piloting", value: "PILOTING", color: "yellow" },
          { label: "Churned", value: "CHURNED", color: "red" },
          { label: "Prospect", value: "PROSPECT", color: "blue" },
        ]),
      },
      { name: "deployedAt", label: "Deployed At", type: "DATE_TIME" },
      { name: "monthlyVolume", label: "Monthly Volume", type: "NUMBER", icon: "IconChartBar" },
      { name: "integrationNotes", label: "Integration Notes", type: "RICH_TEXT", icon: "IconNotes" },
    ],
  },
];

// ── Custom fields for the standard Company object ─────────────────────────────

const COMPANY_FIELDS: FieldDef[] = [
  { name: "healthScore", label: "Health Score", type: "NUMBER", icon: "IconHeartbeat" },
  {
    name: "churnRisk",
    label: "Churn Risk",
    type: "SELECT",
    options: opts([
      { label: "Low", value: "LOW", color: "green" },
      { label: "Medium", value: "MEDIUM", color: "yellow" },
      { label: "High", value: "HIGH", color: "orange" },
      { label: "Critical", value: "CRITICAL", color: "red" },
    ]),
  },
  { name: "lastProductActivity", label: "Last Product Activity", type: "DATE_TIME" },
  { name: "monthlyApiCalls", label: "Monthly API Calls", type: "NUMBER", icon: "IconApi" },
  { name: "activeWalletCount", label: "Active Wallet Count", type: "NUMBER", icon: "IconWallet" },
  { name: "activeChainCount", label: "Active Chain Count", type: "NUMBER", icon: "IconLink" },
  { name: "estimatedArr", label: "Estimated ARR", type: "NUMBER", icon: "IconCurrencyDollar" },
  {
    name: "segment",
    label: "Segment",
    type: "SELECT",
    options: opts([
      { label: "Developer", value: "DEVELOPER", color: "blue" },
      { label: "SMB", value: "SMB", color: "green" },
      { label: "Enterprise", value: "ENTERPRISE", color: "orange" },
      { label: "Strategic", value: "STRATEGIC", color: "purple" },
    ]),
  },
  {
    name: "expansionPotential",
    label: "Expansion Potential",
    type: "SELECT",
    options: opts([
      { label: "Low", value: "LOW", color: "gray" },
      { label: "Medium", value: "MEDIUM", color: "yellow" },
      { label: "High", value: "HIGH", color: "green" },
    ]),
  },
  { name: "lastTouchpointDays", label: "Last Touchpoint (days)", type: "NUMBER", icon: "IconClock" },
  { name: "icpNotes", label: "ICP Notes", type: "RICH_TEXT", icon: "IconNotes" },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\nConnecting to Twenty at: ${TWENTY_API_URL}`);
  console.log("Fetching existing objects...\n");

  const existing = await fetchAllObjects();
  console.log(`Found ${existing.size} existing object(s).\n`);

  // ── Sanity check: verify REST field reading before main loop ────────────
  const inboundLeadObj = existing.get("inboundLead");
  if (inboundLeadObj) {
    const sanityFields = await fetchExistingFields(inboundLeadObj.id);
    console.log(`Found ${sanityFields.size} existing fields on InboundLead\n`);
  }

  // ── Create custom objects + their fields ────────────────────────────────────
  for (const def of CUSTOM_OBJECTS) {
    console.log(`[Object] ${def.labelSingular}`);

    const objectId = await createObject(def, existing);

    // Bust the REST cache so the newly created object (and its auto-fields) are visible
    restMetadataCache = null;
    const existingFieldNames = await fetchExistingFields(objectId);

    for (const field of def.fields) {
      await createField(objectId, def.nameSingular, existingFieldNames, field);
    }

    console.log();
  }

  // ── Add custom fields to standard Company object ────────────────────────────
  console.log("[Object] Company (standard — adding custom fields)");

  const companyObj = existing.get("company");
  if (!companyObj) {
    console.warn(
      "  WARNING: Company object not found. Has Twenty been initialised? Skipping."
    );
  } else {
    const existingFieldNames = await fetchExistingFields(companyObj.id);
    for (const field of COMPANY_FIELDS) {
      await createField(companyObj.id, "company", existingFieldNames, field);
    }
  }

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error("\nFATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
