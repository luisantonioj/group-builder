"use client";

import { useState, useMemo, useRef } from "react";
import { useApp } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import SearchInput from "@/components/ui/search-input";
import { Chip, GenderChip, AllergyBadge } from "@/components/ui/chip";
import Modal from "@/components/ui/modal";
import Initials from "@/components/ui/initials";
import type { Candidate, Gender } from "@/types";

// ─── Import helpers (module-level, no component state) ────────────────────────

function sanitizeCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().replace(/^[=+\-@\t\r]+/, "");
}

const SYSTEM_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "fullName",      label: "Full Name",           required: true },
  { key: "gender",        label: "Gender",              required: true },
  { key: "age",           label: "Age" },
  { key: "birthday",      label: "Birthday" },
  { key: "contact",       label: "Contact Number" },
  { key: "inviterName",   label: "Inviter Name" },
  { key: "school",        label: "School / Company" },
  { key: "address",       label: "Address" },
  { key: "facebook",      label: "Facebook" },
  { key: "howHeard",      label: "How Heard" },
  { key: "allergies",     label: "Allergies" },
  { key: "fatherName",    label: "Father's Name" },
  { key: "fatherContact", label: "Father's Contact" },
  { key: "motherName",    label: "Mother's Name" },
  { key: "motherContact", label: "Mother's Contact" },
];

const AUTO_PATTERNS: Record<string, string[]> = {
  fullName:      ["full name", "fullname", "name", "candidate"],
  gender:        ["gender", "sex"],
  age:           ["age"],
  birthday:      ["birthday", "birth date", "birthdate", "dob", "date of birth"],
  contact:       ["contact", "phone", "mobile", "number"],
  inviterName:   ["inviter", "invited by", "invited", "sponsor"],
  school:        ["school", "work", "company", "university", "college"],
  address:       ["address"],
  facebook:      ["facebook", "fb", "social"],
  howHeard:      ["how heard", "how", "heard", "source"],
  allergies:     ["allerg", "dietary", "food"],
  fatherName:    ["father name", "father's name", "dad name"],
  fatherContact: ["father contact", "father phone", "dad contact"],
  motherName:    ["mother name", "mother's name", "mom name"],
  motherContact: ["mother contact", "mother phone", "mom contact"],
};

function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [key, patterns] of Object.entries(AUTO_PATTERNS)) {
    const match = headers.find((h) => {
      const lower = h.toLowerCase();
      return patterns.some((p) => lower.includes(p));
    });
    if (match) mapping[key] = match;
  }
  return mapping;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface ImportModalData {
  headers: string[];
  rows: Record<string, unknown>[];
  mapping: Record<string, string>;
}

