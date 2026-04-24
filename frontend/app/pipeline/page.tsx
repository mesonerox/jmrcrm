"use client";

import { useOpportunities, useCompanies, type TwentyOpportunity } from "@/lib/twenty-api";

// ── Pipeline stages ───────────────────────────────────────────────────────────

const STAGES = [
  { key: "NEW",         label: "New",          color: "#818181" },
  { key: "SCREENING",   label: "Screening",    color: "#7dd3fc" },
  { key: "MEETING",     label: "Meeting",      color: "#a78bfa" },
  { key: "PROPOSAL",    label: "Proposal",     color: "#fbbf24" },
  { key: "NEGOTIATION", label: "Negotiation",  color: "#fb923c" },
  { key: "CLOSED_WON",  label: "Closed Won",   color: "#4ade80" },
  { key: "CLOSED_LOST", label: "Closed Lost",  color: "#f87171" },
];

function normalizeStage(stage?: string): string {
  if (!stage) return "NEW";
  return stage.toUpperCase().replace(/\s+/g, "_");
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function formatAmount(opp: TwentyOpportunity): string | null {
  const micros = opp.amount?.amountMicros;
  if (micros == null) return null;
  const amount = micros / 1_000_000;
  const currency = opp.amount?.currencyCode ?? "USD";
  if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${currency} ${(amount / 1_000).toFixed(0)}K`;
  return `${currency} ${amount.toFixed(0)}`;
}

function DealCard({
  opp,
  companyName,
}: {
  opp: TwentyOpportunity;
  companyName?: string;
}) {
  const amount = formatAmount(opp);
  const closeDate = opp.closeDate
    ? new Date(opp.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <div
      style={{
        backgroundColor: "#1d1d1d",
        border: "1px solid #222222",
        borderRadius: 4,
        padding: "12px 14px",
        marginBottom: 6,
        transition: "background-color 100ms ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "#1d1d1d";
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          fontWeight: 500,
          color: "#eaeaea",
          marginBottom: 4,
          lineHeight: 1.4,
        }}
      >
        {opp.name ?? companyName ?? "Unnamed Deal"}
      </div>
      {companyName && opp.name && (
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            color: "#818181",
            marginBottom: 8,
          }}
        >
          {companyName}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        {amount && (
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: "#b3b3b3",
              fontWeight: 500,
            }}
          >
            {amount}
          </span>
        )}
        {closeDate && (
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              color: "#818181",
            }}
          >
            {closeDate}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  opps,
  companyMap,
}: {
  stage: { key: string; label: string; color: string };
  opps: TwentyOpportunity[];
  companyMap: Map<string, string>;
}) {
  return (
    <div
      style={{
        minWidth: 220,
        flex: "0 0 220px",
        backgroundColor: "#171717",
        border: "1px solid #222222",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: "11px 14px",
          borderBottom: "1px solid #222222",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: stage.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color: "#b3b3b3",
            }}
          >
            {stage.label}
          </span>
        </div>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            color: "#818181",
            backgroundColor: "#222222",
            padding: "1px 7px",
            borderRadius: 4,
          }}
        >
          {opps.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding: "10px", minHeight: 80 }}>
        {opps.length === 0 ? (
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              color: "#222222",
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            Empty
          </div>
        ) : (
          opps.map((opp) => (
            <DealCard
              key={opp.id}
              opp={opp}
              companyName={opp.companyId ? companyMap.get(opp.companyId) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { opportunities, isLoading: oLoading, error: oError } = useOpportunities();
  const { companies, isLoading: cLoading } = useCompanies();

  const isLoading = oLoading || cLoading;

  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  const stageMap = new Map<string, TwentyOpportunity[]>();
  for (const stage of STAGES) {
    stageMap.set(stage.key, []);
  }
  for (const opp of opportunities) {
    const stageKey = normalizeStage(opp.stage);
    if (stageMap.has(stageKey)) {
      stageMap.get(stageKey)!.push(opp);
    } else {
      stageMap.get("NEW")!.push(opp);
    }
  }

  const totalValue = opportunities.reduce((sum, opp) => {
    return sum + (opp.amount?.amountMicros ?? 0) / 1_000_000;
  }, 0);

  return (
    <div className="page-enter" style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 20,
              fontWeight: 600,
              color: "#eaeaea",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Pipeline
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#818181", margin: "6px 0 0" }}>
            {isLoading
              ? "Loading…"
              : `${opportunities.length} deal${opportunities.length !== 1 ? "s" : ""} across ${STAGES.length} stages`}
          </p>
        </div>
        {!isLoading && totalValue > 0 && (
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 10,
                color: "#818181",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 4,
              }}
            >
              Total Pipeline Value
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 24,
                fontWeight: 600,
                color: "#eaeaea",
                letterSpacing: "-0.02em",
              }}
            >
              {totalValue >= 1_000_000
                ? `$${(totalValue / 1_000_000).toFixed(1)}M`
                : `$${(totalValue / 1_000).toFixed(0)}K`}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {oError && (
        <div
          style={{
            backgroundColor: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 8,
            padding: "14px 18px",
            color: "#f87171",
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          Failed to load opportunities: {oError.message}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !oError && opportunities.length === 0 ? (
        <div
          style={{
            backgroundColor: "#171717",
            border: "1px solid #222222",
            borderRadius: 8,
            padding: "80px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 32,
              color: "#222222",
              marginBottom: 16,
            }}
          >
            ∅
          </div>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              color: "#818181",
              margin: 0,
            }}
          >
            No deals yet — qualify a lead to start
          </p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#222222", margin: "8px 0 0" }}>
            Opportunities created in Twenty CRM will appear here automatically.
          </p>
        </div>
      ) : (
        /* Kanban board */
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 16,
          }}
        >
          {isLoading
            ? STAGES.map((stage) => (
                <div
                  key={stage.key}
                  style={{
                    minWidth: 220,
                    flex: "0 0 220px",
                    backgroundColor: "#171717",
                    border: "1px solid #222222",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "11px 14px",
                      borderBottom: "1px solid #222222",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: stage.color }} />
                    <div style={{ width: 70, height: 11, backgroundColor: "#222222", borderRadius: 3 }} />
                  </div>
                  <div style={{ padding: "10px" }}>
                    {[...Array(2)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor: "#222222",
                          borderRadius: 4,
                          marginBottom: 6,
                          height: 60,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))
            : STAGES.map((stage) => (
                <KanbanColumn
                  key={stage.key}
                  stage={stage}
                  opps={stageMap.get(stage.key) ?? []}
                  companyMap={companyMap}
                />
              ))}
        </div>
      )}
    </div>
  );
}
