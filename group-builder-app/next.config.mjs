import withPWAInit from "@ducanh2912/next-pwa";

// Note: urlPattern functions are serialized into the generated service worker,
// so they must be self-contained (no references to variables in this file).
const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  // Shown when navigating offline to a page that was never cached.
  fallbacks: { document: "/offline" },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // API — always hit the network. Offline reads come from IndexedDB, and writes go
      // through the app's sync queue, so the SW must never serve stale API data.
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
      },
      // Built JS/CSS chunks are content-hashed — safe to cache forever.
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static/"),
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // Images, icons, fonts
      {
        urlPattern: /\.(?:woff2?|png|jpg|jpeg|svg|ico|webp)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      // Client-side navigations (React Server Component payloads)
      {
        urlPattern: ({ request, url, sameOrigin }) =>
          sameOrigin && request.headers.get("RSC") === "1" && !url.pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-rsc",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      // Full page loads (HTML). Fresh when online; cached copy when offline or slow.
      {
        urlPattern: ({ request, url, sameOrigin }) =>
          sameOrigin &&
          !url.pathname.startsWith("/api/") &&
          request.headers.get("RSC") !== "1" &&
          (request.mode === "navigate" || (request.headers.get("Accept") || "").includes("text/html")),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-cache",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      // Google Fonts
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

export default withPWA(nextConfig);
