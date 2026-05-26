"use client";

import { useState, useMemo, useRef } from "react";
import { useApp } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import SearchInput from "@/components/ui/search-input";
import { Chip, GenderChip, AllergyBadge } from "@/components/ui/chip";
import Modal from "@/components/ui/modal";
import Initials from "@/components/ui/initials";
import type { Candidate, Connection, Gender, RelationshipType } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

type SortConfig = { key: string; dir: "asc" | "desc" };

// Extra columns: hidden by default, toggleable via Columns modal
const EXTRA_COLUMNS: { key: keyof Candidate; label: string }[] = [
  { key: "contact",       label: "Contact" },
  { key: "birthday",      label: "Birthday" },
  { key: "allergies",     label: "Allergies" },
  { key: "howHeard",      label: "How Heard" },
  { key: "address",       label: "Address" },
  { key: "facebook",      label: "Facebook" },
  { key: "fatherName",    label: "Father Name" },
  { key: "fatherContact", label: "Father Contact" },
  { key: "motherName",    label: "Mother Name" },
  { key: "motherContact", label: "Mother Contact" },
  { key: "shepherdNotes", label: "Notes" },
];

// Columns available for sorting in the Sort modal
const FIXED_SORT_COLS = [
  { key: "fullName",    label: "Name" },
  { key: "gender",      label: "Gender" },
  { key: "age",         label: "Age" },
  { key: "school",      label: "School / Work" },
  { key: "inviterName", label: "Inviter" },
  { key: "connections", label: "Connections" },
  { key: "group",       label: "Group" },
  { key: "room",        label: "Room" },
];

// ─── Import helpers ────────────────────────────────────────────────────────────

function sanitizeCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().replace(/^[=+\-@\t\r]+/, "");
}

