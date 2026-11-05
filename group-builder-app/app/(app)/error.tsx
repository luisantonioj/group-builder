"use client";

import { useEffect } from "react";
import EmptyState from "@/components/ui/empty-state";
import { WarningIcon } from "@/components/ui/icons";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      variant="card"
      icon={<WarningIcon size={28} style={{ color: "var(--color-danger)" }} />}
      title="Something went wrong on this page"
      description="Your changes are saved on this device and will sync automatically. Try again, or reload the page."
      action={
        <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={reset}>Try again</button>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      }
    />
  );
}
