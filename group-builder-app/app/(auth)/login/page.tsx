"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-sidebar)",
        padding: "var(--space-lg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--bg-card)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          padding: "var(--space-2xl)",
        }}
      >
        {/* Logo / title */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: "var(--radius-lg)",
              background: "var(--color-primary)",
              marginBottom: "var(--space-md)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--text-primary)",
            }}
          >
            Shepherd&apos;s Grouping System
          </h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", marginTop: 4 }}>
            BLD Youth Ministry · Youth Encounter
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="shepherd@bld.ph"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-danger)",
                background: "var(--color-conflict-bg)",
                border: "1px solid var(--color-conflict-border)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-sm) var(--space-md)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {process.env.NODE_ENV === "development" && (
          <p
            style={{
              marginTop: "var(--space-lg)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-muted)",
              textAlign: "center",
              background: "var(--bg-hover)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-sm)",
            }}
          >
            Dev: <strong>admin@bld.ph</strong> / <strong>shepherd123</strong>
          </p>
        )}
      </div>
    </div>
  );
}
