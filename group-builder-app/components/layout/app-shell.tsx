"use client";

import { useEffect } from "react";
import { useSidebarState } from "@/lib/sidebar-state";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed, mobileOpen, closeMobile } = useSidebarState();

  // Keep --current-sidebar-width in sync with state and viewport
  useEffect(() => {
    function update() {
      const isMobile = window.innerWidth < 1024;
      document.documentElement.style.setProperty(
        "--current-sidebar-width",
        isMobile ? "0px" : collapsed ? "64px" : "var(--sidebar-width)"
      );
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
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
