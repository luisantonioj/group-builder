"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Building2, Lock, Mail } from "lucide-react";
import { AuthLogo, AuthShell } from "@/components/auth/auth-shell";

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
    <AuthShell variant="login">
      <div className="auth-card">
        <div className="auth-card-header">
          <AuthLogo />
          <h2 className="auth-card-title">Shepherd&apos;s Grouping System</h2>
          <p className="auth-card-subtitle">
            {orgName ? `Signing into: ${orgName}` : "Sign in to your organization"}
          </p>
        </div>

        {(registered || joined) && (
          <p className="auth-alert auth-alert-success" style={{ marginBottom: "var(--space-lg)" }}>
            {registered ? "Organization registered! Sign in below." : "Account created! Sign in below."}
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="orgSlug">
              Organization Slug
              {lookingUp && <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}> / looking up...</span>}
            </label>
            <div className="auth-field-with-icon">
              <Building2 className="auth-input-icon" size={20} />
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
            <span className="auth-helper">Ask your organization admin for the slug.</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <div className="auth-field-with-icon">
              <Mail className="auth-input-icon" size={20} />
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
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="auth-field-with-icon">
              <Lock className="auth-input-icon" size={20} />
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <p className="auth-alert auth-alert-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-link-stack">
          <p>
            New organization?{" "}
            <Link href="/register">Register here</Link>
          </p>
          <p>
            Joining an existing organization?{" "}
            <Link href="/join">Join here</Link>
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <button
            type="button"
            onClick={fillDemo}
            className="auth-dev-fill"
          >
            Dev: fill BLD demo credentials
          </button>
        )}
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
