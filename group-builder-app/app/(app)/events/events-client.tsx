"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { useTerms } from "@/lib/use-terms";
import type { Event } from "@/types";

interface EventWithCount extends Event {
  _count?: { candidates: number };
}

export default function EventsClient({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { event: currentEvent, setEvent, loadEventData } = useApp();
  const terms = useTerms();

  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Auto-load a newly created event when redirected from setup
  useEffect(() => {
    const loadId = searchParams.get("load");
    if (!loadId || loading) return;
    const target = events.find((e) => e.id === loadId);
    if (target) handleLoad(target);
  }, [loading, events]);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Failed to load events");
      const data = await res.json() as { data: EventWithCount[] };
      setEvents(data.data ?? []);
    } catch {
      setError("Could not load events. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoad(ev: EventWithCount) {
    setSwitching(ev.id);
    setEvent(ev);
    await loadEventData(ev.id);
    setSwitching(null);
    router.push("/dashboard");
  }

  async function handleToggleFeature(ev: EventWithCount, field: "featureVisualizer" | "featureRoomAssignment") {
    const updated = { ...ev, [field]: !ev[field] };
    try {
      const res = await fetch(`/api/events/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !ev[field] }),
      });
      if (res.ok) {
        setEvents((prev) => prev.map((e) => (e.id === ev.id ? updated : e)));
        if (currentEvent.id === ev.id) setEvent(updated);
      }
    } catch { /* ignore */ }
  }

  async function handleRename(ev: EventWithCount) {
    if (!editName.trim() || editName.trim() === ev.name) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/events/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        const updated = { ...ev, name: editName.trim() };
        setEvents((prev) => prev.map((e) => (e.id === ev.id ? updated : e)));
        if (currentEvent.id === ev.id) setEvent(updated);
      }
    } catch { /* ignore */ }
    setEditingId(null);
  }

  async function handleDelete(ev: EventWithCount) {
    if (!confirm(`Delete "${ev.name}"? This will permanently remove all its candidates, groups, and rooms.`)) return;
    setDeletingId(ev.id);
    try {
      const res = await fetch(`/api/events/${ev.id}`, { method: "DELETE" });
      if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== ev.id));
    } catch { /* ignore */ }
    setDeletingId(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            All {terms.event}s
          </h1>
          <p className="page-sub">
            Manage events for your organization. Click an event to load it.
          </p>
        </div>
        {isAdmin && (
          <a
            href="/events/setup"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New {terms.event}
          </a>
        )}
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "var(--space-2xl)" }}>Loading…</p>
      )}

      {error && (
        <p style={{ color: "var(--color-danger)", background: "var(--color-conflict-bg)", border: "1px solid var(--color-conflict-border)", borderRadius: "var(--radius-sm)", padding: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
          {error}
        </p>
      )}

      {!loading && events.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-2xl)", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "var(--font-size-lg)", marginBottom: "var(--space-md)" }}>No events yet.</p>
          {isAdmin && (
            <a href="/events/setup" className="btn btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
              Create your first {terms.event.toLowerCase()}
            </a>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "var(--space-lg)" }}>
        {events.map((ev) => {
          const isLoaded = currentEvent.id === ev.id;
          const isSwitching = switching === ev.id;
          const isDeleting = deletingId === ev.id;

          return (
            <div
              key={ev.id}
              style={{
                background: "var(--bg-card)",
                border: `2px solid ${isLoaded ? "var(--color-primary)" : "var(--border-color)"}`,
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-lg)",
                transition: "all var(--transition-fast)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: isLoaded ? "var(--shadow-md)" : "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
                {/* Name + badges */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === ev.id ? (
                    <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
                      <input
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRename(ev); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus
                        style={{ maxWidth: "100%" }}
                      />
                      <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "var(--font-size-xs)" }} onClick={() => handleRename(ev)}>Save</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
                      <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)", margin: 0 }}>
                        {ev.name}
                      </h2>
                      {ev.isActive && (
                        <span className="chip chip-success">
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                          Active
                        </span>
                      )}
                      {isLoaded && (
                        <span className="chip" style={{ background: "var(--color-primary)", color: "white" }}>
                          Loaded
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: "var(--space-xs)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
                    Created {new Date(ev.createdAt).toLocaleDateString()} · <strong>{ev._count?.candidates ?? 0}</strong> candidates
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "var(--space-xs)", flexShrink: 0, alignItems: "center" }}>
                  {isAdmin && editingId !== ev.id && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditingId(ev.id); setEditName(ev.name); }}
                      title="Rename"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(ev)}
                      disabled={isDeleting}
                      style={{ color: "var(--color-danger)" }}
                      title="Delete event"
                    >
                      {isDeleting ? "…" : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)", marginTop: "auto" }}>
                <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
                  <FeatureChip
                    label="Connections"
                    active={ev.featureVisualizer}
                    editable={isAdmin && editingId !== ev.id}
                    onToggle={() => handleToggleFeature(ev, "featureVisualizer")}
                  />
                  <FeatureChip
                    label="Rooms"
                    active={ev.featureRoomAssignment}
                    editable={isAdmin && editingId !== ev.id}
                    onToggle={() => handleToggleFeature(ev, "featureRoomAssignment")}
                  />
                </div>

                {!isLoaded ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleLoad(ev)}
                    disabled={!!switching}
                    style={{ padding: "8px 16px" }}
                  >
                    {isSwitching ? "Loading…" : "Load Event"}
                  </button>
                ) : (
                  <div style={{ color: "var(--color-primary)", fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-sm)", display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Active
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeatureChip({
  label,
  active,
  editable,
  onToggle,
}: {
  label: string;
  active: boolean;
  editable: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={editable ? onToggle : undefined}
      disabled={!editable}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-medium)",
        border: `1px solid ${active ? "var(--color-primary)" : "var(--border-color)"}`,
        background: active ? "rgba(79,70,229, 0.08)" : "transparent",
        color: active ? "var(--color-primary)" : "var(--text-muted)",
        cursor: editable ? "pointer" : "default",
        transition: "all var(--transition-fast)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {active ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {label}
    </button>
  );
}
