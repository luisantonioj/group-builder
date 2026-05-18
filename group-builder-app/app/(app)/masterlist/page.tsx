"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import SearchInput from "@/components/ui/search-input";
import { Chip, GenderChip, AllergyBadge } from "@/components/ui/chip";
import Modal from "@/components/ui/modal";
import Initials from "@/components/ui/initials";
import type { Candidate, Gender } from "@/types";

export default function MasterlistPage() {
  const { candidates, groups, rooms, connections, addCandidate, updateCandidate, deleteCandidate, batch } = useApp();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GROUPED" | "UNGROUPED">("ALL");
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
  const [isAddNew, setIsAddNew] = useState(false);

  const connectionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const conn of connections) {
      map.set(conn.fromId, (map.get(conn.fromId) ?? 0) + 1);
      map.set(conn.toId, (map.get(conn.toId) ?? 0) + 1);
    }
    return map;
  }, [connections]);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (genderFilter !== "ALL" && c.gender !== genderFilter) return false;
      if (statusFilter === "GROUPED" && !c.groupId) return false;
      if (statusFilter === "UNGROUPED" && c.groupId) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.fullName.toLowerCase().includes(q) ||
          c.school?.toLowerCase().includes(q) ||
          c.inviterName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [candidates, genderFilter, statusFilter, search]);

  function handleSave(updated: Candidate) {
    if (isAddNew) {
      addCandidate(updated);
      showToast(`${updated.fullName} added successfully`, "success");
    } else {
      updateCandidate(updated);
      showToast(`${updated.fullName} updated`, "success");
    }
    setEditCandidate(null);
    setIsAddNew(false);
  }

  function handleDelete(id: string) {
    const c = candidates.find((c) => c.id === id);
    if (confirm(`Delete ${c?.fullName}? This cannot be undone.`)) {
      deleteCandidate(id);
      setEditCandidate(null);
      showToast("Candidate deleted", "info");
    }
  }

  function openNew() {
    setIsAddNew(true);
    setEditCandidate({
      id: `c${Date.now()}`,
      timestamp: new Date().toISOString(),
      fullName: "",
      lastName: "",
      firstName: "",
      gender: "MALE",
      age: null,
      school: null,
      inviterName: null,
      howHeard: null,
      yeBatch: batch.name,
      birthday: null,
      address: null,
      facebook: null,
      contact: null,
      fatherName: null,
      fatherContact: null,
      motherName: null,
      motherContact: null,
      allergies: null,
      shepherdNotes: null,
      groupId: null,
      roomId: null,
      batchId: batch.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Masterlist</h1>
          <p className="page-sub">{candidates.length} candidates · {batch.name}</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <button className="btn btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import .xlsx
          </button>
          <button className="btn btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Candidate
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-lg)", alignItems: "center", flexWrap: "wrap" }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, school, inviter…" className="search-input" />
        <div style={{ display: "flex", gap: 2, background: "var(--bg-hover)", borderRadius: "var(--radius-sm)", padding: 3 }}>
          {(["ALL", "MALE", "FEMALE"] as const).map((v) => (
            <button key={v} onClick={() => setGenderFilter(v)} className={`btn btn-sm ${genderFilter === v ? "btn-primary" : "btn-ghost"}`} style={{ padding: "4px 10px" }}>{v === "ALL" ? "All" : v === "MALE" ? "♂ Male" : "♀ Female"}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 2, background: "var(--bg-hover)", borderRadius: "var(--radius-sm)", padding: 3 }}>
          {(["ALL", "GROUPED", "UNGROUPED"] as const).map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)} className={`btn btn-sm ${statusFilter === v ? "btn-primary" : "btn-ghost"}`} style={{ padding: "4px 10px" }}>{v.charAt(0) + v.slice(1).toLowerCase()}</button>
          ))}
        </div>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginLeft: "auto" }}>{filtered.length} shown</span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Gender</th>
                <th>Age</th>
                <th>School / Work</th>
                <th>Inviter</th>
                <th>Connections</th>
                <th>Group</th>
                <th>Room</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const connCount = connectionCounts.get(c.id) ?? 0;
                const group = groups.find((g) => g.id === c.groupId);
                const room = rooms.find((r) => r.id === c.roomId);
                return (
                  <tr key={c.id} onClick={() => { setIsAddNew(false); setEditCandidate(c); }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                        <Initials name={c.fullName} gender={c.gender} size={28} />
                        <div>
                          <div style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)" }}>{c.fullName}</div>
                          {c.allergies && <AllergyBadge allergies={c.allergies} />}
                        </div>
                      </div>
                    </td>
                    <td><GenderChip gender={c.gender} /></td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{c.age ?? "—"}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{c.school ?? "—"}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-xs)" }}>{c.inviterName ?? "—"}</td>
                    <td>
                      {connCount > 0 ? (
                        <Chip kind="warning">⚠ {connCount}</Chip>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>0</span>
                      )}
                    </td>
                    <td>{group ? <Chip kind="accent">{group.name}</Chip> : <span style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>—</span>}</td>
                    <td>{room ? <Chip kind="default">{room.name}</Chip> : <span style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>—</span>}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setIsAddNew(false); setEditCandidate(c); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "var(--space-2xl)", color: "var(--text-muted)" }}>No candidates match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add modal */}
      {editCandidate && (
        <CandidateModal
          candidate={editCandidate}
          isNew={isAddNew}
          groups={groups}
          rooms={rooms}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setEditCandidate(null); setIsAddNew(false); }}
        />
      )}
    </div>
  );
}

