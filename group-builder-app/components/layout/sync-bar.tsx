"use client";

import { useEffect, useState } from "react";

export default function SyncBar() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
      setSyncing(true);
      // Simulate sync flush
      setTimeout(() => {
        setSyncing(false);
        setPendingCount(0);
      }, 1500);
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
          background: online ? "var(--color-success)" : "var(--color-danger)",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span>
        {syncing
          ? "Syncing…"
          : online
          ? pendingCount > 0
            ? `${pendingCount} change${pendingCount !== 1 ? "s" : ""} pending sync`
            : "Online"
          : "Offline — changes will sync when reconnected"}
      </span>
    </div>
  );
}
