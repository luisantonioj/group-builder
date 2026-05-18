"use client";

import { useCallback, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { findClusters } from "@/lib/conflict-detection";
import { Chip } from "@/components/ui/chip";
import Initials from "@/components/ui/initials";

type Tab = "graph" | "clusters" | "table";

export default function VisualizerPage() {
  const { candidates, connections, adjacency, allConflicts } = useApp();
  const [tab, setTab] = useState<Tab>("graph");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unassigned" | "conflicts">("all");

  const clusters = useMemo(
    () => findClusters(candidates, adjacency),
    [candidates, adjacency]
  );

  const conflictPairs = useMemo(
    () => new Set(allConflicts.flatMap((c) => [c.candidateAId, c.candidateBId])),
    [allConflicts]
  );

  // Simple force-free layout: place connected clusters in a grid, singletons below
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const W = 800, H = 500;

    // Place clusters
    clusters.forEach((cluster, ci) => {
      const cx = 80 + (ci % 4) * 200;
      const cy = 60 + Math.floor(ci / 4) * 180;
      cluster.forEach((cand, i) => {
        const angle = (i / cluster.length) * Math.PI * 2;
        const r = Math.min(60, cluster.length * 12);
        positions.set(cand.id, {
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      });
    });

    // Place singletons along the bottom
    const clusterIds = new Set(clusters.flatMap((c) => c.map((m) => m.id)));
    const singletons = candidates.filter((c) => !clusterIds.has(c.id));
    singletons.forEach((c, i) => {
      positions.set(c.id, {
        x: 30 + (i % 12) * 68,
        y: H - 80 - Math.floor(i / 12) * 50,
      });
    });

    return positions;
  }, [candidates, clusters]);

  const visibleCandidates = useMemo(() => {
    if (filter === "unassigned") return candidates.filter((c) => !c.groupId);
    if (filter === "conflicts") return candidates.filter((c) => conflictPairs.has(c.id));
    return candidates;
  }, [candidates, filter, conflictPairs]);

  const visibleIds = useMemo(() => new Set(visibleCandidates.map((c) => c.id)), [visibleCandidates]);

  const handleNodeClick = useCallback((id: string) => {
    setSelectedNode((prev) => (prev === id ? null : id));
  }, []);

  const highlighted = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const s = new Set<string>([selectedNode]);
    for (const conn of connections) {
      if (conn.fromId === selectedNode) s.add(conn.toId);
      if (conn.toId === selectedNode) s.add(conn.fromId);
    }
    return s;
  }, [selectedNode, connections]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Connection Visualizer</h1>
          <p className="page-sub">{connections.length} connections · {clusters.length} clusters</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: "var(--space-lg)" }}>
        {(["graph", "clusters", "table"] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "graph" && (
        <div className="card">
          {/* Filter bar */}
          <div style={{ padding: "var(--space-md) var(--space-xl)", borderBottom: "1px solid var(--border-color)", display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
            {(["all", "unassigned", "conflicts"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              Click a node to highlight connections · Blue = Male · Pink = Female · Red edge = conflict
            </span>
          </div>

          {/* SVG Graph */}
          <div style={{ overflow: "auto" }}>
            <svg width="800" height="500" viewBox="0 0 800 500" style={{ display: "block", background: "var(--bg-page)", minWidth: "600px" }}>
              {/* Edges */}
              {connections.map((conn) => {
                if (!visibleIds.has(conn.fromId) || !visibleIds.has(conn.toId)) return null;
                const from = nodePositions.get(conn.fromId);
                const to = nodePositions.get(conn.toId);
                if (!from || !to) return null;
                const isConflict = allConflicts.some(
                  (c) =>
                    (c.candidateAId === conn.fromId && c.candidateBId === conn.toId) ||
                    (c.candidateAId === conn.toId && c.candidateBId === conn.fromId)
                );
                const dimmed = selectedNode && !highlighted.has(conn.fromId) && !highlighted.has(conn.toId);
                return (
                  <line
                    key={conn.id}
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke={isConflict ? "var(--color-danger)" : "var(--color-primary)"}
                    strokeWidth={isConflict ? 2 : 1.5}
                    strokeOpacity={dimmed ? 0.1 : isConflict ? 0.8 : 0.4}
                    strokeDasharray={isConflict ? "4 2" : undefined}
                  />
                );
              })}

              {/* Nodes */}
              {visibleCandidates.map((cand) => {
                const pos = nodePositions.get(cand.id);
                if (!pos) return null;
                const degree = adjacency.get(cand.id)?.size ?? 0;
                const r = 6 + Math.min(degree * 2, 10);
                const isSelected = selectedNode === cand.id;
                const isHighlighted = highlighted.has(cand.id);
                const isConflicted = conflictPairs.has(cand.id);
                const dimmed = selectedNode && !isHighlighted;
                const fill = cand.gender === "MALE" ? "var(--color-male)" : "var(--color-female)";
                return (
                  <g key={cand.id} style={{ cursor: "pointer" }} onClick={() => handleNodeClick(cand.id)}>
                    {isSelected && (
                      <circle cx={pos.x} cy={pos.y} r={r + 5} fill={fill} fillOpacity={0.2} />
                    )}
                    <circle
                      cx={pos.x} cy={pos.y} r={r}
                      fill={fill}
                      fillOpacity={dimmed ? 0.2 : 1}
                      stroke={isConflicted ? "var(--color-danger)" : "white"}
                      strokeWidth={isConflicted ? 2 : 1}
                    />
                    {!dimmed && (
                      <text x={pos.x} y={pos.y + r + 10} textAnchor="middle" fontSize={9} fill="var(--text-secondary)" style={{ pointerEvents: "none", userSelect: "none" }}>
                        {cand.firstName}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div style={{ padding: "var(--space-md) var(--space-xl)", borderTop: "1px solid var(--border-color)", display: "flex", gap: "var(--space-xl)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-male)", display: "inline-block" }} /> Male</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-female)", display: "inline-block" }} /> Female</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 2, borderTop: "2px dashed var(--color-danger)", display: "inline-block" }} /> Conflict</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 2, borderTop: "2px solid var(--color-primary)", display: "inline-block" }} /> Connection</span>
          </div>
        </div>
      )}

      {tab === "clusters" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-lg)" }}>
          {clusters.map((cluster, i) => (
            <div key={i} className="card">
              <div className="card-head">
                <div style={{ fontWeight: "var(--font-weight-semibold)" }}>Cluster {i + 1}</div>
                <Chip kind="accent">{cluster.length} members</Chip>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                {cluster.map((cand) => (
                  <div key={cand.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <Initials name={cand.fullName} gender={cand.gender} size={24} fontSize={10} />
                    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>{cand.fullName}</span>
                    {conflictPairs.has(cand.id) && <Chip kind="danger">⚠</Chip>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {clusters.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "var(--space-2xl)", color: "var(--text-muted)" }}>
              No clusters found — candidates have no connections yet.
            </div>
          )}
        </div>
      )}

      {tab === "table" && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Relationship</th>
                  <th>Source</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((conn) => (
                  <tr key={conn.id}>
                    <td style={{ fontWeight: "var(--font-weight-medium)" }}>{conn.fromName}</td>
                    <td style={{ fontWeight: "var(--font-weight-medium)" }}>{conn.toName}</td>
                    <td>
                      <Chip kind="default" className="chip-default" style={{ textTransform: "capitalize" } as React.CSSProperties}>
                        {conn.relationshipType.toLowerCase()}
                      </Chip>
                    </td>
                    <td>
                      <Chip kind={conn.source === "AUTO" ? "accent" : "default"}>
                        {conn.source === "AUTO" ? "Auto" : "Manual"}
                      </Chip>
                    </td>
                    <td style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{conn.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
