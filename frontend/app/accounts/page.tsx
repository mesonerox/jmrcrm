"use client";

import {
  useCompanies,
  healthColor,
  churnRiskColor,
  type TwentyCompany,
} from "@/lib/twenty-api";

// ── Shared primitives ─────────────────────────────────────────────────────────

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
        padding: "2px 9px",
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

function HealthBar({ score }: { score?: number }) {
  const pct = score ?? 0;
  const color = healthColor(score);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 110 }}>
      <div
        style={{
          flex: 1,
          height: 3,
          backgroundColor: "#222222",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 2,
            transition: "width 400ms ease",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          color,
          minWidth: 26,
          textAlign: "right",
        }}
      >
        {score ?? "—"}
      </span>
    </div>
  );
}

const segColors: Record<string, { bg: string; text: string; border: string }> = {
  STRATEGIC: { bg: "rgba(123,97,255,0.12)", text: "#a78bfa", border: "rgba(123,97,255,0.3)"  },
  ENTERPRISE: { bg: "rgba(245,158,11,0.10)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" },
  SMB:        { bg: "rgba(56,189,248,0.10)", text: "#7dd3fc", border: "rgba(56,189,248,0.25)" },
  DEVELOPER:  { bg: "rgba(255,255,255,0.06)", text: "#b3b3b3", border: "rgba(255,255,255,0.12)" },
};

const tdStyle: React.CSSProperties = {
  padding: "0 16px",
  borderBottom: "1px solid #222222",
  verticalAlign: "middle",
  height: 48,
};

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontFamily: "Inter, sans-serif",
  fontSize: 10,
  fontWeight: 500,
  color: "#818181",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  borderBottom: "1px solid #222222",
  whiteSpace: "nowrap",
};

// ── Row ───────────────────────────────────────────────────────────────────────

function AccountRow({ company }: { company: TwentyCompany }) {
  const seg = company.segment ?? "";
  const sc = segColors[seg] ?? {
    bg: "rgba(255,255,255,0.06)",
    text: "#818181",
    border: "rgba(255,255,255,0.12)",
  };
  const churnColors = churnRiskColor(company.churnRisk);
  const churnLabel = company.churnRisk
    ? company.churnRisk.charAt(0) + company.churnRisk.slice(1).toLowerCase()
    : null;

  return (
    <tr
      style={{ cursor: "default" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
      }}
    >
      {/* Company name */}
      <td style={tdStyle}>
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
        {company.domainName?.primaryLinkUrl && (
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              color: "#818181",
              marginTop: 2,
            }}
          >
            {company.domainName.primaryLinkUrl.replace("https://", "")}
          </div>
        )}
      </td>

      {/* Segment */}
      <td style={tdStyle}>
        {seg ? (
          <Badge
            label={seg.charAt(0) + seg.slice(1).toLowerCase()}
            bg={sc.bg}
            text={sc.text}
            border={sc.border}
          />
        ) : (
          <span style={{ color: "#222222", fontSize: 13 }}>—</span>
        )}
      </td>

      {/* Health Score */}
      <td style={tdStyle}>
        <HealthBar score={company.healthScore} />
      </td>

      {/* Churn Risk */}
      <td style={tdStyle}>
        {churnLabel ? (
          <Badge
            label={churnLabel}
            bg={churnColors.bg}
            text={churnColors.text}
            border={churnColors.border}
          />
        ) : (
          <span style={{ color: "#222222", fontSize: 13 }}>—</span>
        )}
      </td>

      {/* Wallet Count */}
      <td
        style={{
          ...tdStyle,
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          color: company.activeWalletCount != null ? "#b3b3b3" : "#222222",
          textAlign: "right",
        }}
      >
        {company.activeWalletCount?.toLocaleString() ?? "—"}
      </td>

      {/* Monthly API Calls */}
      <td
        style={{
          ...tdStyle,
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          color: company.monthlyApiCalls != null ? "#b3b3b3" : "#222222",
          textAlign: "right",
        }}
      >
        {company.monthlyApiCalls != null
          ? company.monthlyApiCalls >= 1_000_000
            ? `${(company.monthlyApiCalls / 1_000_000).toFixed(1)}M`
            : company.monthlyApiCalls >= 1_000
            ? `${(company.monthlyApiCalls / 1_000).toFixed(0)}K`
            : company.monthlyApiCalls.toLocaleString()
          : "—"}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { companies, isLoading, error } = useCompanies();

  const sorted = [...companies].sort((a, b) => {
    const hs = (b.healthScore ?? 0) - (a.healthScore ?? 0);
    if (hs !== 0) return hs;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="page-enter" style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
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
          Account Health Grid
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#818181", margin: "6px 0 0" }}>
          {isLoading
            ? "Loading…"
            : `${sorted.length} account${sorted.length !== 1 ? "s" : ""} — sorted by health score`}
        </p>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: "#171717",
          border: "1px solid #222222",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {error ? (
          <div style={{ padding: 32, color: "#f87171", fontSize: 13 }}>
            Failed to load accounts: {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: 32 }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  borderBottom: "1px solid #222222",
                }}
              >
                <div style={{ width: 140, height: 12, backgroundColor: "#222222", borderRadius: 3 }} />
                <div style={{ width: 70, height: 18, backgroundColor: "#222222", borderRadius: 4 }} />
                <div style={{ width: 100, height: 5, backgroundColor: "#222222", borderRadius: 2 }} />
                <div style={{ width: 50, height: 18, backgroundColor: "#222222", borderRadius: 4 }} />
                <div style={{ marginLeft: "auto", width: 50, height: 12, backgroundColor: "#222222", borderRadius: 3 }} />
                <div style={{ width: 60, height: 12, backgroundColor: "#222222", borderRadius: 3 }} />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div
            style={{
              padding: "64px 32px",
              textAlign: "center",
              color: "#818181",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
            }}
          >
            No accounts seeded yet — run the seed script to populate company data.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Segment</th>
                <th style={thStyle}>Health Score</th>
                <th style={thStyle}>Churn Risk</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Wallets</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Monthly API Calls</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((company) => (
                <AccountRow key={company.id} company={company} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
