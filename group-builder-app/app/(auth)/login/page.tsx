"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orgSlug,   setOrgSlug]   = useState(searchParams.get("orgSlug") ?? "");
  const [orgName,   setOrgName]   = useState<string | null>(null);
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  // Show a success notice when redirected here after register/join
  const registered = searchParams.get("registered") === "1";
  const joined     = searchParams.get("joined")     === "1";

  // Lookup org name when orgSlug changes (on blur)
  async function lookupOrg(slug: string) {
    const s = slug.trim();
    if (!s) { setOrgName(null); return; }
    setLookingUp(true);
    try {
      const res = await fetch(`/api/org/lookup?slug=${encodeURIComponent(s)}`);
      if (res.ok) {
        const data = await res.json() as { name: string };
        setOrgName(data.name);
      } else {
        setOrgName(null);
      }
    } catch {
      setOrgName(null);
    } finally {
      setLookingUp(false);
    }
  }

  // Run lookup on mount if orgSlug was pre-filled from query param
  useEffect(() => {
    if (orgSlug) lookupOrg(orgSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      orgSlug: orgSlug.trim(),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid credentials or organization slug.");
    } else {
      router.refresh();
      router.push("/dashboard");
    }
  }

  function fillDemo() {
    setOrgSlug("bld-youth-ministry");
    setEmail("admin@bld.ph");
    setPassword("shepherd123");
    lookupOrg("bld-youth-ministry");
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
            {orgName
              ? `Signing into: ${orgName}`
              : "Group Builder · Sign in to your organization"}
          </p>
        </div>

        {(registered || joined) && (
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-success)",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-sm) var(--space-md)",
              marginBottom: "var(--space-lg)",
              textAlign: "center",
            }}
          >
            {registered ? "Organization registered! Sign in below." : "Account created! Sign in below."}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="orgSlug">
              Organization
              {lookingUp && <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}> · looking up…</span>}
            </label>
            <input
              id="orgSlug"
              type="text"
              className="input"
              value={orgSlug}
              onChange={(e) => { setOrgSlug(e.target.value); setOrgName(null); }}
              onBlur={(e) => lookupOrg(e.target.value)}
              placeholder="organization-slug"
              required
              autoFocus={!orgSlug}
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
              placeholder="you@example.com"
              required
              autoFocus={!!orgSlug}
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

        <div style={{ marginTop: "var(--space-lg)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-sm)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
            New organization?{" "}
            <Link href="/register" style={{ color: "var(--color-primary)" }}>Register here</Link>
          </p>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
            Joining an existing org?{" "}
            <Link href="/join" style={{ color: "var(--color-primary)" }}>Create account</Link>
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <button
            type="button"
            onClick={fillDemo}
            style={{
              marginTop: "var(--space-lg)",
              width: "100%",
              background: "var(--bg-hover)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-sm)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Dev: fill BLD demo credentials
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
