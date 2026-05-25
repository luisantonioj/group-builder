"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [orgName,  setOrgName]  = useState("");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error?.formErrors?.[0] ?? data.error ?? "Registration failed.";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        return;
      }
      router.push(`/login?orgSlug=${encodeURIComponent(data.orgSlug)}&registered=1`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
          maxWidth: "420px",
          background: "var(--bg-card)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          padding: "var(--space-2xl)",
        }}
      >
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
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)" }}>
            Register Organization
          </h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", marginTop: 4 }}>
            Group Builder · New Organization Setup
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="orgName">Organization Name</label>
            <input
              id="orgName"
              type="text"
              className="input"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. My Youth Ministry"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">Your Name</label>
            <input
              id="name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Juan dela Cruz"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourorg.com"
              required
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
              placeholder="Minimum 8 characters"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {loading ? "Registering…" : "Register Organization"}
          </button>
        </form>

        <p style={{ marginTop: "var(--space-lg)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--color-primary)" }}>Sign in</Link>
        </p>
        <p style={{ marginTop: "var(--space-sm)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)", textAlign: "center" }}>
          Joining an existing organization?{" "}
          <Link href="/join" style={{ color: "var(--color-primary)" }}>Join here</Link>
        </p>
      </div>
    </div>
  );
}
