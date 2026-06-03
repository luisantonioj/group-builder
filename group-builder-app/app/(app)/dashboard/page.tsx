"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store";
import DonutChart from "@/components/ui/donut-chart";
import { formatRelativeTime, pluralize } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";

export default function DashboardPage() {
  const { candidates, groups, rooms, activities, allConflicts, event: batch } = useApp();

  const stats = useMemo(() => {
    const total = candidates.length;
    const males = candidates.filter((c) => c.gender === "MALE").length;
    const females = candidates.filter((c) => c.gender === "FEMALE").length;
    const grouped = candidates.filter((c) => c.groupId).length;
    const roomed = candidates.filter((c) => c.roomId).length;

    const ages = candidates.map((c) => c.age).filter((a) => a != null) as number[];
    const ageDistribution = [
      { label: "< 16", count: ages.filter((a) => a < 16).length },
      { label: "16-18", count: ages.filter((a) => a >= 16 && a <= 18).length },
      { label: "19-21", count: ages.filter((a) => a >= 19 && a <= 21).length },
      { label: "22+", count: ages.filter((a) => a >= 22).length },
    ];

    return { total, males, females, grouped, roomed, ageDistribution };
  }, [candidates]);

  const groupConflictCount = allConflicts.filter((c) => c.groupId).length;
  const roomConflictCount = allConflicts.filter((c) => c.roomId).length;

  const maxAge = Math.max(...stats.ageDistribution.map((a) => a.count), 1);

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{batch.name} · Candidate overview</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="stat-grid">
        <StatTile label="Total Candidates" value={stats.total} color="var(--color-primary)" />
        <StatTile
          label="Groups Formed"
          value={`${groups.filter(() => true).length > 0 ? stats.grouped : 0} / ${stats.total}`}
          sub={`${groups.length} group${groups.length !== 1 ? "s" : ""}`}
          color="var(--color-success)"
        />
        <StatTile
          label="Room Assignments"
          value={stats.roomed}
          sub={`${stats.total - stats.roomed} unassigned`}
          color="var(--color-accent)"
        />
        <StatTile
          label="Active Conflicts"
          value={allConflicts.length}
          color={allConflicts.length > 0 ? "var(--color-danger)" : "var(--color-success)"}
          alert={allConflicts.length > 0}
        />
      </div>

      {/* Main content grid */}
      <div className="dashboard-grid">
        {/* Batch composition */}
        <div className="card">
          <div className="card-head">
            <div>
              <div style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)" }}>Batch Composition</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{batch.name}</div>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2xl)" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DonutChart
                  data={[
                    { value: stats.males, color: "var(--color-male)", label: "Male" },
                    { value: stats.females, color: "var(--color-female)", label: "Female" },
                  ]}
                  size={128}
                  thickness={20}
                />
                <div style={{ position: "absolute", textAlign: "center" }}>
                  <div style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-xl)", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{stats.total}</div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>total</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                <LegendItem color="var(--color-male)" label="Male" count={stats.males} total={stats.total} />
                <LegendItem color="var(--color-female)" label="Female" count={stats.females} total={stats.total} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginBottom: "var(--space-sm)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Age Distribution</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {stats.ageDistribution.map((a) => (
                    <div key={a.label} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", width: 36, flexShrink: 0 }}>{a.label}</span>
                      <div style={{ flex: 1, height: 8, background: "var(--border-color)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(a.count / maxAge) * 100}%`, background: "var(--color-primary)", borderRadius: "var(--radius-full)", transition: "width 0.4s ease" }} />
                      </div>
                      <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", width: 16, textAlign: "right" }}>{a.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conflict summary */}
        <div className="card">
          <div className="card-head">
            <div>
              <div style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)" }}>Conflict Summary</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>Connected candidates in same group / room</div>
            </div>
          </div>
          <div className="card-body">
            {allConflicts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-xl) 0" }}>
                <div style={{ fontSize: 32, marginBottom: "var(--space-sm)" }}>✓</div>
                <div style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--color-success)" }}>All clear!</div>
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", marginTop: 4 }}>No grouping or room conflicts detected.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                {groupConflictCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-sm) var(--space-md)", background: "var(--color-conflict-bg)", border: "1px solid var(--color-conflict-border)", borderRadius: "var(--radius-md)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-conflict-text)", fontWeight: "var(--font-weight-medium)" }}>
                      {pluralize(groupConflictCount, "group conflict")}
                    </span>
                  </div>
                )}
                {roomConflictCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-sm) var(--space-md)", background: "var(--color-conflict-bg)", border: "1px solid var(--color-conflict-border)", borderRadius: "var(--radius-md)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-conflict-text)", fontWeight: "var(--font-weight-medium)" }}>
                      {pluralize(roomConflictCount, "room conflict")}
                    </span>
                  </div>
                )}
                <div style={{ marginTop: "var(--space-sm)" }}>
                  {allConflicts.slice(0, 4).map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "6px 0", borderBottom: "1px solid var(--border-color)", fontSize: "var(--font-size-sm)" }}>
                      <Chip kind="danger">{c.groupId ? "Group" : "Room"}</Chip>
                      <span style={{ color: "var(--text-primary)" }}>{c.candidateAName}</span>
                      <span style={{ color: "var(--text-muted)" }}>↔</span>
                      <span style={{ color: "var(--text-primary)" }}>{c.candidateBName}</span>
                    </div>
                  ))}
                  {allConflicts.length > 4 && (
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "var(--space-sm)" }}>
                      +{allConflicts.length - 4} more — see Reports page
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="card-head">
          <div style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)" }}>Recent Activity</div>
        </div>
        <div style={{ padding: "var(--space-sm) 0" }}>
          {activities.length === 0 ? (
            <div style={{ padding: "var(--space-2xl)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-size-sm)" }}>
              No activity yet.
            </div>
          ) : (
            activities.slice(0, 8).map((act) => (
              <div key={act.id} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)", padding: "10px var(--space-xl)", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)", marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>{act.description}</span>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                    {act.userName} · {formatRelativeTime(act.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub, color, alert }: {
  label: string; value: string | number; sub?: string; color: string; alert?: boolean;
}) {
  return (
    <div className="stat-tile" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
      {alert && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "var(--space-xs)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-danger)" }}>Needs attention</span>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, count, total }: { color: string; label: string; count: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{count}</span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
    </div>
  );
}
