"use client";

import {
  useCompanies,
  useInboundLeads,
  useOpportunities,
  isThisWeek,
  tierColor,
  formatDate,
} from "@/lib/twenty-api";

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  accent = false,
  isLoading,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  isLoading: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "#171717",
        border: "1px solid #222222",
        borderTop: `2px solid ${accent ? "rgba(255,255,255,0.15)" : "#222222"}`,
        borderRadius: 8,
        padding: "20px 24px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          fontWeight: 500,
          color: "#818181",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        {label}
      </div>
      {isLoading ? (
        <div
          style={{
            height: 36,
            width: 72,
            backgroundColor: "#222222",
            borderRadius: 4,
          }}
        />
      ) : (
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 36,
            fontWeight: 600,
            color: "#eaeaea",
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function Badge({
  label,
  bg,
  text,
  border,
}: {
  label: string;
  bg: string;
  text: string;
  border: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 4,
        border: `1px solid ${border}`,
        backgroundColor: bg,
        color: text,
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function SkeletonRow({ cols = 3 }: { cols?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid #222222",
      }}
    >
      <div style={{ width: 120, height: 13, backgroundColor: "#222222", borderRadius: 3 }} />
      {cols > 1 && <div style={{ width: 80, height: 13, backgroundColor: "#222222", borderRadius: 3 }} />}
      {cols > 2 && <div style={{ marginLeft: "auto", width: 40, height: 18, backgroundColor: "#222222", borderRadius: 4 }} />}
    </div>
  );
}

const segColors: Record<string, { bg: string; text: string; border: string }> = {
  STRATEGIC: { bg: "rgba(123,97,255,0.12)", text: "#a78bfa", border: "rgba(123,97,255,0.3)" },
  ENTERPRISE: { bg: "rgba(245,158,11,0.10)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" },
  SMB:        { bg: "rgba(56,189,248,0.10)", text: "#7dd3fc", border: "rgba(56,189,248,0.25)" },
  DEVELOPER:  { bg: "rgba(255,255,255,0.06)", text: "#b3b3b3", border: "rgba(255,255,255,0.12)" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { companies, isLoading: cLoading } = useCompanies();
  const { inboundLeads, isLoading: lLoading } = useInboundLeads();
  const { opportunities, isLoading: oLoading } = useOpportunities();

  const leadsThisWeek = inboundLeads.filter(
    (l) => l.createdAt && isThisWeek(l.createdAt)
  );
  const tierALeads = inboundLeads.filter((l) => l.icpTier === "A");
  const recentLeads = [...inboundLeads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const topAccounts = companies.slice(0, 5);

  return (
    <div className="page-enter" style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
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
          Revenue Dashboard
        </h1>
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: "#818181",
            margin: "6px 0 0",
          }}
        >
          Crossmint BD intelligence — live from Twenty CRM
        </p>
      </div>

      {/* Metric cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <MetricCard
          label="Open Pipeline"
          value={opportunities.length}
          isLoading={oLoading}
        />
        <MetricCard
          label="Inbound Leads This Week"
          value={leadsThisWeek.length}
          accent
          isLoading={lLoading}
        />
        <MetricCard
          label="Accounts Seeded"
          value={companies.length}
          isLoading={cLoading}
        />
        <MetricCard
          label="Tier A Leads"
          value={tierALeads.length}
          accent
          isLoading={lLoading}
        />
      </div>

      {/* Two-column */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Recent Inbound Leads */}
        <div
          style={{
            backgroundColor: "#171717",
            border: "1px solid #222222",
            borderRadius: 8,
            padding: "20px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#eaeaea",
                margin: 0,
              }}
            >
              Recent Inbound Leads
            </h2>
            <a
              href="/leads"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                color: "#b3b3b3",
                textDecoration: "none",
              }}
            >
              View all →
            </a>
          </div>

          {lLoading ? (
            [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
          ) : recentLeads.length === 0 ? (
            <p style={{ color: "#818181", fontSize: 13, margin: 0 }}>No leads yet.</p>
          ) : (
            recentLeads.map((lead, i) => {
              const colors = tierColor(lead.icpTier);
              return (
                <div
                  key={lead.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 0",
                    borderBottom:
                      i < recentLeads.length - 1 ? "1px solid #222222" : "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#eaeaea",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {lead.name ?? "Unknown"}
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "#818181",
                        marginTop: 2,
                      }}
                    >
                      {lead.company ?? "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
                    {lead.icpTier && (
                      <Badge
                        label={lead.icpTier}
                        bg={colors.bg}
                        text={colors.text}
                        border={colors.border}
                      />
                    )}
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "#818181",
                      }}
                    >
                      {formatDate(lead.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Top Accounts */}
        <div
          style={{
            backgroundColor: "#171717",
            border: "1px solid #222222",
            borderRadius: 8,
            padding: "20px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#eaeaea",
                margin: 0,
              }}
            >
              Top Accounts
            </h2>
            <a
              href="/accounts"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                color: "#b3b3b3",
                textDecoration: "none",
              }}
            >
              View all →
            </a>
          </div>

          {cLoading ? (
            [...Array(5)].map((_, i) => <SkeletonRow key={i} cols={2} />)
          ) : topAccounts.length === 0 ? (
            <p style={{ color: "#818181", fontSize: 13, margin: 0 }}>No accounts seeded yet.</p>
          ) : (
            topAccounts.map((company, i) => {
              const seg = company.segment ?? "";
              const sc = segColors[seg] ?? {
                bg: "rgba(255,255,255,0.06)",
                text: "#818181",
                border: "rgba(255,255,255,0.12)",
              };

              return (
                <div
                  key={company.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 0",
                    borderBottom:
                      i < topAccounts.length - 1 ? "1px solid #222222" : "none",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#eaeaea",
                    }}
                  >
                    {company.name}
                  </div>
                  {seg && (
                    <Badge
                      label={seg.charAt(0) + seg.slice(1).toLowerCase()}
                      bg={sc.bg}
                      text={sc.text}
                      border={sc.border}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
