"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: { name: string; role: string };
}

const NAV_ITEMS = [
  {
    section: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    ],
  },
  {
    section: "Candidate Data",
    items: [
      { href: "/masterlist", label: "Masterlist", icon: "users" },
      { href: "/visualizer", label: "Connections", icon: "network" },
    ],
  },
  {
    section: "Planning",
    items: [
      { href: "/groups", label: "Group Formation", icon: "grid" },
      { href: "/rooms", label: "Room Assignment", icon: "bed" },
    ],
  },
  {
    section: "Output",
    items: [
      { href: "/reports", label: "Reports & Export", icon: "file" },
    ],
  },
];

// Inline SVG icons matching the mockup's Lucide-style set
function NavIcon({ name }: { name: string }) {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "dashboard": return <svg {...props}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
    case "users": return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "network": return <svg {...props}><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><line x1="12" y1="7" x2="5" y2="17" /><line x1="12" y1="7" x2="19" y2="17" /></svg>;
    case "grid": return <svg {...props}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
    case "bed": return <svg {...props}><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>;
    case "file": return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
    default: return null;
  }
}

function roleLabel(role: string) {
  if (role === "ADMIN") return "Head Shepherd";
  if (role === "VIEWER") return "Viewer";
  return "Shepherd";
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-sm)", lineHeight: 1.2 }}>Group Builder</div>
            <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)", lineHeight: 1.2 }}>BLD Youth Ministry</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => (
          <div key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("sidebar-link", pathname.startsWith(item.href) && "active")}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: "var(--space-lg)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}>
          <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)", color: "white", flexShrink: 0 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ color: "var(--text-sidebar-active)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>{roleLabel(user.role)}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "none", color: "var(--text-muted)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", padding: "6px 10px", borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "center", fontFamily: "var(--font-sans)", transition: "background var(--transition-fast)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
