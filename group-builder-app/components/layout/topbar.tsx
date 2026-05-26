"use client";

import { useCallback, useEffect, useState } from "react";
import { useSidebarState } from "@/lib/sidebar-state";
import { useApp } from "@/lib/store";

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("app-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(saved === "dark" || (!saved && prefersDark));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("app-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        background: "none",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-sm)",
        padding: "6px",
        cursor: "pointer",
        color: "var(--text-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background var(--transition-fast)",
      }}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function Topbar() {
  const { openMobile } = useSidebarState();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { event } = useApp();

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    window.location.reload();
  }, []);

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        {/* Hamburger — visible on mobile only via CSS */}
        <button
          className="topbar-menu-btn"
          onClick={openMobile}
          aria-label="Open navigation menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <span className="topbar-batch-info" style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
          {event.name} · {event.isActive ? "Active" : "Inactive"}
        </span>
        {event.isActive && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "#f0fdf4",
              color: "var(--color-success)",
              border: "1px solid #bbf7d0",
              borderRadius: "var(--radius-full)",
              padding: "2px 8px",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-success)", display: "inline-block" }} />
            Active
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        <ThemeToggle />
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={isRefreshing}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={isRefreshing ? "icon-spin" : ""}
            style={{ display: "block" }}
          >
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>
    </header>
  );
}
