"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Building2, Lock, Mail, UserRound } from "lucide-react";
import { AuthLogo, AuthShell } from "@/components/auth/auth-shell";

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
    <AuthShell variant="register">
      <div className="auth-card">
        <div className="auth-card-header">
          <AuthLogo />
          <h2 className="auth-card-title">Register Organization</h2>
          <p className="auth-card-subtitle">Group Builder / New Organization Setup</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="orgName">Organization Name</label>
            <div className="auth-field-with-icon">
              <Building2 className="auth-input-icon" size={20} />
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
                placeholder="e.g. Juan dela Cruz"
                required
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
                placeholder="admin@yourorg.com"
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

          <div className="form-group">
            <label className="form-label" htmlFor="confirm">Confirm Password</label>
            <div className="auth-field-with-icon">
              <Lock className="auth-input-icon" size={20} />
              <input
                id="confirm"
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
            {loading ? "Registering..." : "Register Organization"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-link-stack">
          <p>
            Already have an account?{" "}
            <Link href="/login">Sign in</Link>
          </p>
          <p>
            Joining an existing organization?{" "}
            <Link href="/join">Join here</Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
