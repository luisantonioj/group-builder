"use client";

import { useCallback, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { findClusters } from "@/lib/conflict-detection";
import { Chip } from "@/components/ui/chip";
import Initials from "@/components/ui/initials";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatConnectionLabel } from "@/lib/utils";

type Tab = "graph" | "clusters" | "table";

export default function VisualizerPage() {
  const { candidates, connections, adjacency, allConflicts, addConnection } = useApp();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("graph");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unassigned" | "conflicts">("all");
  const [addConnOpen, setAddConnOpen] = useState(false);
  const [newConn, setNewConn] = useState({
    fromId: "",
    toId: "",
    relationshipType: "BARKADA",
    note: "",
  });

  const sortedCandidates = useMemo(
    () => [...candidates].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [candidates]
  );

  function handleAddConnection() {
    if (!newConn.fromId || !newConn.toId || newConn.fromId === newConn.toId) return;
    const from = candidates.find((c) => c.id === newConn.fromId)!;
    const to = candidates.find((c) => c.id === newConn.toId)!;
    addConnection({
      id: `conn-${Date.now()}`,
      fromId: from.id,
      toId: to.id,
      fromName: from.fullName,
      toName: to.fullName,
      relationshipType: newConn.relationshipType as import("@/types").RelationshipType,
      source: "MANUAL",
      confirmed: true,
      note: newConn.note.trim() || null,
      createdAt: new Date().toISOString(),
    });
    showToast(`Connection added: ${from.fullName} ↔ ${to.fullName}`, "success");
    setNewConn({ fromId: "", toId: "", relationshipType: "BARKADA", note: "" });
    setAddConnOpen(false);
  }

  const clusters = useMemo(
    () => findClusters(candidates, adjacency),
    [candidates, adjacency]
  );

  const conflictPairs = useMemo(
    () => new Set(allConflicts.flatMap((c) => [c.candidateAId, c.candidateBId])),
    [allConflicts]
  );

  // "idA:idB" sorted key set for O(1) conflict-edge lookup
  const conflictEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (const cf of allConflicts) {
      const [a, b] = [cf.candidateAId, cf.candidateBId].sort();
      s.add(`${a}:${b}`);
    }
    return s;
  }, [allConflicts]);

  function isConflictEdge(idA: string, idB: string) {
    const [a, b] = [idA, idB].sort();
    return conflictEdgeSet.has(`${a}:${b}`);
  }

  // Layout: clusters in a grid, singletons along the bottom
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const H = 560;

    clusters.forEach((cluster, ci) => {
      const cx = 90 + (ci % 5) * 175;
      const cy = 70 + Math.floor(ci / 5) * 165;
      cluster.forEach((cand, i) => {
        const angle = (i / cluster.length) * Math.PI * 2;
        const r = Math.min(65, cluster.length * 13);
        positions.set(cand.id, {
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      });
    });

    const clusterIds = new Set(clusters.flatMap((c) => c.map((m) => m.id)));
    const singletons = candidates.filter((c) => !clusterIds.has(c.id));
    singletons.forEach((c, i) => {
      positions.set(c.id, {
        x: 30 + (i % 14) * 63,
        y: H - 80 - Math.floor(i / 14) * 55,
      });
    });

    return positions;
  }, [candidates, clusters]);

  const visibleCandidates = useMemo(() => {
    if (filter === "unassigned") return candidates.filter((c) => !c.groupId);
    if (filter === "conflicts") return candidates.filter((c) => conflictPairs.has(c.id));
    return candidates;
  }, [candidates, filter, conflictPairs]);

  const visibleIds = useMemo(
    () => new Set(visibleCandidates.map((c) => c.id)),
    [visibleCandidates]
  );

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

  const selectedCandidate = useMemo(
    () => (selectedNode ? candidates.find((c) => c.id === selectedNode) ?? null : null),
    [selectedNode, candidates]
  );

  const selectedNodeConns = useMemo(() => {
    if (!selectedNode) return [];
    return connections.filter(
      (c) => c.fromId === selectedNode || c.toId === selectedNode
    );
  }, [selectedNode, connections]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Connection Visualizer</h1>
          <p className="page-sub">
            {connections.length} connections · {clusters.length} clusters
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddConnOpen(true)}>
          + Add Connection
        </button>
      </div>

      <div className="tabs" style={{ marginBottom: "var(--space-lg)" }}>
        {(["graph", "clusters", "table"] as const).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Graph ─────────────────────────────────────────────────────────────── */}
      {tab === "graph" && (
        <div style={{ display: "flex", gap: "var(--space-lg)", alignItems: "flex-start" }}>
          {/* Graph card — fills available width */}
          <div className="card" style={{ flex: 1, minWidth: 0 }}>
            {/* Filter bar */}
            <div style={{
              padding: "var(--space-sm) var(--space-lg)",
              borderBottom: "1px solid var(--border-color)",
              display: "flex", gap: "var(--space-sm)", alignItems: "center",
            }}>
              {(["all", "unassigned", "conflicts"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <span style={{ marginLeft: "auto", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                Click a node to inspect · Blue = Male · Pink = Female · Red dashed = conflict
              </span>
            </div>

            {/* SVG — responsive full-width */}
            <div style={{ overflow: "hidden" }}>
              <svg
                width="100%"
                viewBox="0 0 920 560"
                style={{ display: "block", background: "var(--bg-page)" }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Edges */}
                {connections.map((conn) => {
                  if (!visibleIds.has(conn.fromId) || !visibleIds.has(conn.toId)) return null;
                  const from = nodePositions.get(conn.fromId);
                  const to = nodePositions.get(conn.toId);
                  if (!from || !to) return null;
                  const isConflict = isConflictEdge(conn.fromId, conn.toId);
                  const dimmed =
                    selectedNode &&
                    !highlighted.has(conn.fromId) &&
                    !highlighted.has(conn.toId);
                  const isActive =
                    selectedNode &&
                    (conn.fromId === selectedNode || conn.toId === selectedNode);
                  return (
                    <line
                      key={conn.id}
                      x1={from.x} y1={from.y}
                      x2={to.x} y2={to.y}
                      stroke={isConflict ? "var(--color-danger)" : "var(--color-primary)"}
                      strokeWidth={isActive ? 2.5 : isConflict ? 2 : 1.5}
                      strokeOpacity={dimmed ? 0.07 : isConflict ? 0.85 : 0.45}
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
                  const fill =
                    cand.gender === "MALE" ? "var(--color-male)" : "var(--color-female)";
                  return (
                    <g
                      key={cand.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleNodeClick(cand.id)}
                    >
                      {isSelected && (
                        <circle
                          cx={pos.x} cy={pos.y} r={r + 6}
                          fill={fill} fillOpacity={0.18}
                        />
                      )}
                      <circle
                        cx={pos.x} cy={pos.y} r={r}
                        fill={fill}
                        fillOpacity={dimmed ? 0.15 : 1}
                        stroke={isConflicted ? "var(--color-danger)" : "white"}
                        strokeWidth={isConflicted ? 2.5 : 1.5}
                      />
                      {!dimmed && (
                        <text
                          x={pos.x} y={pos.y + r + 11}
                          textAnchor="middle" fontSize={9}
                          fill="var(--text-secondary)"
                          style={{ pointerEvents: "none", userSelect: "none" }}
                        >
                          {cand.firstName}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div style={{
              padding: "var(--space-sm) var(--space-lg)",
              borderTop: "1px solid var(--border-color)",
              display: "flex", gap: "var(--space-xl)",
              fontSize: "var(--font-size-xs)", color: "var(--text-muted)",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-male)", display: "inline-block" }} />
                Male
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-female)", display: "inline-block" }} />
                Female
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 14, height: 2, borderTop: "2px dashed var(--color-danger)", display: "inline-block" }} />
                Conflict
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 14, height: 2, borderTop: "2px solid var(--color-primary)", display: "inline-block" }} />
                Connection
              </span>
            </div>
          </div>

          {/* Right: node detail panel */}
          <div style={{ width: 272, flexShrink: 0 }}>
            {!selectedCandidate ? (
              <div
                className="card"
                style={{
                  padding: "var(--space-2xl) var(--space-lg)",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: "var(--space-sm)", opacity: 0.3 }}>◎</div>
                <p style={{ fontSize: "var(--font-size-sm)" }}>
                  Click any node to view its connections and active conflicts.
                </p>
              </div>
            ) : (
              <div className="card" style={{ overflow: "hidden" }}>
                {/* Candidate header */}
                <div style={{
                  padding: "var(--space-md)",
                  borderBottom: "1px solid var(--border-color)",
                  display: "flex", alignItems: "center", gap: "var(--space-sm)",
                }}>
                  <Initials
                    name={selectedCandidate.fullName}
                    gender={selectedCandidate.gender}
                    size={36}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: "var(--font-size-sm)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {selectedCandidate.fullName}
                    </div>
                    {selectedCandidate.school && (
                      <div style={{
                        fontSize: "var(--font-size-xs)", color: "var(--text-muted)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {selectedCandidate.school}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-muted)", fontSize: 16, padding: 4, flexShrink: 0,
                    }}
                  >✕</button>
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)" }}>
                  <div style={{
                    flex: 1, padding: "var(--space-sm)",
                    textAlign: "center", borderRight: "1px solid var(--border-color)",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: "var(--font-size-lg)" }}>
                      {selectedNodeConns.length}
                    </div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                      connections
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: "var(--space-sm)", textAlign: "center" }}>
                    <div style={{
                      fontWeight: 700, fontSize: "var(--font-size-lg)",
                      color: selectedNodeConns.some((c) => isConflictEdge(c.fromId, c.toId))
                        ? "var(--color-danger)"
                        : "inherit",
                    }}>
                      {selectedNodeConns.filter((c) => isConflictEdge(c.fromId, c.toId)).length}
                    </div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                      active conflicts
                    </div>
                  </div>
                </div>

                {/* Connection list */}
                <div style={{
                  padding: "var(--space-xs)",
                  display: "flex", flexDirection: "column", gap: 3,
                  maxHeight: 460, overflowY: "auto",
                }}>
                  {selectedNodeConns.length === 0 && (
                    <p style={{
                      fontSize: "var(--font-size-sm)", color: "var(--text-muted)",
                      textAlign: "center", padding: "var(--space-lg)",
                    }}>
                      No connections.
                    </p>
                  )}
                  {selectedNodeConns.map((conn) => {
                    const isFrom = conn.fromId === selectedNode;
                    const otherId = isFrom ? conn.toId : conn.fromId;
                    const otherName = isFrom ? conn.toName : conn.fromName;
                    const other = candidates.find((c) => c.id === otherId);
                    const isConflict = isConflictEdge(conn.fromId, conn.toId);
                    const isPending = !conn.confirmed;
                    return (
                      <div
                        key={conn.id}
                        style={{
                          display: "flex", alignItems: "center", gap: "var(--space-xs)",
                          padding: "6px var(--space-sm)",
                          borderRadius: "var(--radius-sm)",
                          opacity: isPending ? 0.8 : 1,
                          background: isConflict
                            ? "color-mix(in srgb, var(--color-danger) 8%, transparent)"
                            : "var(--bg-hover)",
                          border: isPending
                            ? "1px dashed var(--border-default)"
                            : isConflict
                            ? "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)"
                            : "1px solid transparent",
                        }}
                      >
                        <Initials
                          name={otherName ?? "?"}
                          gender={other?.gender ?? "MALE"}
                          size={24}
                          fontSize={9}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: "var(--font-size-xs)", fontWeight: 500,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {otherName ?? otherId}
                          </div>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }}>
                            <Chip
                              kind="default"
                              style={{ fontSize: "0.65rem", padding: "1px 5px" }}
                            >
                              {formatConnectionLabel(conn)}
                            </Chip>
                            {isPending ? (
                              <Chip kind="warning" style={{ fontSize: "0.65rem", padding: "1px 5px" }}>
                                ? pending
                              </Chip>
                            ) : (
                              <Chip
                                kind={conn.source === "AUTO" ? "accent" : "default"}
                                style={{ fontSize: "0.65rem", padding: "1px 5px" }}
                              >
                                {conn.source.toLowerCase()}
                              </Chip>
                            )}
                            {isConflict && (
                              <Chip
                                kind="danger"
                                style={{ fontSize: "0.65rem", padding: "1px 5px" }}
                              >
                                ⚠ conflict
                              </Chip>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Clusters ──────────────────────────────────────────────────────────── */}
      {tab === "clusters" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "var(--space-lg)",
        }}>
          {clusters.map((cluster, i) => {
            const clusterIds = new Set(cluster.map((c) => c.id));
            const clusterConns = connections.filter(
              (c) => clusterIds.has(c.fromId) && clusterIds.has(c.toId)
            );
            return (
              <div key={i} className="card">
                <div className="card-head">
                  <div style={{ fontWeight: "var(--font-weight-semibold)" }}>
                    Cluster {i + 1}
                  </div>
                  <Chip kind="accent">{cluster.length} members</Chip>
                </div>
                <div
                  className="card-body"
                  style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}
                >
                  {/* Members */}
                  {cluster.map((cand) => (
                    <div
                      key={cand.id}
                      style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}
                    >
                      <Initials name={cand.fullName} gender={cand.gender} size={24} fontSize={10} />
                      <span style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--text-primary)",
                        flex: 1,
                      }}>
                        {cand.fullName}
                      </span>
                      {conflictPairs.has(cand.id) && <Chip kind="danger">⚠</Chip>}
                    </div>
                  ))}

                  {/* Connection notes */}
                  {clusterConns.length > 0 && (
                    <div style={{
                      marginTop: "var(--space-xs)",
                      paddingTop: "var(--space-sm)",
                      borderTop: "1px solid var(--border-color)",
                    }}>
                      <div style={{
                        fontSize: "var(--font-size-xs)",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        marginBottom: "var(--space-xs)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
                        Connections
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {clusterConns.map((conn) => {
                          const fromFirst =
                            conn.fromName?.split(",")[1]?.trim() ?? conn.fromName ?? "?";
                          const toFirst =
                            conn.toName?.split(",")[1]?.trim() ?? conn.toName ?? "?";
                          const isConflict = isConflictEdge(conn.fromId, conn.toId);
                          return (
                            <div
                              key={conn.id}
                              style={{
                                display: "flex", alignItems: "center",
                                gap: 4, flexWrap: "wrap",
                                fontSize: "var(--font-size-xs)",
                              }}
                            >
                              <span style={{ color: "var(--text-secondary)" }}>
                                {fromFirst} ↔ {toFirst}
                              </span>
                              <Chip
                                kind="default"
                                style={{ fontSize: "0.65rem", padding: "1px 5px" }}
                              >
                                {formatConnectionLabel(conn)}
                              </Chip>
                              <Chip
                                kind={conn.source === "AUTO" ? "accent" : "default"}
                                style={{ fontSize: "0.65rem", padding: "1px 5px" }}
                              >
                                {conn.source.toLowerCase()}
                              </Chip>
                              {isConflict && (
                                <Chip
                                  kind="danger"
                                  style={{ fontSize: "0.65rem", padding: "1px 5px" }}
                                >
                                  ⚠
                                </Chip>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {clusters.length === 0 && (
            <div style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: "var(--space-2xl)",
              color: "var(--text-muted)",
            }}>
              No clusters found — candidates have no connections yet.
            </div>
          )}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
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
                  <tr key={conn.id} style={{ opacity: conn.confirmed ? 1 : 0.7 }}>
                    <td style={{ fontWeight: "var(--font-weight-medium)" }}>{conn.fromName}</td>
                    <td style={{ fontWeight: "var(--font-weight-medium)" }}>{conn.toName}</td>
                    <td>
                      <Chip
                        kind="default"
                        style={{ textTransform: "capitalize" } as React.CSSProperties}
                      >
                        {formatConnectionLabel(conn)}
                      </Chip>
                    </td>
                    <td>
                      {conn.confirmed
                        ? <Chip kind={conn.source === "AUTO" ? "accent" : "default"}>{conn.source === "AUTO" ? "Auto" : "Manual"}</Chip>
                        : <Chip kind="warning">? pending</Chip>
                      }
                    </td>
                    <td style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                      {conn.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Connection Modal ───────────────────────────────────────────────── */}
      <Modal
        open={addConnOpen}
        title="Add Connection"
        onClose={() => setAddConnOpen(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAddConnOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleAddConnection}
              disabled={!newConn.fromId || !newConn.toId || newConn.fromId === newConn.toId}
            >
              Add Connection
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div className="form-group">
            <label className="form-label">From</label>
            <select
              className="input"
              value={newConn.fromId}
              onChange={(e) => setNewConn((p) => ({ ...p, fromId: e.target.value }))}
            >
              <option value="">Select candidate…</option>
              {sortedCandidates.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <select
              className="input"
              value={newConn.toId}
              onChange={(e) => setNewConn((p) => ({ ...p, toId: e.target.value }))}
            >
              <option value="">Select candidate…</option>
              {sortedCandidates
                .filter((c) => c.id !== newConn.fromId)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Relationship</label>
            <select
              className="input"
              value={newConn.relationshipType}
              onChange={(e) => setNewConn((p) => ({ ...p, relationshipType: e.target.value }))}
            >
              {(["BARKADA", "CLASSMATE", "SIBLING", "FAMILY", "CHURCHMATE", "OTHER"] as const).map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              Note{" "}
              <span style={{ color: "var(--text-muted)", fontWeight: "var(--font-weight-normal)" }}>(optional)</span>
            </label>
            <input
              className="input"
              value={newConn.note}
              onChange={(e) => setNewConn((p) => ({ ...p, note: e.target.value }))}
              placeholder="e.g. Same barangay"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
