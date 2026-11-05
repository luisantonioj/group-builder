"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/ui/modal";
import {
  SYNC_CHANNEL,
  db,
  discardSyncItem,
  flushSyncQueue,
  isPending,
  retryAllFailed,
  retrySyncItem,
  type SyncMessage,
  type SyncQueueItem,
} from "@/lib/dexie";

const PERIODIC_FLUSH_MS = 30_000;

interface ProblemItem extends SyncQueueItem {
  label: string;
}

async function labelFor(item: SyncQueueItem) {
  const payload = (item.payload ?? {}) as Record<string, unknown>;
  try {
    if (item.entity === "candidate") {
      const row = await db?.candidates.get(item.entityId);
      return (row?.fullName ?? payload.fullName ?? "Candidate") as string;
    }
    if (item.entity === "group") {
      const row = await db?.groups.get(item.entityId);
      return (row?.name ?? payload.name ?? "Group") as string;
    }
    if (item.entity === "room") {
      const row = await db?.rooms.get(item.entityId);
      return (row?.name ?? payload.name ?? "Room") as string;
    }
  } catch {
    // fall through
  }
  return "Connection";
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default function SyncBar() {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const flushingRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    if (!db) return;
    try {
      const queue = await db.syncQueue.toArray();
      const pending = queue.filter(isPending);
      setPendingCount(pending.length);
      setProblemCount(queue.length - pending.length);
      const problemItems = queue.filter((item) => !isPending(item));
      setProblems(
        await Promise.all(problemItems.map(async (item) => ({ ...item, label: await labelFor(item) })))
      );
    } catch {
      // IndexedDB unavailable — ignore
    }
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current || !db) return;
    flushingRef.current = true;
    try {
      const queue = await db.syncQueue.toArray();
      if (!queue.some(isPending)) return;
      setSyncing(true);
      const result = await flushSyncQueue(() => {
        refreshCounts();
      });
      // A failing fetch means we're effectively offline even if navigator.onLine says otherwise.
      setOnline(!result.networkError && navigator.onLine);
      setAuthRequired(result.authRequired);
    } catch {
      // ignore — retried on the next trigger
    } finally {
      flushingRef.current = false;
      setSyncing(false);
      refreshCounts();
    }
  }, [refreshCounts]);

  // Initial counts + flush on mount (also runs right after signing back in)
  useEffect(() => {
    setOnline(navigator.onLine);
    refreshCounts();
    flush();
  }, [refreshCounts, flush]);

  // Cross-tab updates
  useEffect(() => {
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data.type === "AUTH_REQUIRED") setAuthRequired(true);
      if (event.data.type === "SYNC_QUEUE_CHANGED" || event.data.type === "REFRESH_DATA") refreshCounts();
    };
    return () => channel.close();
  }, [refreshCounts]);

  // Online/offline, tab focus, and a periodic retry while changes are waiting
  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      flush();
    }
    function handleOffline() {
      setOnline(false);
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") flush();
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    const timer = window.setInterval(() => {
      if (navigator.onLine && !authRequired) flush();
    }, PERIODIC_FLUSH_MS);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(timer);
    };
  }, [flush, authRequired]);

  async function handleRetry(id: number) {
    await retrySyncItem(id);
    await refreshCounts();
    flush();
  }

  async function handleDiscard(id: number) {
    await discardSyncItem(id);
    await refreshCounts();
  }

  async function handleRetryAll() {
    await retryAllFailed();
    await refreshCounts();
    flush();
  }

  const dotColor = syncing
    ? "var(--color-warning)"
    : authRequired || problemCount > 0 || !online
    ? "var(--color-danger)"
    : pendingCount > 0
    ? "var(--color-warning)"
    : "var(--color-success)";

  const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? "s" : ""}`;

  const message = syncing
    ? `Syncing${pendingCount > 0 ? ` ${plural(pendingCount, "change")}` : ""}…`
    : authRequired
    ? `Session expired — sign in to sync ${plural(pendingCount, "change")}`
    : !online
    ? pendingCount > 0
      ? `Offline — ${plural(pendingCount, "change")} will sync when reconnected`
      : "Offline — changes will sync when reconnected"
    : pendingCount > 0
    ? `${plural(pendingCount, "change")} pending sync`
    : problemCount > 0
    ? `${plural(problemCount, "change")} need${problemCount === 1 ? "s" : ""} attention`
    : "All changes saved";

  const failedCount = problems.filter((p) => p.status === "FAILED").length;

  return (
    <>
      <div className="sync-bar" role="status" aria-live="polite">
        <span className="sync-dot" style={{ background: dotColor }} aria-hidden="true" />
        <span>{message}</span>
        {authRequired && (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(pathname ?? "/dashboard")}`}
            className="btn btn-xs btn-primary"
          >
            Sign in
          </Link>
        )}
        {problemCount > 0 && !syncing && (
          <button onClick={() => setPanelOpen(true)} className="btn btn-xs btn-secondary">
            Review {plural(problemCount, "issue")}
          </button>
        )}
      </div>

      <Modal
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Changes that didn't sync"
        size="md"
        footer={
          <>
            {failedCount > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handleRetryAll}>
                Retry all failed
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setPanelOpen(false)}>
              Done
            </button>
          </>
        }
      >
        {problems.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>Everything is in sync.</p>
        ) : (
          <ul className="sync-problem-list">
            {problems.map((item) => {
              const payload = (item.payload ?? {}) as Record<string, unknown>;
              return (
                <li key={item.id} className="sync-problem">
                  <div className="sync-problem-head">
                    <div>
                      <div className="sync-problem-title">{item.label}</div>
                      <div className="sync-problem-meta">
                        {item.status === "CONFLICT" ? "Edited by someone else" : "Failed"} · {item.entity}{" "}
                        {item.action}
                      </div>
                    </div>
                    <span className={item.status === "CONFLICT" ? "chip chip-warning" : "chip chip-danger"}>
                      {item.status === "CONFLICT" ? "Conflict" : "Error"}
                    </span>
                  </div>

                  {item.status === "CONFLICT" && item.conflict ? (
                    <table className="sync-conflict-table">
                      <thead>
                        <tr>
                          <th scope="col">Field</th>
                          <th scope="col">Yours</th>
                          <th scope="col">On server</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.conflict.fields.map((field) => (
                          <tr key={field}>
                            <td>{field}</td>
                            <td>{formatValue(payload[field])}</td>
                            <td>{formatValue(item.conflict!.server[field])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    item.errorMessage && <div className="sync-problem-error">{item.errorMessage}</div>
                  )}

                  <div className="sync-problem-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => handleDiscard(item.id!)}>
                      {item.status === "CONFLICT" ? "Use server version" : "Discard change"}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleRetry(item.id!)}>
                      {item.status === "CONFLICT" ? "Keep mine" : "Retry"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}