export default function MasterlistPage() {
  const { candidates, groups, rooms, connections, addCandidate, updateCandidate, deleteCandidate, importCandidates, batch } = useApp();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GROUPED" | "UNGROUPED">("ALL");
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
  const [isAddNew, setIsAddNew] = useState(false);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModalData, setImportModalData] = useState<ImportModalData | null>(null);
  const [importing, setImporting] = useState(false);

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

  // ── Import handlers ──────────────────────────────────────────────────────────

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so the same file can be re-selected
    if (!file) return;

    // Extension check
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      showToast("Only .xlsx and .xls files are supported.", "error");
      return;
    }

    // MIME check (browsers may report application/octet-stream for xlsx — allow it)
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
      "", // some environments report empty string
    ];
    if (file.type && !allowedMimes.includes(file.type)) {
      showToast("Invalid file type. Please upload a genuine .xlsx file.", "error");
      return;
    }

    // Size check (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      showToast("File too large. Maximum size is 10 MB.", "error");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        showToast("The file has no sheets.", "error");
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (rows.length === 0) {
        showToast("The spreadsheet has no data rows.", "error");
        return;
      }
      if (rows.length > 500) {
        showToast("Maximum 500 rows per import. Please split the file.", "error");
        return;
      }

      const headers = Object.keys(rows[0]);
      const mapping = autoDetectMapping(headers);
      setImportModalData({ headers, rows, mapping });
    } catch {
      showToast("Could not read the file. Make sure it is a valid .xlsx.", "error");
    }
  }

  async function handleImportConfirm(mapping: Record<string, string>) {
    if (!importModalData) return;
    setImporting(true);

    const getRaw = (row: Record<string, unknown>, field: string): string => {
      const col = mapping[field];
      if (!col) return "";
      const v = row[col];
      return typeof v === "string" ? sanitizeCell(v) : v !== null && v !== undefined ? String(v) : "";
    };

    // Build local Candidate objects from parsed rows
    const now = new Date().toISOString();
    const newCandidates = importModalData.rows
      .map((row, i): Candidate | null => {
        const fullName = getRaw(row, "fullName");
        if (!fullName) return null;
        const nameParts = fullName.split(",").map((s) => s.trim());
        const lastName = nameParts[0] ?? fullName;
        const firstName = nameParts[1] ?? "";
        const genderRaw = getRaw(row, "gender").toUpperCase();
        const gender: Gender = genderRaw === "F" || genderRaw === "FEMALE" ? "FEMALE" : "MALE";
        const ageStr = getRaw(row, "age");
        return {
          id: `import-${Date.now()}-${i}`,
          timestamp: now,
          fullName,
          lastName,
          firstName,
          gender,
          age: ageStr ? parseInt(ageStr, 10) || null : null,
          school: getRaw(row, "school") || null,
          inviterName: getRaw(row, "inviterName") || null,
          howHeard: getRaw(row, "howHeard") || null,
          yeBatch: batch.name,
          birthday: getRaw(row, "birthday") || null,
          address: getRaw(row, "address") || null,
          facebook: getRaw(row, "facebook") || null,
          contact: getRaw(row, "contact") || null,
          fatherName: getRaw(row, "fatherName") || null,
          fatherContact: getRaw(row, "fatherContact") || null,
          motherName: getRaw(row, "motherName") || null,
          motherContact: getRaw(row, "motherContact") || null,
          allergies: getRaw(row, "allergies") || null,
          shepherdNotes: null,
          groupId: null,
          roomId: null,
          batchId: batch.id,
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter((c): c is Candidate => c !== null);

    // Sanitize rows for the API payload
    const sanitizedRows = importModalData.rows.map((row) => {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        clean[k] = typeof v === "string" ? sanitizeCell(v) : v;
      }
      return clean;
    });

    // Update local store immediately (optimistic / offline-first)
    importCandidates(newCandidates);
    setImportModalData(null);

    // Attempt API persistence
    try {
      const res = await fetch("/api/candidates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: sanitizedRows, mapping, batchId: batch.id }),
      });
      const data = await res.json();
      if (res.ok) {
        const dupeNote = data.duplicates?.length
          ? ` · ${data.duplicates.length} duplicate${data.duplicates.length !== 1 ? "s" : ""} skipped`
          : "";
        showToast(`${data.created} candidate${data.created !== 1 ? "s" : ""} imported${dupeNote}`, "success");
      } else {
        showToast(`${newCandidates.length} candidates saved locally (sync pending)`, "info");
      }
    } catch {
      showToast(`${newCandidates.length} candidates saved locally (sync pending)`, "info");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Masterlist</h1>
          <p className="page-sub">{candidates.length} candidates · {batch.name}</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
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

      {/* Import column-mapping modal */}
      {importModalData && (
        <ImportModal
          headers={importModalData.headers}
          rows={importModalData.rows}
          initialMapping={importModalData.mapping}
          importing={importing}
          onClose={() => setImportModalData(null)}
          onConfirm={handleImportConfirm}
        />
      )}
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ headers, rows, initialMapping, importing, onClose, onConfirm }: {
  headers: string[];
  rows: Record<string, unknown>[];
  initialMapping: Record<string, string>;
  importing: boolean;
  onClose: () => void;
  onConfirm: (mapping: Record<string, string>) => void;
}) {
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const canImport = !!mapping["fullName"] && !!mapping["gender"];

  function setField(key: string, val: string) {
    setMapping((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <Modal
      open
      title="Map Spreadsheet Columns"
      onClose={onClose}
      size="lg"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
            {rows.length} row{rows.length !== 1 ? "s" : ""} detected
          </span>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={importing}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canImport || importing}
              onClick={() => onConfirm(mapping)}
            >
              {importing ? "Importing…" : `Import ${rows.length} row${rows.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      }
    >
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-lg)" }}>
        Match each system field to the corresponding column in your spreadsheet. Fields marked <span style={{ color: "var(--color-danger)" }}>*</span> are required.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {SYSTEM_FIELDS.map(({ key, label, required }) => (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "160px 1fr", alignItems: "center", gap: "var(--space-md)" }}>
            <label style={{
              fontSize: "var(--font-size-sm)",
              color: required ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: required ? "var(--font-weight-semibold)" : undefined,
            }}>
              {label}{required && <span style={{ color: "var(--color-danger)", marginLeft: 2 }}>*</span>}
            </label>
            <select
              className="input"
              value={mapping[key] ?? ""}
              onChange={(e) => setField(key, e.target.value)}
              style={{ fontSize: "var(--font-size-sm)" }}
            >
              <option value="">— Skip —</option>
              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Data preview */}
      <div style={{ marginTop: "var(--space-xl)" }}>
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginBottom: "var(--space-sm)" }}>
          Preview — first 3 rows
        </p>
        <div style={{ overflowX: "auto", background: "var(--bg-hover)", borderRadius: "var(--radius-sm)", padding: "var(--space-sm)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-xs)" }}>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h} style={{ padding: "2px 8px", textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 3).map((row, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <td key={h} style={{ padding: "2px 8px", color: "var(--text-secondary)", whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {String(row[h] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
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
