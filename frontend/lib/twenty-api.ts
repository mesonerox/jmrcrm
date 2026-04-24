import useSWR from "swr";

const BASE_URL =
  process.env.NEXT_PUBLIC_TWENTY_API_URL ?? "http://localhost:3000";
const API_KEY = process.env.NEXT_PUBLIC_TWENTY_API_KEY ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

// Twenty REST API wraps collections in edges/node when using GraphQL,
// but the REST endpoints return flat arrays: { data: { <object>s: T[] } }
export type TwentyEdgesResponse<T> = {
  data: { [key: string]: { edges: { node: T }[] } };
};

export interface TwentyCompany {
  id: string;
  name: string;
  domainName?: { primaryLinkUrl?: string };
  employees?: number;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface TwentyInboundLead {
  id: string;
  name?: string;
  email?: string;
  company?: string;
  jobRole?: string;
  useCase?: string;
  source?: string;
  icpScore?: number;
  icpTier?: string;
  icpRationale?: string;
  nextAction?: string;
  qualifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TwentyOpportunity {
  id: string;
  name?: string;
  stage?: string;
  amount?: { amountMicros?: number; currencyCode?: string };
  closeDate?: string;
  probability?: number;
  pointOfContactId?: string;
  companyId?: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/rest${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Twenty API error: HTTP ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useCompanies() {
  const { data, error, isLoading } = useSWR<{
    data: { companies: TwentyCompany[] };
  }>("/companies?orderBy=createdAt[descend]&first=100", fetcher, { refreshInterval: 30_000 });

  return {
    companies: data?.data?.companies ?? [],
    isLoading,
    error: error as Error | undefined,
  };
}

export function useInboundLeads() {
  const { data, error, isLoading } = useSWR<{
    data: { inboundLeads: TwentyInboundLead[] };
  }>("/inboundLeads?orderBy=createdAt[descend]&first=100", fetcher, { refreshInterval: 30_000 });

  return {
    inboundLeads: data?.data?.inboundLeads ?? [],
    isLoading,
    error: error as Error | undefined,
  };
}

export function useOpportunities() {
  const { data, error, isLoading } = useSWR<{
    data: { opportunities: TwentyOpportunity[] };
  }>("/opportunities?orderBy=createdAt[descend]&first=100", fetcher, { refreshInterval: 30_000 });

  return {
    opportunities: data?.data?.opportunities ?? [],
    isLoading,
    error: error as Error | undefined,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date >= weekAgo && date <= now;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function tierColor(tier?: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (tier) {
    case "A":
      return { bg: "rgba(0,255,135,0.1)", text: "#00FF87", border: "rgba(0,255,135,0.3)" };
    case "B":
      return { bg: "rgba(245,158,11,0.1)", text: "#F59E0B", border: "rgba(245,158,11,0.3)" };
    case "C":
      return { bg: "rgba(136,136,136,0.1)", text: "#888888", border: "rgba(136,136,136,0.25)" };
    case "DISQUALIFIED":
      return { bg: "rgba(255,68,68,0.1)", text: "#FF4444", border: "rgba(255,68,68,0.25)" };
    default:
      return { bg: "rgba(68,68,68,0.2)", text: "#444444", border: "rgba(68,68,68,0.3)" };
  }
}

export function healthColor(score?: number): string {
  if (score === undefined || score === null) return "#444444";
  if (score >= 70) return "#00FF87";
  if (score >= 40) return "#F59E0B";
  return "#FF4444";
}

export function churnRiskColor(risk?: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (risk?.toUpperCase()) {
    case "LOW":
      return { bg: "rgba(0,255,135,0.08)", text: "#00FF87", border: "rgba(0,255,135,0.2)" };
    case "MEDIUM":
      return { bg: "rgba(245,158,11,0.08)", text: "#F59E0B", border: "rgba(245,158,11,0.2)" };
    case "HIGH":
      return { bg: "rgba(255,100,50,0.08)", text: "#FF6432", border: "rgba(255,100,50,0.2)" };
    case "CRITICAL":
      return { bg: "rgba(255,68,68,0.08)", text: "#FF4444", border: "rgba(255,68,68,0.2)" };
    default:
      return { bg: "rgba(68,68,68,0.1)", text: "#444444", border: "rgba(68,68,68,0.2)" };
  }
}
