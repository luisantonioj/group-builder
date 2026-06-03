"use client";

import { useEffect, useState } from "react";
import { flushSyncQueue } from "@/lib/dexie";

export default function SyncBar() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Read real pending count from IndexedDB on mount and trigger flush
  useEffect(() => {
    async function loadPendingAndFlush() {
      try {
        const { db, flushSyncQueue } = await import("@/lib/dexie");
        if (db) {
          const count = await db.syncQueue.count();
          setPendingCount(count);
          if (count > 0 && navigator.onLine) {
            setSyncing(true);
            await flushSyncQueue((remaining) => setPendingCount(remaining));
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
    // Set real initial state (avoids SSR mismatch showing "Online" when offline)
    setOnline(navigator.onLine);

    async function handleOnline() {
      setOnline(true);
      setSyncing(true);
      try {
        const { flushSyncQueue } = await import("@/lib/dexie");
        await flushSyncQueue((remaining) => setPendingCount(remaining));
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
            : "Online"
          : "Offline — changes will sync when reconnected"}
      </span>
    </div>
  );
}
