"use client";

import { useEffect } from "react";

const APP_ROUTES = [
  "/dashboard",
  "/masterlist",
  "/visualizer",
  "/groups",
  "/rooms",
  "/reports",
];

// Silently pre-fetches every app route so the service worker caches their HTML.
// This ensures all pages are available offline even if never explicitly visited.
export default function CacheWarmer() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const warm = async () => {
      // Delay 3s so initial page resources load first
      await new Promise((r) => setTimeout(r, 3000));
      await Promise.allSettled(
        APP_ROUTES.map((route) =>
          fetch(route, {
            method: "GET",
            headers: { Accept: "text/html" },
            credentials: "include",
          }).catch(() => {})
        )
      );
    };

    warm();
  }, []);

  return null;
}
