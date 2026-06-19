"use client";

import { useEffect, useState } from "react";

export default function SyncBar() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  async function refreshCounts() {
    try {
      const { db } = await import("@/lib/dexie");
      if (db) {
        const queue = await db.syncQueue.toArray();
        const pending = queue.filter((item) => item.status !== "FAILED").length;
        const failed = queue.filter((item) => item.status === "FAILED").length;
        setPendingCount(pending);
        setFailedCount(failed);
      }
    } catch {
      // IndexedDB unavailable — ignore
    }
  }

  // Read real pending count from IndexedDB on mount and trigger flush
  useEffect(() => {
    async function loadPendingAndFlush() {
      try {
        const { db, flushSyncQueue } = await import("@/lib/dexie");
        if (db) {
          const queue = await db.syncQueue.toArray();
          const pending = queue.filter((item) => item.status !== "FAILED").length;
          const failed = queue.filter((item) => item.status === "FAILED").length;
          setPendingCount(pending);
          setFailedCount(failed);
          if (pending > 0 && navigator.onLine) {
            setSyncing(true);
            await flushSyncQueue(() => {
              refreshCounts();
            });
            setSyncing(false);
          }
        }
      } catch {
        // IndexedDB unavailable — ignore
      }
    }
    loadPendingAndFlush();
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel("group-builder-sync");
    channel.onmessage = (event) => {
      if (event.data.type === "SYNC_QUEUE_CHANGED" || event.data.type === "REFRESH_DATA") {
        refreshCounts();
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    // Set real initial state (avoids SSR mismatch showing "Online" when offline)
    setOnline(navigator.onLine);

    async function handleOnline() {
      setOnline(true);
      setSyncing(true);
      try {
        const { flushSyncQueue } = await import("@/lib/dexie");
        await flushSyncQueue(() => {
          refreshCounts();
        });
      } catch {
        // Network flush failed — will retry on next reconnect
      }
      setSyncing(false);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="sync-bar">
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: syncing
            ? "var(--color-warning)"
            : failedCount > 0
            ? "var(--color-danger)"
            : online
            ? "var(--color-success)"
            : "var(--color-danger)",
          display: "inline-block",
          flexShrink: 0,
          transition: "background 0.3s",
        }}
      />
      <span>
        {syncing
          ? `Syncing${pendingCount > 0 ? ` ${pendingCount} change${pendingCount !== 1 ? "s" : ""}` : ""}…`
          : online
          ? pendingCount > 0
            ? `${pendingCount} change${pendingCount !== 1 ? "s" : ""} pending sync`
            : failedCount > 0
            ? `${failedCount} sync error${failedCount !== 1 ? "s" : ""} detected`
            : "Online"
          : "Offline — changes will sync when reconnected"}
        {failedCount > 0 && !syncing && (
          <button
            onClick={async () => {
              try {
                const { db, flushSyncQueue } = await import("@/lib/dexie");
                if (db) {
                  const failedItems = await db.syncQueue.toArray();
                  for (const item of failedItems) {
                    if (item.status === "FAILED" && item.id != null) {
                      await db.syncQueue.update(item.id, { status: undefined, retries: 0 });
                    }
                  }
                  await refreshCounts();
                  if (navigator.onLine) {
                    setSyncing(true);
                    await flushSyncQueue(() => {
                      refreshCounts();
                    });
                    setSyncing(false);
                  }
                }
              } catch (e) {}
            }}
            className="btn btn-xs btn-secondary"
            style={{ marginLeft: "var(--space-md)", padding: "1px 6px", fontSize: "10px" }}
          >
            Retry Failed
          </button>
        )}
      </span>
    </div>
  );
}
