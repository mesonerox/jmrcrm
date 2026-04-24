"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  useInboundLeads,
  tierColor,
  formatDate,
  type TwentyInboundLead,
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

function ScoreBar({ score }: { score?: number }) {
  const pct = score ?? 0;
  const color =
    pct >= 80 ? "#eaeaea" : pct >= 50 ? "#fbbf24" : "#818181";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 90 }}>
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

const nextActionColors: Record<string, { bg: string; text: string; border: string }> = {
  BOOK_DEMO:        { bg: "rgba(255,255,255,0.08)", text: "#eaeaea", border: "rgba(255,255,255,0.18)" },
  NURTURE:          { bg: "rgba(56,189,248,0.08)",  text: "#7dd3fc", border: "rgba(56,189,248,0.2)"  },
  DISCARD:          { bg: "rgba(255,68,68,0.08)",   text: "#f87171", border: "rgba(255,68,68,0.2)"   },
  ROUTE_TO_PARTNER: { bg: "rgba(123,97,255,0.08)",  text: "#a78bfa", border: "rgba(123,97,255,0.2)"  },
};

const nextActionLabel: Record<string, string> = {
  BOOK_DEMO:        "Book Demo",
  NURTURE:          "Nurture",
  DISCARD:          "Discard",
  ROUTE_TO_PARTNER: "Route to Partner",
};

// ── Row component ─────────────────────────────────────────────────────────────

function LeadRow({ lead }: { lead: TwentyInboundLead }) {
  const [expanded, setExpanded] = useState(false);
  const tColors = tierColor(lead.icpTier);
  const naColors =
    nextActionColors[lead.nextAction ?? ""] ?? {
      bg: "rgba(255,255,255,0.06)",
      text: "#818181",
      border: "rgba(255,255,255,0.12)",
    };

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        style={{
          height: 48,
          cursor: "pointer",
          backgroundColor: expanded ? "rgba(255,255,255,0.06)" : "transparent",
          transition: "background-color 100ms ease",
        }}
        onMouseEnter={(e) => {
          if (!expanded) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(255,255,255,0.06)";
        }}
        onMouseLeave={(e) => {
          if (!expanded) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
        }}
      >
        {/* Expand toggle */}
        <td style={tdStyle}>
          <span style={{ color: "#818181" }}>
            {expanded
              ? <ChevronDown size={14} />
              : <ChevronRight size={14} />}
          </span>
        </td>

        {/* Name + Role */}
        <td style={tdStyle}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: "#eaeaea" }}>
            {lead.name ?? "—"}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#818181", marginTop: 1 }}>
            {lead.jobRole ?? ""}
          </div>
        </td>

        {/* Company */}
        <td style={{ ...tdStyle, color: "#b3b3b3", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
          {lead.company ?? "—"}
        </td>

        {/* ICP Score bar */}
        <td style={tdStyle}>
          <ScoreBar score={lead.icpScore} />
        </td>

        {/* Tier badge */}
        <td style={tdStyle}>
          {lead.icpTier ? (
            <Badge
              label={lead.icpTier}
              bg={tColors.bg}
              text={tColors.text}
              border={tColors.border}
            />
          ) : (
            <span style={{ color: "#818181", fontSize: 12 }}>—</span>
          )}
        </td>

        {/* Next action */}
        <td style={tdStyle}>
          {lead.nextAction ? (
            <Badge
              label={nextActionLabel[lead.nextAction] ?? lead.nextAction}
              bg={naColors.bg}
              text={naColors.text}
              border={naColors.border}
            />
          ) : (
            <span style={{ color: "#818181", fontSize: 12 }}>—</span>
          )}
        </td>

        {/* Created date */}
        <td
          style={{
            ...tdStyle,
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            color: "#818181",
          }}
        >
          {formatDate(lead.createdAt)}
        </td>
      </tr>

      {/* Expanded rationale */}
      {expanded && (
        <tr style={{ backgroundColor: "#171717" }}>
          <td />
          <td colSpan={6} style={{ padding: "12px 16px 16px" }}>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                color: "#b3b3b3",
                lineHeight: 1.6,
                borderLeft: "2px solid #222222",
                paddingLeft: 12,
              }}
            >
              {lead.icpRationale ? (
                <>
                  <span style={{ color: "#818181", fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    ICP Rationale
                  </span>
                  <br />
                  <span style={{ color: "#eaeaea" }}>{lead.icpRationale}</span>
                </>
              ) : (
                <span style={{ color: "#818181" }}>No rationale available.</span>
              )}
              {lead.useCase && (
                <div style={{ marginTop: 10 }}>
                  <span style={{ color: "#818181", fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Use Case
                  </span>
                  <br />
                  <span style={{ color: "#eaeaea" }}>{lead.useCase}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "0 16px",
  borderBottom: "1px solid #222222",
  verticalAlign: "middle",
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { inboundLeads, isLoading, error } = useInboundLeads();

  const sorted = [...inboundLeads].sort(
    (a, b) => (b.icpScore ?? 0) - (a.icpScore ?? 0)
  );

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
          Inbound Lead Queue
        </h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#818181", margin: "6px 0 0" }}>
          {isLoading
            ? "Loading…"
            : `${sorted.length} lead${sorted.length !== 1 ? "s" : ""} — sorted by ICP score`}
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
            Failed to load leads: {error.message}
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
                <div style={{ width: 16, height: 16, backgroundColor: "#222222", borderRadius: 3 }} />
                <div style={{ width: 130, height: 12, backgroundColor: "#222222", borderRadius: 3 }} />
                <div style={{ width: 90, height: 12, backgroundColor: "#222222", borderRadius: 3 }} />
                <div style={{ width: 80, height: 5, backgroundColor: "#222222", borderRadius: 2 }} />
                <div style={{ marginLeft: "auto", width: 36, height: 18, backgroundColor: "#222222", borderRadius: 4 }} />
                <div style={{ width: 70, height: 18, backgroundColor: "#222222", borderRadius: 4 }} />
                <div style={{ width: 80, height: 12, backgroundColor: "#222222", borderRadius: 3 }} />
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
            No inbound leads yet — qualify a lead to populate this queue.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 36 }} />
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>ICP Score</th>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>Next Action</th>
                <th style={thStyle}>Created</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
