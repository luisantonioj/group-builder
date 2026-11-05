import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("skeleton", className)} style={style} aria-hidden="true" />;
}

/** Placeholder for the Groups/Rooms boards: a pool column plus a grid of cards. */
export function BoardSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="groups-layout" role="status" aria-label="Loading">
      <div className="card" style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <Skeleton style={{ height: 16, width: "50%" }} />
        <Skeleton style={{ height: 36 }} />
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} style={{ height: 44 }} />
        ))}
      </div>
      <div className="assign-grid">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="card" style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            <Skeleton style={{ height: 18, width: "60%" }} />
            <Skeleton style={{ height: 32 }} />
            <Skeleton style={{ height: 32 }} />
            <Skeleton style={{ height: 32, width: "80%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder for list/table pages. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card" role="status" aria-label="Loading" style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      <Skeleton style={{ height: 20, width: "30%" }} />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} style={{ height: 36 }} />
      ))}
    </div>
  );
}

/** Generic page placeholder used by the route-level loading.tsx. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page">
      <div style={{ marginBottom: "var(--space-xl)", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <Skeleton style={{ height: 24, width: 220 }} />
        <Skeleton style={{ height: 14, width: 160 }} />
      </div>
      <div className="stat-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} style={{ height: 88, borderRadius: "var(--radius-lg)" }} />
        ))}
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
