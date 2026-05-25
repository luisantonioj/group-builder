"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Event } from "@/types";

function EventSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";
  const [name, setName] = useState("");
  const [featureVisualizer, setFeatureVisualizer] = useState(true);
  const [featureRoomAssignment, setFeatureRoomAssignment] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), featureVisualizer, featureRoomAssignment, isActive: true }),
      });
      const data = await res.json() as { data?: Event; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to create event.");
        return;
      }
      const id = data.data?.id;
      router.push(id ? `/events?load=${id}` : "/dashboard");
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
          maxWidth: "460px",
          background: "var(--bg-card)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-modal)",
          padding: "var(--space-2xl)",
        }}
      >
        {/* Header */}
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
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)", margin: 0 }}>
            {isOnboarding ? "Create Your First Event" : "New Event"}
          </h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", marginTop: 4 }}>
            {isOnboarding
              ? "Set up your first event to get started with Group Builder."
              : "Configure the features for this event."}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          {/* Event name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name">Event Name</label>
            <input
              id="name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Youth Encounter #20"
              required
              autoFocus
            />
          </div>

          {/* Feature toggles */}
          <div>
            <p style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)", marginBottom: "var(--space-md)" }}>
              Features
            </p>

            {/* Always-on notice */}
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--text-muted)",
                background: "var(--bg-hover)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-sm) var(--space-md)",
                marginBottom: "var(--space-md)",
              }}
            >
              Dashboard, Masterlist, and Reports are always available for every event.
            </div>

            <ToggleRow
              id="featureVisualizer"
              label="Connections Visualizer"
              description="Graph view showing relationships between candidates."
              checked={featureVisualizer}
              onChange={setFeatureVisualizer}
            />
            <ToggleRow
              id="featureRoomAssignment"
              label="Room Assignment"
              description="Assign candidates to rooms with gender and capacity constraints."
              checked={featureRoomAssignment}
              onChange={setFeatureRoomAssignment}
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
            disabled={loading || !name.trim()}
            style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}
          >
            {loading ? "Creating…" : isOnboarding ? "Create Event & Continue" : "Create Event"}
          </button>
        </form>

        {!isOnboarding && (
          <p style={{ marginTop: "var(--space-lg)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)", textAlign: "center" }}>
            <a href="/events" style={{ color: "var(--color-primary)" }}>← Back to All Events</a>
          </p>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-md)",
        padding: "var(--space-md)",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${checked ? "var(--color-primary)" : "var(--border-color)"}`,
        background: checked ? "rgba(79,70,229,0.04)" : "transparent",
        cursor: "pointer",
        marginBottom: "var(--space-sm)",
        transition: "all var(--transition-fast)",
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: "var(--color-primary)", width: 16, height: 16, flexShrink: 0 }}
      />
      <div>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)" }}>
          {label}
        </div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: 2 }}>
          {description}
        </div>
      </div>
    </label>
  );
}

export default function EventSetupPage() {
  return (
    <Suspense>
      <EventSetupForm />
    </Suspense>
  );
}
