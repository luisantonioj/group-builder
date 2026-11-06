"use client";

import { useEffect } from "react";
import { useSidebarState } from "@/lib/sidebar-state";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed, mobileOpen, closeMobile } = useSidebarState();

  // Keep --current-sidebar-width in sync with state and viewport
  useEffect(() => {
    // Same breakpoint as the CSS (max-width: 1023px). matchMedia fires on every
    // breakpoint change (rotation, zoom, devtools emulation), unlike a resize check.
    const mobileQuery = window.matchMedia("(max-width: 1023px)");
    function update() {
      document.documentElement.style.setProperty(
        "--current-sidebar-width",
        mobileQuery.matches ? "0px" : collapsed ? "64px" : "var(--sidebar-width)"
      );
    }
    update();
    mobileQuery.addEventListener("change", update);
    return () => mobileQuery.removeEventListener("change", update);
  }, [collapsed]);

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobile} aria-hidden="true" />
      )}
      <div className="main-wrapper">
        {children}
      </div>
    </>
  );
}
