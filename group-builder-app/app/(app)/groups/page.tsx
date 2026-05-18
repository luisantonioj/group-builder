"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useApp } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import SearchInput from "@/components/ui/search-input";
import { Chip, GenderChip } from "@/components/ui/chip";
import Initials from "@/components/ui/initials";
import Modal from "@/components/ui/modal";
import type { Candidate, Group } from "@/types";

export default function GroupsPage() {
  const { candidates, groups, adjacency, groupConflicts, assignToGroup, autoDistribute, clearAllGroups, addGroup, lockGroup, updateGroup } = useApp();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [newGroupCount, setNewGroupCount] = useState(4);
  const [newGroupPrefix, setNewGroupPrefix] = useState("Kordero");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const unassigned = useMemo(
    () =>
      candidates.filter((c) => {
        if (c.groupId) return false;
        if (genderFilter !== "ALL" && c.gender !== genderFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return c.fullName.toLowerCase().includes(q) || c.school?.toLowerCase().includes(q);
        }
        return true;
      }),
    [candidates, genderFilter, search]
  );

  const groupedCandidates = useMemo(() => {
    const map = new Map<string, Candidate[]>();
    for (const g of groups) {
      map.set(g.id, candidates.filter((c) => c.groupId === g.id));
    }
    return map;
  }, [groups, candidates]);

  const conflictPairsByGroup = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of groupConflicts) {
      if (!c.groupId) continue;
      if (!map.has(c.groupId)) map.set(c.groupId, new Set());
      map.get(c.groupId)!.add(c.candidateAId);
      map.get(c.groupId)!.add(c.candidateBId);
    }
    return map;
  }, [groupConflicts]);

  const activeDragCandidate = useMemo(
    () => candidates.find((c) => c.id === activeDragId),
    [candidates, activeDragId]
  );

  function onDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const overId = e.over?.id;
    if (overId && groups.find((g) => g.id === overId)) {
      setOverGroupId(String(overId));
    } else {
      setOverGroupId(null);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveDragId(null);
    setOverGroupId(null);
    if (!over) return;

    const candidateId = String(active.id);
    const targetId = String(over.id);

    // Dropping on a group card
    const targetGroup = groups.find((g) => g.id === targetId);
    if (targetGroup) {
      if (targetGroup.isLocked) {
        showToast(`${targetGroup.name} is locked. Unlock to add candidates.`, "warning");
        return;
      }
      const members = groupedCandidates.get(targetGroup.id) ?? [];
      if (members.length >= targetGroup.capacity) {
        showToast(`${targetGroup.name} is at full capacity (${targetGroup.capacity}).`, "warning");
        return;
      }
      assignToGroup(candidateId, targetId);

      // Check for instant conflict
      const cand = candidates.find((c) => c.id === candidateId);
      const hasConflict = members.some(
        (m) => adjacency.get(candidateId)?.has(m.id) || adjacency.get(m.id)?.has(candidateId)
      );
      if (hasConflict && cand) {
        showToast(`⚠ Conflict: ${cand.fullName} has a known connection in ${targetGroup.name}`, "warning");
      }
      return;
    }

    // Dropping back on the pool
    if (targetId === "pool") {
      assignToGroup(candidateId, null);
    }
  }

  function handleAutoDistribute() {
    autoDistribute();
    showToast("Candidates auto-distributed across groups.", "success");
  }

  function handleClearAll() {
    if (confirm("Remove all candidates from all groups?")) {
      clearAllGroups();
      showToast("All group assignments cleared.", "info");
    }
  }

  function handleSetupGroups() {
    for (let i = 1; i <= newGroupCount; i++) {
      addGroup({
        id: `g${Date.now()}-${i}`,
        name: `${newGroupPrefix} ${i}`,
        label: null,
        capacity: 12,
        isLocked: false,
        batchId: "batch-ye19",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setSetupOpen(false);
    showToast(`Created ${newGroupCount} groups`, "success");
  }

  const totalAssigned = candidates.filter((c) => c.groupId).length;
  const totalConflicts = groupConflicts.length;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Group Formation</h1>
            <p className="page-sub">{totalAssigned} assigned · {candidates.filter((c) => !c.groupId).length} in pool</p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button className="btn btn-secondary" onClick={handleClearAll}>Clear All</button>
            <button className="btn btn-secondary" onClick={handleAutoDistribute}>
              ✨ Distribute Evenly
            </button>
            <button className="btn btn-secondary" onClick={() => setSetupOpen(true)}>
              Configure Groups
            </button>
          </div>
        </div>

        {/* Status banner */}
        {totalConflicts > 0 && (
          <div style={{ background: "var(--color-conflict-bg)", border: "1px solid var(--color-conflict-border)", borderRadius: "var(--radius-md)", padding: "10px var(--space-lg)", marginBottom: "var(--space-lg)", display: "flex", alignItems: "center", gap: "var(--space-sm)", fontSize: "var(--font-size-sm)", color: "var(--color-conflict-text)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {totalConflicts} conflict{totalConflicts !== 1 ? "s" : ""} detected — connected candidates in the same group. Conflicts are non-blocking; shepherds can override.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "var(--space-xl)", alignItems: "start" }}>
          {/* Left: Candidate Pool */}
          <div className="card" style={{ position: "sticky", top: "calc(var(--topbar-height) + var(--space-lg))" }}>
            <div className="card-head">
              <div>
                <div style={{ fontWeight: "var(--font-weight-semibold)" }}>Candidate Pool</div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{unassigned.length} unassigned</div>
              </div>
            </div>
            <div style={{ padding: "var(--space-md)" }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Search…" />
              <div style={{ display: "flex", gap: 2, marginTop: "var(--space-sm)" }}>
                {(["ALL", "MALE", "FEMALE"] as const).map((v) => (
                  <button key={v} onClick={() => setGenderFilter(v)} className={`btn btn-sm ${genderFilter === v ? "btn-primary" : "btn-ghost"}`} style={{ flex: 1 }}>
                    {v === "ALL" ? "All" : v === "MALE" ? "♂" : "♀"}
                  </button>
                ))}
              </div>
            </div>
            <div id="pool" style={{ maxHeight: "60vh", overflowY: "auto", padding: "0 var(--space-md) var(--space-md)" }}>
              {unassigned.map((c) => (
                <DraggableCard key={c.id} candidate={c} adjacency={adjacency} />
              ))}
              {unassigned.length === 0 && (
                <div style={{ textAlign: "center", padding: "var(--space-xl) 0", color: "var(--text-muted)", fontSize: "var(--font-size-sm)" }}>
                  {candidates.filter((c) => !c.groupId).length === 0 ? "All candidates assigned! 🎉" : "No candidates match filter."}
                </div>
              )}
            </div>
          </div>

          {/* Right: Group Cards */}
          <div>
            {groups.length === 0 ? (
              <div className="card" style={{ padding: "var(--space-2xl)", textAlign: "center" }}>
                <div style={{ color: "var(--text-muted)", marginBottom: "var(--space-lg)" }}>No groups set up yet.</div>
                <button className="btn btn-primary" onClick={() => setSetupOpen(true)}>Set Up Groups</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-lg)" }}>
                {groups.map((group) => {
                  const members = groupedCandidates.get(group.id) ?? [];
                  const conflicts = conflictPairsByGroup.get(group.id) ?? new Set();
                  const isFull = members.length >= group.capacity;
                  const isOver = overGroupId === group.id;
                  return (
                    <GroupDropZone
                      key={group.id}
                      group={group}
                      members={members}
                      conflictIds={conflicts}
                      isFull={isFull}
                      isOver={isOver}
                      onRemove={(cid) => assignToGroup(cid, null)}
                      onLock={(locked) => lockGroup(group.id, locked)}
                      onRename={(name) => updateGroup({ ...group, name })}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDragCandidate && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", padding: "8px 12px", boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: "var(--space-sm)", fontSize: "var(--font-size-sm)", width: 220, opacity: 0.95 }}>
            <Initials name={activeDragCandidate.fullName} gender={activeDragCandidate.gender} size={28} />
            <span style={{ fontWeight: "var(--font-weight-semibold)" }}>{activeDragCandidate.fullName}</span>
          </div>
        )}
      </DragOverlay>

      {/* Setup modal */}
      <Modal open={setupOpen} title="Configure Groups" onClose={() => setSetupOpen(false)}
        footer={
          <><button className="btn btn-secondary" onClick={() => setSetupOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSetupGroups}>Create Groups</button></>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div className="form-group">
            <label className="form-label">Number of Groups</label>
            <input className="input" type="number" min={1} max={20} value={newGroupCount} onChange={(e) => setNewGroupCount(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Group Name Prefix</label>
            <input className="input" value={newGroupPrefix} onChange={(e) => setNewGroupPrefix(e.target.value)} placeholder="e.g. Kordero, Group, Team" />
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              Will create: {newGroupPrefix} 1, {newGroupPrefix} 2, …
            </span>
          </div>
        </div>
      </Modal>
    </DndContext>
  );
}

// ─── Draggable Candidate Card ─────────────────────────────────────────────────

import { useDraggable } from "@dnd-kit/core";

function DraggableCard({ candidate: c, adjacency }: { candidate: Candidate; adjacency: Map<string, Set<string>> }) {
  const degree = adjacency.get(c.id)?.size ?? 0;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: c.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        background: "var(--bg-page)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        padding: "8px 10px",
        marginBottom: "var(--space-xs)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        cursor: "grab",
        opacity: isDragging ? 0.4 : 1,
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        transition: isDragging ? undefined : "opacity 0.15s",
      }}
    >
      <Initials name={c.fullName} gender={c.gender} size={26} fontSize={10} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.fullName}</div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{c.school ?? "No school"}</div>
      </div>
      {degree > 0 && <Chip kind="warning">{degree}</Chip>}
    </div>
  );
}

// ─── Group Drop Zone ──────────────────────────────────────────────────────────

import { useDroppable } from "@dnd-kit/core";

function GroupDropZone({ group, members, conflictIds, isFull, isOver, onRemove, onLock, onRename }: {
  group: Group;
  members: Candidate[];
  conflictIds: Set<string>;
  isFull: boolean;
  isOver: boolean;
  onRemove: (id: string) => void;
  onLock: (locked: boolean) => void;
  onRename: (name: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: group.id });
  const hasConflicts = conflictIds.size > 0;
  const males = members.filter((m) => m.gender === "MALE").length;
  const females = members.filter((m) => m.gender === "FEMALE").length;

  return (
    <div
      ref={setNodeRef}
      className="drop-zone"
      style={{
        background: "var(--bg-card)",
        border: `2px solid ${hasConflicts ? "var(--color-conflict-border)" : isOver ? "var(--color-primary)" : "var(--border-color)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        transition: "border-color 0.15s",
        boxShadow: isOver ? "0 0 0 4px rgba(46,134,193,0.15)" : "var(--shadow-sm)",
      }}
    >
      {/* Group header */}
      <div style={{ padding: "12px var(--space-lg)", borderBottom: `1px solid var(--border-color)`, display: "flex", alignItems: "center", justifyContent: "space-between", background: hasConflicts ? "var(--color-conflict-bg)" : "var(--bg-hover)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <div style={{ width: 26, height: 26, borderRadius: "var(--radius-sm)", background: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)" }}>
            {group.name.charAt(group.name.length - 1)}
          </div>
          <span style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>{group.name}</span>
          {hasConflicts && <Chip kind="danger">⚠ {conflictIds.size / 2}</Chip>}
          {group.isLocked && <Chip kind="default">🔒</Chip>}
          {isFull && <Chip kind="success">Full</Chip>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{members.length}/{group.capacity}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onLock(!group.isLocked)}
            title={group.isLocked ? "Unlock" : "Lock"}
          >
            {group.isLocked ? "🔓" : "🔒"}
          </button>
        </div>
      </div>

      {/* Gender split bar */}
      {members.length > 0 && (
        <div style={{ height: 3, background: "var(--border-color)", display: "flex" }}>
          <div style={{ width: `${(males / members.length) * 100}%`, background: "var(--color-male)", transition: "width 0.3s" }} />
          <div style={{ width: `${(females / members.length) * 100}%`, background: "var(--color-female)", transition: "width 0.3s" }} />
        </div>
      )}

      {/* Members */}
      <div style={{ padding: "var(--space-sm)", minHeight: 60 }}>
        {members.length === 0 && (
          <div style={{ textAlign: "center", padding: "var(--space-lg) var(--space-sm)", color: "var(--text-muted)", fontSize: "var(--font-size-xs)", border: "1.5px dashed var(--border-color)", borderRadius: "var(--radius-md)", margin: "4px" }}>
            Drag candidates here
          </div>
        )}
        {members.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              padding: "5px 8px",
              borderRadius: "var(--radius-sm)",
              marginBottom: 2,
              background: conflictIds.has(m.id) ? "var(--color-conflict-bg)" : "var(--bg-page)",
              border: `1px solid ${conflictIds.has(m.id) ? "var(--color-conflict-border)" : "transparent"}`,
            }}
          >
            <Initials name={m.fullName} gender={m.gender} size={22} fontSize={9} />
            <span style={{ flex: 1, fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: conflictIds.has(m.id) ? "var(--color-conflict-text)" : "var(--text-primary)" }}>
              {m.fullName}
              {conflictIds.has(m.id) && " ⚠"}
            </span>
            {!group.isLocked && (
              <button
                onClick={() => onRemove(m.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, lineHeight: 1, display: "flex", alignItems: "center", borderRadius: "var(--radius-xs)" }}
                title="Remove from group"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