// ─── Candidate Edit Modal ─────────────────────────────────────────────────────

function CandidateModal({ candidate: initial, isNew, groups, rooms, onSave, onDelete, onClose }: {
  candidate: Candidate;
  isNew: boolean;
  groups: { id: string; name: string }[];
  rooms: { id: string; name: string; gender: string }[];
  onSave: (c: Candidate) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Candidate>(initial);
  const [tab, setTab] = useState<"details" | "assignment" | "contacts">("details");

  function set(field: keyof Candidate, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lastName = form.lastName.trim();
    const firstName = form.firstName.trim();
    const fullName = `${lastName}, ${firstName}`;
    onSave({ ...form, fullName, updatedAt: new Date().toISOString() });
  }

  const genderRooms = rooms.filter((r) => r.gender === form.gender || r.gender === "MIXED");

  return (
    <Modal open title={isNew ? "Add Candidate" : `Edit — ${initial.fullName}`} onClose={onClose} size="lg"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          {!isNew && <button type="button" className="btn btn-danger" onClick={() => onDelete(form.id)}>Delete</button>}
          <div style={{ display: "flex", gap: "var(--space-sm)", marginLeft: "auto" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" form="candidate-form" className="btn btn-primary">Save Changes</button>
          </div>
        </div>
      }
    >
      <div className="tabs" style={{ marginBottom: "var(--space-lg)" }}>
        {(["details", "assignment", "contacts"] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <form id="candidate-form" onSubmit={handleSubmit}>
        {tab === "details" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="input" required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="e.g. Santos" />
              </div>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="input" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="e.g. Patricia" />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select className="input" value={form.gender} onChange={(e) => set("gender", e.target.value as Gender)}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="input" type="number" min={10} max={40} value={form.age ?? ""} onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 18" />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">School / Company</label>
                <input className="input" value={form.school ?? ""} onChange={(e) => set("school", e.target.value || null)} placeholder="e.g. De La Salle Lipa" />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input className="input" value={form.contact ?? ""} onChange={(e) => set("contact", e.target.value || null)} placeholder="09XXXXXXXXX" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Inviter Name</label>
              <input className="input" value={form.inviterName ?? ""} onChange={(e) => set("inviterName", e.target.value || null)} placeholder="Who invited them? (or leave blank)" />
            </div>
            <div className="form-group">
              <label className="form-label">How did they hear about YE?</label>
              <input className="input" value={form.howHeard ?? ""} onChange={(e) => set("howHeard", e.target.value || null)} placeholder="e.g. Instagram, friend, church bulletin" />
            </div>
            <div className="form-group">
              <label className="form-label">Food Allergies / Dietary Needs</label>
              <input className="input" value={form.allergies ?? ""} onChange={(e) => set("allergies", e.target.value || null)} placeholder="e.g. Nuts, shellfish (leave blank if none)" />
              {form.allergies && (
                <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-warning)", marginTop: 2 }}>⚠ This will be flagged on the candidate card and in reports.</p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Shepherd Notes (internal)</label>
              <textarea className="input" value={form.shepherdNotes ?? ""} onChange={(e) => set("shepherdNotes", e.target.value || null)} placeholder="Internal notes visible only to shepherds…" rows={3} style={{ resize: "vertical" }} />
            </div>
          </div>
        )}

        {tab === "assignment" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <div className="form-group">
              <label className="form-label">Assign to Group</label>
              <select className="input" value={form.groupId ?? ""} onChange={(e) => set("groupId", e.target.value || null)}>
                <option value="">— Not assigned —</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign to Room</label>
              <select className="input" value={form.roomId ?? ""} onChange={(e) => set("roomId", e.target.value || null)}>
                <option value="">— Not assigned —</option>
                {genderRooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {rooms.length > genderRooms.length && (
                <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: 2 }}>Only {form.gender === "MALE" ? "male" : "female"} and mixed rooms shown.</p>
              )}
            </div>
          </div>
        )}

        {tab === "contacts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Father / Guardian Name</label>
                <input className="input" value={form.fatherName ?? ""} onChange={(e) => set("fatherName", e.target.value || null)} />
              </div>
              <div className="form-group">
                <label className="form-label">Father / Guardian Contact</label>
                <input className="input" value={form.fatherContact ?? ""} onChange={(e) => set("fatherContact", e.target.value || null)} />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Mother / Guardian Name</label>
                <input className="input" value={form.motherName ?? ""} onChange={(e) => set("motherName", e.target.value || null)} />
              </div>
              <div className="form-group">
                <label className="form-label">Mother / Guardian Contact</label>
                <input className="input" value={form.motherContact ?? ""} onChange={(e) => set("motherContact", e.target.value || null)} />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="input" value={form.address ?? ""} onChange={(e) => set("address", e.target.value || null)} />
              </div>
              <div className="form-group">
                <label className="form-label">Facebook Account</label>
                <input className="input" value={form.facebook ?? ""} onChange={(e) => set("facebook", e.target.value || null)} placeholder="facebook.com/…" />
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
