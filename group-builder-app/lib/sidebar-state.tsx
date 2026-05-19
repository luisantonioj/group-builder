"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SidebarStateValue {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarStateContext = createContext<SidebarStateValue>(null!);

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    } else {
      // Auto-collapse on tablet (768–1023px)
      setCollapsed(window.innerWidth >= 768 && window.innerWidth < 1024);
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarStateContext.Provider value={{ collapsed, mobileOpen, toggleCollapsed, openMobile, closeMobile }}>
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState() {
  return useContext(SidebarStateContext);
}
