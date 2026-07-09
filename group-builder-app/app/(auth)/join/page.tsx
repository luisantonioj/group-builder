"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Building2, Lock, Mail, UserRound } from "lucide-react";
import { AuthLogo, AuthShell } from "@/components/auth/auth-shell";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgSlug,  setOrgSlug]  = useState(searchParams.get("org") ?? "");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error?.formErrors?.[0] ?? data.error ?? "Failed to join.";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        return;
      }
      router.push(`/login?orgSlug=${encodeURIComponent(data.orgSlug)}&joined=1`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell variant="join">
      <div className="auth-card">
        <div className="auth-card-header">
          <AuthLogo />
          <h2 className="auth-card-title">Join an Organization</h2>
          <p className="auth-card-subtitle">Group Builder / Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="orgSlug">Organization Slug</label>
            <div className="auth-field-with-icon">
              <Building2 className="auth-input-icon" size={20} />
              <input
                id="orgSlug"
                type="text"
                className="input"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="e.g. bld-youth-ministry"
                required
                autoFocus={!orgSlug}
              />
            </div>
            <span className="auth-helper">
              Ask your organization admin for the slug.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">Your Name</label>
            <div className="auth-field-with-icon">
              <UserRound className="auth-input-icon" size={20} />
              <input
                id="name"
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maria Santos"
                required
                autoFocus={!!orgSlug}
              />
            </div>
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
                placeholder="Minimum 8 characters"
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
            {loading ? "Creating account..." : "Create Account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-link-stack">
          <p>
            Already have an account?{" "}
            <Link href="/login">Sign in</Link>
          </p>
          <p>
            New organization?{" "}
            <Link href="/register">Register here</Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