const SYSTEM_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "fullName",      label: "Full Name",      required: true },
  { key: "gender",        label: "Gender" },
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
  const { candidates, groups, rooms, connections, addCandidate, updateCandidate, deleteCandidate, deleteCandidates, importCandidates, addConnection, deleteConnection, event: batch } = useApp();
  const { showToast } = useToast();

  // Filters
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GROUPED" | "UNGROUPED">("ALL");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Edit / add
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
  const [isAddNew, setIsAddNew] = useState(false);

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModalData, setImportModalData] = useState<ImportModalData | null>(null);
  const [importing, setImporting] = useState(false);

  // Column visibility (extra columns hidden by default)
  const [visibleExtraColumns, setVisibleExtraColumns] = useState<string[]>([]);
  const [columnModalOpen, setColumnModalOpen] = useState(false);

  // Sort
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [sortModalOpen, setSortModalOpen] = useState(false);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const connectionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const conn of connections) {
      map.set(conn.fromId, (map.get(conn.fromId) ?? 0) + 1);
      map.set(conn.toId, (map.get(conn.toId) ?? 0) + 1);
    }
    return map;
  }, [connections]);

  const filtered = useMemo(() => {
    let list = candidates.filter((c) => {
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

    if (sortConfig) {
      list = [...list].sort((a, b) => {
        let aVal: string | number | null | undefined;
        let bVal: string | number | null | undefined;

        if (sortConfig.key === "connections") {
          aVal = connectionCounts.get(a.id) ?? 0;
          bVal = connectionCounts.get(b.id) ?? 0;
        } else if (sortConfig.key === "group") {
          aVal = groups.find((g) => g.id === a.groupId)?.name ?? null;
          bVal = groups.find((g) => g.id === b.groupId)?.name ?? null;
        } else if (sortConfig.key === "room") {
          aVal = rooms.find((r) => r.id === a.roomId)?.name ?? null;
          bVal = rooms.find((r) => r.id === b.roomId)?.name ?? null;
        } else {
          aVal = (a as unknown as Record<string, unknown>)[sortConfig.key] as string | number | null;
          bVal = (b as unknown as Record<string, unknown>)[sortConfig.key] as string | number | null;
        }

        // Nulls / empty strings go to end regardless of direction
        const aEmpty = aVal === null || aVal === undefined || aVal === "";
        const bEmpty = bVal === null || bVal === undefined || bVal === "";
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1;
        if (bEmpty) return -1;

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.dir === "asc" ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
        return sortConfig.dir === "asc" ? cmp : -cmp;
      });
    }

    return list;
  }, [candidates, genderFilter, statusFilter, search, sortConfig, connectionCounts, groups, rooms]);

  // Visible extra column definitions in stable order
  const activeExtraCols = useMemo(
    () => EXTRA_COLUMNS.filter((c) => visibleExtraColumns.includes(c.key as string)),
    [visibleExtraColumns]
  );

  // Sort columns: fixed + any active extra columns
  const sortCols = useMemo(
    () => [...FIXED_SORT_COLS, ...activeExtraCols.map((c) => ({ key: c.key as string, label: c.label }))],
    [activeExtraCols]
  );

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function handleSort(key: string) {
    setSortConfig((prev) =>
      prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  // Renders a sort arrow indicator for a given column key
  function sortArrow(key: string) {
    if (sortConfig?.key !== key)
      return <span style={{ marginLeft: 3, opacity: 0.2, fontSize: "0.75em" }}>↕</span>;
    return (
      <span style={{ marginLeft: 3, fontSize: "0.75em", color: "var(--color-accent, currentColor)" }}>
        {sortConfig.dir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  const thSort: React.CSSProperties = { cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };

  // ── CRUD handlers ─────────────────────────────────────────────────────────────

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

  function handleToggleSelectAll() {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.id));
    }
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleDeleteSelected() {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} selected candidates? This cannot be undone.`)) return;

    const idsToDelete = [...selectedIds];
    deleteCandidates(idsToDelete);
    setSelectedIds([]);

    try {
      const res = await fetch("/api/candidates/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });
      if (res.ok) {
        showToast(`${idsToDelete.length} candidates deleted`, "success");
      } else {
        showToast("Failed to sync deletions with server", "error");
      }
    } catch {
      showToast("Sync pending (offline)", "info");
    }
  }

  function openNew() {
    setIsAddNew(true);
    setEditCandidate({
      id: `c${Date.now()}`,
      timestamp: new Date().toISOString(),
      fullName: "", lastName: "", firstName: "",
      gender: "MALE", age: null, school: null,
      inviterName: null, howHeard: null,
      yeBatch: batch.name,
      birthday: null, address: null, facebook: null, contact: null,
      fatherName: null, fatherContact: null,
      motherName: null, motherContact: null,
      allergies: null, shepherdNotes: null,
      groupId: null, roomId: null,
      eventId: batch.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // ── Import handlers ───────────────────────────────────────────────────────────

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      showToast("Only .xlsx and .xls files are supported.", "error");
      return;
    }
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
      "",
    ];
    if (file.type && !allowedMimes.includes(file.type)) {
      showToast("Invalid file type. Please upload a genuine .xlsx file.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("File too large. Maximum size is 10 MB.", "error");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) { showToast("The file has no sheets.", "error"); return; }
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (rows.length === 0) { showToast("The spreadsheet has no data rows.", "error"); return; }
      if (rows.length > 500) { showToast("Maximum 500 rows per import. Please split the file.", "error"); return; }
      const headers = Object.keys(rows[0]);
      setImportModalData({ headers, rows, mapping: autoDetectMapping(headers) });
    } catch {
      showToast("Could not read the file. Make sure it is a valid .xlsx.", "error");
    }
  }

  async function handleImportConfirm(parsed: Candidate[], mapping: Record<string, string>) {
    if (!importModalData) return;
    setImporting(true);

    // ── Client-side duplicate detection ────────────────────────────────────────
    // Normalize helpers
    const normName = (n: string) => n.toLowerCase().replace(/\s+/g, " ").trim();
    const normContact = (c: string) => c.replace(/[\s\-().+]/g, "");

    // Seed lookup sets from the existing store
    const seenNames = new Set(candidates.map((c) => normName(c.fullName)));
    const seenContacts = new Set(
      candidates.filter((c) => c.contact).map((c) => normContact(c.contact!))
    );

    const freshCandidates: Candidate[] = [];
    const skippedDupes: string[] = [];

    for (const c of parsed) {
      const nameKey = normName(c.fullName);
      const contactKey = c.contact ? normContact(c.contact) : null;
      const isDupe = seenNames.has(nameKey) || (contactKey !== null && seenContacts.has(contactKey));

      if (isDupe) {
        skippedDupes.push(c.fullName);
      } else {
        freshCandidates.push(c);
        // Also guard against duplicates within the same batch being imported
        seenNames.add(nameKey);
        if (contactKey) seenContacts.add(contactKey);
      }
    }

    // All entries already exist — exit early without touching the store
    if (freshCandidates.length === 0) {
      const n = skippedDupes.length;
      showToast(
        n > 0
          ? `All ${n} entr${n !== 1 ? "ies" : "y"} already exist — nothing imported.`
          : "No valid candidates found in the file.",
        "info"
      );
      setImportModalData(null);
      setImporting(false);
      return;
    }

    // Update local store with only fresh candidates
    importCandidates(freshCandidates);
    setImportModalData(null);

    const buildNote = (created: number, dupes: number) => {
      const dupeStr = dupes > 0 ? ` · ${dupes} duplicate${dupes !== 1 ? "s" : ""} skipped` : "";
      return `${created} candidate${created !== 1 ? "s" : ""} imported${dupeStr}`;
    };

    try {
      // For the server-side, we need to send the final parsed candidates or the original rows + mapping.
      // Since we already did the review, it's better to send the final parsed list if the API supports it,
      // but let's stick to the existing API contract for safety and just update the mapping if needed.
      // Actually, the user might have changed Genders in the review step.
      // We should update the API to handle the final parsed list or adjust the rows before sending.
      // Let's send the rows but with an extra field if the API allows it, or just send the final objects.

      // Re-map rows to include any gender changes from the review step if we were to stay with the current API.
      // However, it's cleaner to just update the rows in memory.
      const sanitizedRows = importModalData.rows.map((row, idx) => {
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) clean[k] = typeof v === "string" ? sanitizeCell(v) : v;
        // Inject the chosen gender back into the row so the API picks it up
        const finalCandidate = parsed[idx];
        if (finalCandidate) {
          const genderCol = mapping["gender"] || "Imported Gender";
          clean[genderCol] = finalCandidate.gender;
        }
        return clean;
      });

      const res = await fetch("/api/candidates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: sanitizedRows,
          mapping: mapping["gender"] ? mapping : { ...mapping, gender: "Imported Gender" },
          eventId: batch.id
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const serverDupes = data.duplicates?.length ?? 0;
        showToast(buildNote(data.created ?? freshCandidates.length, serverDupes + skippedDupes.length), "success");
      } else {
        showToast(`${buildNote(freshCandidates.length, skippedDupes.length)} (sync pending)`, "info");
      }
    } catch {
      showToast(`${buildNote(freshCandidates.length, skippedDupes.length)} (sync pending)`, "info");
    } finally {
      setImporting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const totalCols = 9 + activeExtraCols.length;
  const activeSortLabel = sortConfig ? sortCols.find((c) => c.key === sortConfig.key)?.label ?? sortConfig.key : null;

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileSelect} />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Masterlist</h1>
          <p className="page-sub">{candidates.length} candidates · {batch.name}</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {selectedIds.length > 0 && (
            <button className="btn btn-danger" onClick={handleDeleteSelected} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" />
              </svg>
              Delete {selectedIds.length}
            </button>
          )}
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

        {/* Gender toggle */}
        <div style={{ display: "flex", gap: 2, background: "var(--bg-hover)", borderRadius: "var(--radius-sm)", padding: 3 }}>
          {(["ALL", "MALE", "FEMALE"] as const).map((v) => (
            <button key={v} onClick={() => setGenderFilter(v)} className={`btn btn-sm ${genderFilter === v ? "btn-primary" : "btn-ghost"}`} style={{ padding: "4px 10px" }}>
              {v === "ALL" ? "All" : v === "MALE" ? "♂ Male" : "♀ Female"}
            </button>
          ))}
        </div>

        {/* Status toggle */}
        <div style={{ display: "flex", gap: 2, background: "var(--bg-hover)", borderRadius: "var(--radius-sm)", padding: 3 }}>
          {(["ALL", "GROUPED", "UNGROUPED"] as const).map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)} className={`btn btn-sm ${statusFilter === v ? "btn-primary" : "btn-ghost"}`} style={{ padding: "4px 10px" }}>
              {v.charAt(0) + v.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Right-side controls */}
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
          {/* Active sort chip */}
          {sortConfig && activeSortLabel && (
            <div
              style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--bg-hover)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", padding: "3px 8px", fontSize: "var(--font-size-xs)", cursor: "pointer" }}
              onClick={() => setSortModalOpen(true)}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                {activeSortLabel} {sortConfig.dir === "asc" ? "↑" : "↓"}
              </span>
              <span
                onClick={(e) => { e.stopPropagation(); setSortConfig(null); }}
                style={{ marginLeft: 2, color: "var(--text-muted)", cursor: "pointer", lineHeight: 1, fontWeight: "bold" }}
              >×</span>
            </div>
          )}

          {/* Sort button */}
          <button
            className={`btn btn-sm ${sortConfig ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSortModalOpen(true)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="9" y2="18" />
            </svg>
            Sort
          </button>

          {/* Columns button */}
          <button
            className={`btn btn-sm ${visibleExtraColumns.length > 0 ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setColumnModalOpen(true)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="18" /><rect x="14" y="3" width="7" height="18" />
            </svg>
            Columns{visibleExtraColumns.length > 0 ? ` (${visibleExtraColumns.length})` : ""}
          </button>

          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{filtered.length} shown</span>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={thSort} onClick={() => handleSort("fullName")}>Name{sortArrow("fullName")}</th>
                <th style={thSort} onClick={() => handleSort("gender")}>Gender{sortArrow("gender")}</th>
                <th style={thSort} onClick={() => handleSort("age")}>Age{sortArrow("age")}</th>
                <th style={thSort} onClick={() => handleSort("school")}>School / Work{sortArrow("school")}</th>
                <th style={thSort} onClick={() => handleSort("inviterName")}>Inviter{sortArrow("inviterName")}</th>
                <th style={thSort} onClick={() => handleSort("connections")}>Connections{sortArrow("connections")}</th>
                <th style={thSort} onClick={() => handleSort("group")}>Group{sortArrow("group")}</th>
                <th style={thSort} onClick={() => handleSort("room")}>Room{sortArrow("room")}</th>
                {activeExtraCols.map((col) => (
                  <th key={col.key as string} style={thSort} onClick={() => handleSort(col.key as string)}>
                    {col.label}{sortArrow(col.key as string)}
                  </th>
                ))}
                <th style={{ textAlign: "right", width: 120 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", fontWeight: "normal" }}>Select</span>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: "pointer", width: 16, height: 16 }}
                      title="Select all"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const connCount = connectionCounts.get(c.id) ?? 0;
                const group = groups.find((g) => g.id === c.groupId);
                const room = rooms.find((r) => r.id === c.roomId);
                const isSelected = selectedIds.includes(c.id);
                return (
                  <tr key={c.id} onClick={() => { setIsAddNew(false); setEditCandidate(c); }} style={{ background: isSelected ? "var(--bg-hover)" : undefined }}>
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
                      {connCount > 0
                        ? <Chip kind="warning">⚠ {connCount}</Chip>
                        : <span style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>0</span>}
                    </td>
                    <td>{group ? <Chip kind="accent">{group.name}</Chip> : <span style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>—</span>}</td>
                    <td>{room ? <Chip kind="default">{room.name}</Chip> : <span style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>—</span>}</td>
                    {activeExtraCols.map((col) => (
                      <td key={col.key as string} style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-xs)" }}>
                        {String(c[col.key] ?? "—")}
                      </td>
                    ))}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setIsAddNew(false); setEditCandidate(c); }} style={{ padding: "4px 8px" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(c.id)}
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={totalCols} style={{ textAlign: "center", padding: "var(--space-2xl)", color: "var(--text-muted)" }}>
                    No candidates match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add modal */}
      {editCandidate && (
        <CandidateModal
          candidate={editCandidate} isNew={isAddNew}
          groups={groups} rooms={rooms}
          candidates={candidates} connections={connections}
          onSave={handleSave} onDelete={handleDelete}
          onAddConnection={addConnection} onDeleteConnection={deleteConnection}
          onClose={() => { setEditCandidate(null); setIsAddNew(false); }}
        />
      )}

      {/* Import column-mapping modal */}
      {importModalData && (
        <ImportModal
          headers={importModalData.headers} rows={importModalData.rows}
          initialMapping={importModalData.mapping} importing={importing}
          onClose={() => setImportModalData(null)} onConfirm={handleImportConfirm}
        />
      )}

      {/* Column visibility modal */}
      {columnModalOpen && (
        <ColumnModal
          visible={visibleExtraColumns}
          onApply={(cols) => setVisibleExtraColumns(cols)}
          onClose={() => setColumnModalOpen(false)}
        />
      )}

      {/* Sort modal */}
      {sortModalOpen && (
        <SortModal
          config={sortConfig}
          columns={sortCols}
          onApply={(cfg) => setSortConfig(cfg)}
          onClear={() => setSortConfig(null)}
          onClose={() => setSortModalOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Column Visibility Modal ──────────────────────────────────────────────────

function ColumnModal({ visible, onApply, onClose }: {
  visible: string[];
  onApply: (cols: string[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<string[]>(visible);

  function toggle(key: string) {
    setLocal((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  return (
    <Modal
      open
      title="Visible Columns"
      onClose={onClose}
      size="sm"
      footer={
        <div style={{ display: "flex", gap: "var(--space-sm)", marginLeft: "auto" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => { onApply(local); onClose(); }}>Apply</button>
        </div>
      }
    >
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
        Fixed columns (Name, Gender, Age, School, Inviter, Connections, Group, Room) are always shown.
        Toggle additional columns below.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {EXTRA_COLUMNS.map(({ key, label }) => (
          <label
            key={key as string}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer", fontSize: "var(--font-size-sm)", padding: "var(--space-xs) 0" }}
          >
            <input
              type="checkbox"
              checked={local.includes(key as string)}
              onChange={() => toggle(key as string)}
              style={{ cursor: "pointer" }}
            />
            {label}
          </label>
        ))}
      </div>
    </Modal>
  );
}

// ─── Sort Modal ───────────────────────────────────────────────────────────────

function SortModal({ config, columns, onApply, onClear, onClose }: {
  config: SortConfig | null;
  columns: { key: string; label: string }[];
  onApply: (cfg: SortConfig) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [key, setKey] = useState(config?.key ?? columns[0]?.key ?? "fullName");
  const [dir, setDir] = useState<"asc" | "desc">(config?.dir ?? "asc");

  return (
    <Modal
      open
      title="Sort"
      onClose={onClose}
      size="sm"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => { onClear(); onClose(); }}
          >
            Clear sort
          </button>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => { onApply({ key, dir }); onClose(); }}>Apply</button>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        <div className="form-group">
          <label className="form-label">Sort by</label>
          <select className="input" value={key} onChange={(e) => setKey(e.target.value)}>
            {columns.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Direction</label>
          <div style={{ display: "flex", gap: 2, background: "var(--bg-hover)", borderRadius: "var(--radius-sm)", padding: 3 }}>
            {(["asc", "desc"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`btn btn-sm ${dir === d ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "4px 16px" }}
                onClick={() => setDir(d)}
              >
                {d === "asc" ? "↑ Ascending" : "↓ Descending"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ headers, rows, initialMapping, importing, onClose, onConfirm }: {
  headers: string[];
  rows: Record<string, unknown>[];
  initialMapping: Record<string, string>;
  importing: boolean;
  onClose: () => void;
  onConfirm: (parsed: Candidate[], mapping: Record<string, string>) => void;
}) {
  const [stage, setStage] = useState<"mapping" | "review">("mapping");
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [parsedCandidates, setParsedCandidates] = useState<Candidate[]>([]);
  const { event: batch } = useApp();

  const canProceed = !!mapping["fullName"];

  function handleGoToReview() {
    const getRaw = (row: Record<string, unknown>, field: string): string => {
      const col = mapping[field];
      if (!col) return "";
      const v = row[col];
      return typeof v === "string" ? sanitizeCell(v) : v !== null && v !== undefined ? String(v) : "";
    };

    const now = new Date().toISOString();
    const parsed = rows.map((row, i): Candidate | null => {
      const fullName = getRaw(row, "fullName");
      if (!fullName) return null;
      const nameParts = fullName.split(",").map((s) => s.trim());
      const lastName = nameParts[0] ?? fullName;
      const firstName = nameParts[1] ?? "";
      
      const genderRaw = getRaw(row, "gender").toUpperCase();
      let gender: Gender = "MALE";
      if (genderRaw.startsWith("F")) gender = "FEMALE";
      else if (genderRaw.startsWith("M")) gender = "MALE";
      // If gender was not mapped or is empty, we'll let user select in review stage

      const ageStr = getRaw(row, "age");
      return {
        id: `import-${Date.now()}-${i}`,
        timestamp: now, fullName, lastName, firstName, gender,
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
        shepherdNotes: null, groupId: null, roomId: null,
        eventId: batch.id, createdAt: now, updatedAt: now,
      };
    }).filter((c): c is Candidate => c !== null);

    setParsedCandidates(parsed);
    setStage("review");
  }

  function updateParsedGender(idx: number, gender: Gender) {
    setParsedCandidates((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx], gender };
      return next;
    });
  }

  return (
    <Modal
      open
      title={stage === "mapping" ? "Map Spreadsheet Columns" : "Review & Set Genders"}
      onClose={onClose}
      size="lg"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
            {rows.length} row{rows.length !== 1 ? "s" : ""} detected
          </span>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={importing}>Cancel</button>
            {stage === "mapping" ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canProceed}
                onClick={handleGoToReview}
              >
                Review Candidates →
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={importing}
                onClick={() => onConfirm(parsedCandidates, mapping)}
              >
                {importing ? "Importing…" : `Finalize Import (${parsedCandidates.length})`}
              </button>
            )}
          </div>
        </div>
      }
    >
      {stage === "mapping" ? (
        <>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-lg)" }}>
            Match each system field to the corresponding column in your spreadsheet.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {SYSTEM_FIELDS.map(({ key, label, required }) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "160px 1fr", alignItems: "center", gap: "var(--space-md)" }}>
                <label style={{ fontSize: "var(--font-size-sm)", color: required ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: required ? "var(--font-weight-semibold)" : undefined }}>
                  {label}{required && <span style={{ color: "var(--color-danger)", marginLeft: 2 }}>*</span>}
                </label>
                <select
                  className="input"
                  value={mapping[key] ?? ""}
                  onChange={(e) => setMapping(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ fontSize: "var(--font-size-sm)" }}
                >
                  <option value="">— Skip —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-lg)" }}>
            Verify the information below. You can set or correct genders before importing.
          </p>
          <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1, boxShadow: "0 1px 0 var(--border-color)" }}>
                <tr>
                  <th style={{ textAlign: "left", padding: "var(--space-sm) var(--space-md)", color: "var(--text-muted)", fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: "left", padding: "var(--space-sm) var(--space-md)", color: "var(--text-muted)", fontWeight: 600, width: 140 }}>Gender</th>
                  <th style={{ textAlign: "left", padding: "var(--space-sm) var(--space-md)", color: "var(--text-muted)", fontWeight: 600 }}>School / Info</th>
                </tr>
              </thead>
              <tbody>
                {parsedCandidates.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "var(--space-sm) var(--space-md)", color: "var(--text-primary)", fontWeight: 500 }}>{c.fullName}</td>
                    <td style={{ padding: "var(--space-sm) var(--space-md)" }}>
                      <select
                        className="input"
                        style={{ padding: "2px 8px", height: "32px", fontSize: "var(--font-size-xs)" }}
                        value={c.gender}
                        onChange={(e) => updateParsedGender(idx, e.target.value as Gender)}
                      >
                        <option value="MALE">♂ Male</option>
                        <option value="FEMALE">♀ Female</option>
                      </select>
                    </td>
                    <td style={{ padding: "var(--space-sm) var(--space-md)", color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>
                      {c.school || c.inviterName || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Candidate Edit Modal ─────────────────────────────────────────────────────

function CandidateModal({
  candidate: initial, isNew, groups, rooms, candidates, connections,
  onSave, onDelete, onClose, onAddConnection, onDeleteConnection,
}: {
  candidate: Candidate;
  isNew: boolean;
  groups: { id: string; name: string }[];
  rooms: { id: string; name: string; gender: string }[];
  candidates: Candidate[];
  connections: Connection[];
  onSave: (c: Candidate) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onAddConnection: (conn: Connection) => void;
  onDeleteConnection: (id: string) => void;
}) {
  const [form, setForm] = useState<Candidate>(initial);
  const [tab, setTab] = useState<"details" | "connections" | "shepherd-notes" | "assignment" | "contacts">("details");

  // ── Connection add state ─────────────────────────────────────────────────────
  const [showAddConn, setShowAddConn] = useState(false);
  const [connSearch, setConnSearch] = useState("");
  const [connSelectedId, setConnSelectedId] = useState<string | null>(null);
  const [connRelType, setConnRelType] = useState<RelationshipType>("BARKADA");

  const myConnections = connections.filter(
    (c) => c.fromId === initial.id || c.toId === initial.id
  );

  const connectedIds = new Set(
    myConnections.map((c) => (c.fromId === initial.id ? c.toId : c.fromId))
  );

  const connSearchResults =
    connSearch.length >= 2
      ? candidates
          .filter(
            (c) =>
              c.id !== initial.id &&
              !connectedIds.has(c.id) &&
              c.fullName.toLowerCase().includes(connSearch.toLowerCase())
          )
          .slice(0, 8)
      : [];

  function handleAddConn() {
    if (!connSelectedId) return;
    const target = candidates.find((c) => c.id === connSelectedId);
    if (!target) return;
    onAddConnection({
      id: `manual-${Date.now()}`,
      fromId: initial.id,
      toId: connSelectedId,
      relationshipType: connRelType,
      source: "MANUAL",
      note: null,
      createdAt: new Date().toISOString(),
      fromName: initial.fullName,
      toName: target.fullName,
    });
    setConnSearch("");
    setConnSelectedId(null);
    setShowAddConn(false);
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  function set(field: keyof Candidate, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lastName = form.lastName.trim();
    const firstName = form.firstName.trim();
    onSave({ ...form, fullName: `${lastName}, ${firstName}`, updatedAt: new Date().toISOString() });
  }

  const genderRooms = rooms.filter((r) => r.gender === form.gender || r.gender === "MIXED");

  const tabLabels: Record<typeof tab, React.ReactNode> = {
    "details": "Details",
    "connections": (
      <>
        Connections
        {myConnections.length > 0 && (
          <span style={{
            marginLeft: 6, background: "var(--color-accent)", color: "#fff",
            borderRadius: 10, fontSize: "0.7em", padding: "1px 6px", fontWeight: 600,
          }}>
            {myConnections.length}
          </span>
        )}
      </>
    ),
    "shepherd-notes": "Shepherd notes",
    "assignment": "Assignment",
    "contacts": "Contacts",
  };

  return (
    <Modal open title={isNew ? "Add Candidate" : initial.fullName} onClose={onClose} size="lg"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          {!isNew && <button type="button" className="btn btn-danger" onClick={() => onDelete(form.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" />
            </svg>
            Delete
          </button>}
          <div style={{ display: "flex", gap: "var(--space-sm)", marginLeft: "auto" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" form="candidate-form" className="btn btn-primary">
              ✓ Save changes
            </button>
          </div>
        </div>
      }
    >
      <div className="tabs" style={{ marginBottom: "var(--space-lg)" }}>
        {(["details", "connections", "shepherd-notes", "assignment", "contacts"] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {tabLabels[t]}
          </button>
        ))}
      </div>
      <form id="candidate-form" onSubmit={handleSubmit}>
        {/* ── Details ─────────────────────────────────────────────────────── */}
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
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                Auto-matched against existing candidates to detect connections.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">How did they hear about YE?</label>
              <input className="input" value={form.howHeard ?? ""} onChange={(e) => set("howHeard", e.target.value || null)} placeholder="e.g. Instagram, friend, church bulletin" />
            </div>
            <div className="form-group">
              <label className="form-label">Food Allergies / Dietary Needs</label>
              <input className="input" value={form.allergies ?? ""} onChange={(e) => set("allergies", e.target.value || null)} placeholder="e.g. Nuts, shellfish (leave blank if none)" />
              {form.allergies && <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-warning)", marginTop: 2 }}>⚠ This will be flagged on the candidate card and in reports.</p>}
            </div>
          </div>
        )}

        {/* ── Connections ─────────────────────────────────────────────────── */}
        {tab === "connections" && (
          <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>
                {myConnections.length} known connection{myConnections.length !== 1 ? "s" : ""}.
                {" "}Manually add another to flag conflicts during grouping.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ whiteSpace: "nowrap", fontSize: "var(--font-size-sm)", padding: "6px 12px" }}
                onClick={() => setShowAddConn((v) => !v)}
              >
                + Add connection
              </button>
            </div>

            {/* Add connection panel */}
            {showAddConn && (
              <div style={{
                background: "var(--bg-hover)", borderRadius: "var(--radius-sm)",
                padding: "var(--space-md)", marginBottom: "var(--space-md)",
                display: "flex", flexDirection: "column", gap: "var(--space-sm)",
              }}>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    placeholder="Search candidate name…"
                    value={connSearch}
                    autoFocus
                    onChange={(e) => { setConnSearch(e.target.value); setConnSelectedId(null); }}
                  />
                  {connSearchResults.length > 0 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0,
                      background: "var(--bg-card)", border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-sm)", zIndex: 20,
                      maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}>
                      {connSearchResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => { setConnSelectedId(c.id); setConnSearch(c.fullName); }}
                          style={{
                            padding: "var(--space-sm) var(--space-md)", cursor: "pointer",
                            background: connSelectedId === c.id ? "var(--bg-hover)" : "transparent",
                            display: "flex", alignItems: "center", gap: "var(--space-sm)",
                          }}
                        >
                          <Initials name={c.fullName} gender={c.gender} size={28} />
                          <div>
                            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{c.fullName}</div>
                            {c.school && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{c.school}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  className="input"
                  value={connRelType}
                  onChange={(e) => setConnRelType(e.target.value as RelationshipType)}
                >
                  <option value="BARKADA">Barkada / Friends</option>
                  <option value="CLASSMATE">Classmate</option>
                  <option value="SIBLING">Sibling</option>
                  <option value="FAMILY">Family</option>
                  <option value="CHURCHMATE">Churchmate</option>
                  <option value="OTHER">Other</option>
                </select>
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: "var(--font-size-sm)", padding: "6px 14px" }}
                    disabled={!connSelectedId}
                    onClick={handleAddConn}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: "var(--font-size-sm)", padding: "6px 14px" }}
                    onClick={() => { setShowAddConn(false); setConnSearch(""); setConnSelectedId(null); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Connection list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              {myConnections.length === 0 && (
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", textAlign: "center", padding: "var(--space-xl) 0" }}>
                  No connections yet.
                </p>
              )}
              {myConnections.map((conn) => {
                const isFrom = conn.fromId === initial.id;
                const otherId = isFrom ? conn.toId : conn.fromId;
                const otherName = isFrom ? conn.toName : conn.fromName;
                const other = candidates.find((c) => c.id === otherId);
                return (
                  <div
                    key={conn.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "var(--space-sm)",
                      padding: "var(--space-sm) var(--space-md)",
                      background: "var(--bg-hover)", borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <Initials name={otherName ?? "?"} gender={other?.gender ?? "MALE"} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: "var(--font-size-sm)" }}>
                        {otherName ?? otherId}
                      </div>
                      {other?.school && (
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                          {other.school}
                        </div>
                      )}
                      {conn.source === "AUTO" && conn.note && (
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", fontStyle: "italic" }}>
                          {conn.note}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                      <Chip kind="default">{conn.relationshipType.toLowerCase()}</Chip>
                      <Chip kind={conn.source === "AUTO" ? "accent" : "default"}>
                        {conn.source.toLowerCase()}
                      </Chip>
                      {conn.source === "MANUAL" && (
                        <button
                          type="button"
                          title="Remove connection"
                          onClick={() => onDeleteConnection(conn.id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            padding: 4, color: "var(--text-muted)", display: "flex", alignItems: "center",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Shepherd notes ──────────────────────────────────────────────── */}
        {tab === "shepherd-notes" && (
          <div className="form-group">
            <label className="form-label">Shepherd Notes (internal)</label>
            <textarea
              className="input"
              value={form.shepherdNotes ?? ""}
              onChange={(e) => set("shepherdNotes", e.target.value || null)}
              placeholder="Internal notes visible only to shepherds…"
              rows={8}
              style={{ resize: "vertical" }}
            />
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: 4 }}>
              Notes are visible to shepherds only and will appear in reports.
            </p>
          </div>
        )}

        {/* ── Assignment ──────────────────────────────────────────────────── */}
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
                <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                  Only {form.gender === "MALE" ? "male" : "female"} and mixed rooms shown.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Contacts ────────────────────────────────────────────────────── */}
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
