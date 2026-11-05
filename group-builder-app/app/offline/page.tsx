"use client";

// Fallback page the service worker serves when navigating offline to a page that isn't cached.
// Must be fully static — it's precached at build time.

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <div className="offline-card">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
          <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
          <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
          <path d="M5 13a10 10 0 0 1 5.24-2.76" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <h1>You&apos;re offline</h1>
        <p>
          This page hasn&apos;t been saved for offline use yet. Pages you&apos;ve opened before still work, and
          any changes you make are saved on this device and sync when you reconnect.
        </p>
        <div className="offline-actions">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
          <a className="btn btn-secondary" href="/dashboard">
            Go to dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
