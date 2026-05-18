"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Chip, GenderChip, AllergyBadge } from "@/components/ui/chip";
import Initials from "@/components/ui/initials";

type ReportTab = "groups" | "rooms" | "conflicts" | "allergies" | "contacts";

export default function ReportsPage() {
  const { candidates, groups, rooms, allConflicts, connections, batch } = useApp();
  const [tab, setTab] = useState<ReportTab>("groups");

  const totalCandidates = candidates.length;
  const avgGroupSize = groups.length > 0
    ? (candidates.filter((c) => c.groupId).length / groups.length).toFixed(1)
    : "—";
  const occupiedRooms = rooms.filter((r) => candidates.some((c) => c.roomId === r.id)).length;
  const openConflicts = allConflicts.filter((c) => c.status === "ACTIVE").length;

  function handleExcelExport() {
    alert("Excel export will be available once connected to the backend API. See SETUP_GUIDE.md for setup instructions.");
  }

  function handlePrintPDF() {
    window.print();
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Export</h1>
          <p className="page-sub">{batch.name} · Finalized output</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <button className="btn btn-secondary" onClick={handleExcelExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            Export Excel
          </button>
          <button className="btn btn-primary" onClick={handlePrintPDF}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Print PDF
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-lg)", marginBottom: "var(--space-xl)" }}>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: "var(--color-primary)" }}>{totalCandidates}</div>
          <div className="stat-label">Total Candidates</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{avgGroupSize}</div>
          <div className="stat-label">Avg Group Size</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{occupiedRooms}/{rooms.length}</div>
          <div className="stat-label">Rooms Used</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: openConflicts > 0 ? "var(--color-danger)" : "var(--color-success)" }}>{openConflicts}</div>
          <div className="stat-label">Open Conflicts</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: "var(--space-xl)" }}>
        {(["groups", "rooms", "conflicts", "allergies", "contacts"] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Group Rosters */}
      {tab === "groups" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-lg)" }}>
          {groups.map((group) => {
            const members = candidates.filter((c) => c.groupId === group.id);
            return (
              <div key={group.id} className="card">
                <div className="card-head">
                  <div>
                    <div style={{ fontWeight: "var(--font-weight-bold)" }}>{group.name}</div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{members.length} members · {batch.name}</div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                    <Chip kind="accent">{members.filter((m) => m.gender === "MALE").length} ♂</Chip>
                    <Chip kind={members.filter((m) => m.gender === "FEMALE").length > 0 ? "default" : "default"}>{members.filter((m) => m.gender === "FEMALE").length} ♀</Chip>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Age</th>
                        <th>Room</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => {
                        const room = rooms.find((r) => r.id === m.roomId);
                        return (
                          <tr key={m.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
                                <Initials name={m.fullName} gender={m.gender} size={20} fontSize={8} />
                                <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)" }}>{m.fullName}</span>
                              </div>
                            </td>
                            <td style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)" }}>{m.age ?? "—"}</td>
                            <td style={{ fontSize: "var(--font-size-xs)" }}>{room?.name ?? "—"}</td>
                            <td>{m.allergies && <AllergyBadge allergies={m.allergies} />}</td>
                          </tr>
                        );
                      })}
                      {members.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>No members assigned</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Assignments */}
      {tab === "rooms" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-lg)" }}>
          {rooms.map((room) => {
            const members = candidates.filter((c) => c.roomId === room.id);
            return (
              <div key={room.id} className="card">
                <div className="card-head">
                  <div>
                    <div style={{ fontWeight: "var(--font-weight-bold)" }}>{room.name}</div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{room.floor ?? ""} · {room.bedCount} beds</div>
                  </div>
                  <GenderChip gender={room.gender === "MIXED" ? "MALE" : room.gender as "MALE" | "FEMALE"} />
                </div>
                <div style={{ padding: "var(--space-sm)" }}>
                  {members.map((m) => {
                    const group = groups.find((g) => g.id === m.groupId);
                    return (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "6px 8px", borderBottom: "1px solid var(--border-color)" }}>
                        <Initials name={m.fullName} gender={m.gender} size={24} fontSize={10} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>{m.fullName}</div>
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{m.age ? `Age ${m.age}` : ""}{group ? ` · ${group.name}` : ""}</div>
                        </div>
                        {m.allergies && <AllergyBadge allergies={m.allergies} />}
                      </div>
                    );
                  })}
                  {members.length === 0 && (
                    <div style={{ textAlign: "center", padding: "var(--space-lg)", color: "var(--text-muted)", fontSize: "var(--font-size-sm)" }}>Empty room</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conflict Report */}
      {tab === "conflicts" && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Candidate A</th>
                  <th>Candidate B</th>
                  <th>Relationship</th>
                  <th>Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {allConflicts.map((c, i) => {
                  const location = c.groupId
                    ? groups.find((g) => g.id === c.groupId)?.name
                    : rooms.find((r) => r.id === c.roomId)?.name;
                  const conn = connections.find(
                    (conn) =>
                      (conn.fromId === c.candidateAId && conn.toId === c.candidateBId) ||
                      (conn.fromId === c.candidateBId && conn.toId === c.candidateAId)
                  );
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: "var(--font-weight-medium)" }}>{location ?? "—"}</td>
                      <td><Chip kind={c.groupId ? "accent" : "default"}>{c.groupId ? "Group" : "Room"}</Chip></td>
                      <td>{c.candidateAName ?? c.candidateAId}</td>
                      <td>{c.candidateBName ?? c.candidateBId}</td>
                      <td>{conn ? <Chip kind="default" style={{ textTransform: "capitalize" } as React.CSSProperties}>{conn.relationshipType.toLowerCase()}</Chip> : "—"}</td>
                      <td><Chip kind={c.status === "ACTIVE" ? "danger" : "success"}>{c.status === "ACTIVE" ? "Active" : "Dismissed"}</Chip></td>
                      <td style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{c.shepherdNote ?? "—"}</td>
                    </tr>
                  );
                })}
                {allConflicts.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "var(--space-2xl)", color: "var(--color-success)" }}>✓ No conflicts detected</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Allergies & Care */}
      {tab === "allergies" && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Group</th>
                  <th>Room</th>
                  <th>Allergy / Dietary Need</th>
                </tr>
              </thead>
              <tbody>
                {candidates.filter((c) => c.allergies).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                        <Initials name={c.fullName} gender={c.gender} size={24} fontSize={10} />
                        <span style={{ fontWeight: "var(--font-weight-medium)" }}>{c.fullName}</span>
                      </div>
                    </td>
                    <td><GenderChip gender={c.gender} /></td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{c.age ?? "—"}</td>
                    <td>{groups.find((g) => g.id === c.groupId)?.name ?? "—"}</td>
                    <td>{rooms.find((r) => r.id === c.roomId)?.name ?? "—"}</td>
                    <td><AllergyBadge allergies={c.allergies!} /></td>
                  </tr>
                ))}
                {candidates.filter((c) => c.allergies).length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--color-success)" }}>✓ No allergies declared</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Emergency Contacts */}
      {tab === "contacts" && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Group</th>
                  <th>Father / Guardian</th>
                  <th>Father Contact</th>
                  <th>Mother / Guardian</th>
                  <th>Mother Contact</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                        <Initials name={c.fullName} gender={c.gender} size={24} fontSize={10} />
                        <span style={{ fontWeight: "var(--font-weight-medium)" }}>{c.fullName}</span>
                      </div>
                    </td>
                    <td>{groups.find((g) => g.id === c.groupId)?.name ?? "—"}</td>
                    <td style={{ fontSize: "var(--font-size-sm)" }}>{c.fatherName ?? "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-sm)" }}>{c.fatherContact ?? "—"}</td>
                    <td style={{ fontSize: "var(--font-size-sm)" }}>{c.motherName ?? "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-sm)" }}>{c.motherContact ?? "—"}</td>
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
