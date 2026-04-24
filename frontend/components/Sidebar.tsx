"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Building2,
} from "lucide-react";

const NAV = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads",    label: "Leads",     icon: Users           },
  { href: "/pipeline", label: "Pipeline",  icon: TrendingUp      },
  { href: "/accounts", label: "Accounts",  icon: Building2       },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        backgroundColor: "#171717",
        borderRight: "1px solid #222222",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid #222222",
        }}
      >
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: 15,
            color: "#eaeaea",
            letterSpacing: "-0.01em",
          }}
        >
          Crossmint
        </span>
        <span
          style={{
            display: "block",
            fontFamily: "Inter, sans-serif",
            fontWeight: 400,
            fontSize: 11,
            color: "#818181",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          CRM
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 8px" }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 4,
                marginBottom: 1,
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
                fontWeight: active ? 500 : 400,
                color: active ? "#eaeaea" : "#818181",
                backgroundColor: active ? "rgba(255,255,255,0.10)" : "transparent",
                textDecoration: "none",
                transition: "background-color 100ms ease, color 100ms ease",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = "#eaeaea";
                  el.style.backgroundColor = "rgba(255,255,255,0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = "#818181";
                  el.style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid #222222",
        }}
      >
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 10,
            color: "#818181",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Built for Crossmint BD
        </span>
      </div>
    </aside>
  );
}
