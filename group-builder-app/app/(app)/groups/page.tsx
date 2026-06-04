"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useApp } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import SearchInput from "@/components/ui/search-input";
import { Chip } from "@/components/ui/chip";
import Initials from "@/components/ui/initials";
import Modal from "@/components/ui/modal";
import { cn, formatConnectionLabel } from "@/lib/utils";
import type { Candidate, Group, Connection, Conflict } from "@/types";


export default function GroupsPage() {
  const { candidates, connections, groups, adjacency, groupConflicts, assignToGroup, autoDistribute, clearAllGroups, addGroup, deleteGroup, updateGroup, lockGroup, reorderGroups, event } = useApp();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [keepExisting, setKeepExisting] = useState<boolean | null>(null);
  const [activeDragIsGroup, setActiveDragIsGroup] = useState(false);
  const [groupCountInput, setGroupCountInput] = useState("4");
  const [poolCollapsed, setPoolCollapsed] = useState(false);
  const [nameEntries, setNameEntries] = useState<{ id: string; name: string }[]>(
    () => Array.from({ length: 4 }, (_, i) => ({ id: `ne-init-${i}`, name: "" }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 15 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const modalSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const unassigned = useMemo(
    () =>
      candidates.filter((c) => {
        if (c.groupId) return false;
        if (genderFilter !== "ALL" && c.gender !== genderFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return c.fullName.toLowerCase().includes(q) || (c.age !== null && String(c.age).includes(q));
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

  // Lookup: sorted "idA:idB" → relationship label
  const connectionByPair = useMemo(() => {
    const map = new Map<string, string>();
    for (const conn of connections) {
      const [a, b] = [conn.fromId, conn.toId].sort();
      map.set(`${a}:${b}`, formatConnectionLabel(conn));
    }
    return map;
  }, [connections]);

  // Per-group conflict items with names + relationship type
  const conflictsByGroup = useMemo(() => {
    const map = new Map<string, { aId: string; bId: string; aName: string; bName: string; type: string }[]>();
    for (const c of groupConflicts) {
      if (!c.groupId) continue;
      const [a, b] = [c.candidateAId, c.candidateBId].sort();
      const type = connectionByPair.get(`${a}:${b}`) ?? "Connection";
      if (!map.has(c.groupId)) map.set(c.groupId, []);
      map.get(c.groupId)!.push({
        aId: c.candidateAId,
        bId: c.candidateBId,
        aName: c.candidateAName ?? c.candidateAId,
        bName: c.candidateBName ?? c.candidateBId,
        type,
      });
    }
    return map;
  }, [groupConflicts, connectionByPair]);

  const activeDragCandidate = useMemo(
    () => candidates.find((c) => c.id === activeDragId),
    [candidates, activeDragId]
  );

  function onDragStart(e: DragStartEvent) {
    const isGroup = e.active.data.current?.type === "group";
    setActiveDragId(String(e.active.id));
    setActiveDragIsGroup(isGroup);
  }

  function onDragOver(e: DragOverEvent) {
    if (e.active.data.current?.type === "group") return;
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
    setActiveDragIsGroup(false);
    setOverGroupId(null);

    const dragType = active.data.current?.type as string | undefined;

    // ── Group reorder ──────────────────────────────────────────────────────────
    if (dragType === "group") {
      if (!over || active.id === over.id || over.id === "pool") return;
      const oldIdx = groups.findIndex((g) => g.id === active.id);
      const newIdx = groups.findIndex((g) => g.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;
      const reordered = arrayMove([...groups], oldIdx, newIdx);
      reorderGroups(reordered.map((g) => g.id));
      // Auto-renumber groups whose name ends in a number
      reordered.forEach((g, idx) => {
        const match = g.name.match(/^(.*?)\s+(\d+)$/);
        if (match) {
          const newName = `${match[1]} ${idx + 1}`;
          if (newName !== g.name) updateGroup({ ...g, name: newName });
        }
      });
      return;
    }

    // ── Candidate assignment ───────────────────────────────────────────────────
    const candidateId = String(active.id);

    if (!over || over.id === "pool") {
      assignToGroup(candidateId, null);
      return;
    }

    const targetId = String(over.id);
    const targetGroup = groups.find((g) => g.id === targetId);
    if (!targetGroup) return;

    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) return;

    if (cand.groupId === targetGroup.id) return;

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

  function handleOpenSetup() {
    setKeepExisting(groups.length === 0 ? true : null);
    const n = parseInt(groupCountInput, 10) || 4;
    setGroupCountInput(String(n));
    setNameEntries(Array.from({ length: n }, (_, i) => ({ id: `ne-${Date.now()}-${i}`, name: "" })));
    setSetupOpen(true);
  }

  function handleCountChange(raw: string) {
    setGroupCountInput(raw);
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 1 || n > 20) return; // let user type freely; only update entries for valid numbers
    setNameEntries((prev) => {
      if (n > prev.length) {
        return [
          ...prev,
          ...Array.from({ length: n - prev.length }, (_, i) => ({
            id: `ne-${Date.now()}-${prev.length + i}`,
            name: "",
          })),
        ];
      }
      return prev.slice(0, n);
    });
  }

  function handleSetupGroups() {
    if (keepExisting === false) {
      groups.forEach((g) => deleteGroup(g.id));
    }
    const now = Date.now();
    nameEntries.forEach((entry, i) => {
      addGroup({
        id: `g${now}-${i}`,
        name: entry.name.trim() || `Group ${i + 1}`,
        label: null,
        capacity: 12,
        isLocked: false,
        eventId: event.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    setSetupOpen(false);
    showToast(`Created ${nameEntries.length} groups`, "success");
  }

  const totalAssigned = candidates.filter((c) => c.groupId).length;
  const totalConflicts = groupConflicts.length;

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Group Formation</h1>
            <p className="page-sub">{totalAssigned} assigned · {candidates.filter((c) => !c.groupId).length} in pool</p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button className="btn btn-secondary" onClick={handleClearAll}>Clear All</button>
            <button className="btn btn-secondary" onClick={handleAutoDistribute}>✨ Distribute Evenly</button>
            <button className="btn btn-secondary" onClick={handleOpenSetup}>Configure Groups</button>
          </div>
        </div>

        {/* Conflict banner */}
        {totalConflicts > 0 && (
          <div style={{ background: "var(--color-conflict-bg)", border: "1px solid var(--color-conflict-border)", borderRadius: "var(--radius-md)", padding: "10px var(--space-lg)", marginBottom: "var(--space-lg)", display: "flex", alignItems: "center", gap: "var(--space-sm)", fontSize: "var(--font-size-sm)", color: "var(--color-conflict-text)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {totalConflicts} conflict{totalConflicts !== 1 ? "s" : ""} detected — connected candidates in the same group.
          </div>
        )}

        <div className="groups-layout">
          {/* Left: Candidate Pool */}
          <div className={cn("pool-sidebar", poolCollapsed && "collapsed")}>
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="card-head" style={{ padding: "var(--space-md) var(--space-lg)" }}>
                <div>
                  <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>Candidate Pool</div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{unassigned.length} unassigned</div>
                </div>
                <button 
                  className="pool-toggle-btn"
                  onClick={() => setPoolCollapsed(!poolCollapsed)}
                  title={poolCollapsed ? "Expand pool" : "Collapse pool"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {poolCollapsed ? <polyline points="13 17 18 12 13 7" /> : <polyline points="11 17 6 12 11 7" />}
                    {poolCollapsed ? <polyline points="6 17 11 12 6 7" /> : <polyline points="18 17 13 12 18 7" />}
                  </svg>
                </button>
              </div>
              
              {!poolCollapsed && (
                <>
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
                  <PoolDropZone id="pool" style={{ flex: 1, overflowY: "auto", padding: "0 var(--space-md) var(--space-md)" }}>
                    {unassigned.map((c) => (
                      <DraggableCard key={c.id} candidate={c} adjacency={adjacency} />
                    ))}
                    {unassigned.length === 0 && (
                      <div style={{ textAlign: "center", padding: "var(--space-xl) 0", color: "var(--text-muted)", fontSize: "var(--font-size-sm)" }}>
                        {candidates.filter((c) => !c.groupId).length === 0 ? "All assigned! 🎉" : "No matches."}
                      </div>
                    )}
                  </PoolDropZone>
                </>
              )}
            </div>
          </div>

          {/* Right: Group Cards */}
          <div className="groups-grid-container">
            {groups.length === 0 ? (
              <div className="card" style={{ padding: "var(--space-2xl)", textAlign: "center" }}>
                <div style={{ color: "var(--text-muted)", marginBottom: "var(--space-lg)" }}>No groups set up yet.</div>
                <button className="btn btn-primary" onClick={handleOpenSetup}>Set Up Groups</button>
              </div>
            ) : (
              <SortableContext items={groups.map((g) => g.id)} strategy={rectSortingStrategy}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-lg)" }}>
                  {groups.map((group) => {
                    const members = groupedCandidates.get(group.id) ?? [];
                    const conflictItems = conflictsByGroup.get(group.id) ?? [];
                    const isFull = members.length >= group.capacity;
                    const isOver = overGroupId === group.id;
                    return (
                      <SortableGroupCard
                        key={group.id}
                        group={group}
                        members={members}
                        conflictItems={conflictItems}
                        isFull={isFull}
                        isOver={isOver}
                        onRemove={(cid) => assignToGroup(cid, null)}
                        onLock={(locked) => lockGroup(group.id, locked)}
                        onRename={(name) => updateGroup({ ...group, name })}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDragIsGroup && activeDragId && (() => {
          const g = groups.find((gr) => gr.id === activeDragId);
          if (!g) return null;
          return (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-lg)", padding: "10px var(--space-lg)", boxShadow: "var(--shadow-lg)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", opacity: 0.9, cursor: "grabbing" }}>
              {g.name}
            </div>
          );
        })()}
        {!activeDragIsGroup && activeDragCandidate && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", padding: "8px 12px", boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: "var(--space-sm)", fontSize: "var(--font-size-sm)", width: 220, opacity: 0.95 }}>
            <Initials name={activeDragCandidate.fullName} gender={activeDragCandidate.gender} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: "var(--font-weight-semibold)" }}>{activeDragCandidate.fullName}</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                {activeDragCandidate.age !== null ? `Age: ${activeDragCandidate.age}` : "Age unknown"}
              </div>
            </div>
          </div>
        )}
      </DragOverlay>

      <Modal
        open={setupOpen}
        title="Configure Groups"
        onClose={() => setSetupOpen(false)}
        footer={
          keepExisting === null ? (
            <button className="btn btn-secondary" onClick={() => setSetupOpen(false)}>Cancel</button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setSetupOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSetupGroups}>Create Groups</button>
            </>
          )
        }
      >
        {keepExisting === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", margin: 0 }}>
              You already have <strong>{groups.length}</strong> group{groups.length !== 1 ? "s" : ""}. What would you like to do?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: "flex-start", textAlign: "left" }}
                onClick={() => setKeepExisting(true)}
              >
                Keep existing groups and add new ones
              </button>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: "flex-start", textAlign: "left", color: "var(--color-danger, #e74c3c)" }}
                onClick={() => setKeepExisting(false)}
              >
                Delete all existing groups and start fresh
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            {keepExisting === false && (
              <div style={{ background: "var(--color-conflict-bg)", border: "1px solid var(--color-conflict-border)", borderRadius: "var(--radius-md)", padding: "8px var(--space-md)", fontSize: "var(--font-size-xs)", color: "var(--color-conflict-text)" }}>
                All {groups.length} existing groups will be deleted.
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Number of Groups</label>
              <input
                className="input"
                type="number"
                min={1}
                max={20}
                value={groupCountInput}
                onChange={(e) => handleCountChange(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Group Names</label>
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", margin: "0 0 var(--space-sm)" }}>
                Each group has a unique name. Drag ⠿ to reorder sequence.
              </p>
              <DndContext
                sensors={modalSensors}
                collisionDetection={pointerWithin}
                onDragEnd={(e) => {
                  const { active, over } = e;
                  if (!over || active.id === over.id) return;
                  const oldIdx = nameEntries.findIndex((n) => n.id === active.id);
                  const newIdx = nameEntries.findIndex((n) => n.id === over.id);
                  if (oldIdx !== -1 && newIdx !== -1) {
                    setNameEntries((prev) => arrayMove(prev, oldIdx, newIdx));
                  }
                }}
              >
                <SortableContext items={nameEntries.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                  {nameEntries.map((entry, i) => (
                    <SortableNameInput
                      key={entry.id}
                      id={entry.id}
                      value={entry.name}
                      index={i}
                      onChange={(v) =>
                        setNameEntries((prev) => prev.map((n) => (n.id === entry.id ? { ...n, name: v } : n)))
                      }
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}
      </Modal>
    </DndContext>
  );
}

// ─── Pool Drop Zone ───────────────────────────────────────────────────────────

function PoolDropZone({ id, children, style }: { id: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderRadius: "var(--radius-md)",
        transition: "background 0.15s",
        background: isOver ? "var(--bg-selected, rgba(46,134,193,0.08))" : undefined,
      }}
    >
      {children}
    </div>
  );
}

// ─── Draggable Card (pool) ────────────────────────────────────────────────────

function DraggableCard({ candidate: c, adjacency }: { candidate: Candidate; adjacency: Map<string, Set<string>> }) {
  const degree = adjacency.get(c.id)?.size ?? 0;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        background: "var(--bg-page)",
        border: `1px solid ${c.isConfirmed ? "var(--border-color)" : "#000"}`,
        borderRadius: "var(--radius-md)",
        padding: "8px 10px",
        marginBottom: "var(--space-xs)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.35 : 1,
        transition: "opacity 0.15s",
        touchAction: "none",
        boxShadow: c.isConfirmed ? "none" : "0 0 0 1px #000",
      }}
    >
      <Initials name={c.fullName} gender={c.gender} size={26} fontSize={10} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.fullName}</div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{c.age !== null ? `Age: ${c.age}` : "Age unknown"}</div>
      </div>
      {degree > 0 && <Chip kind="warning">{degree}</Chip>}
    </div>
  );
}

// ─── Draggable Member (inside group) ─────────────────────────────────────────

function DraggableMember({ candidate: m, isConflict, isLocked, onRemove }: {
  candidate: Candidate;
  isConflict: boolean;
  isLocked: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: m.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        padding: "5px 8px",
        borderRadius: "var(--radius-sm)",
        marginBottom: 2,
        background: isConflict ? "var(--color-conflict-bg)" : "var(--bg-page)",
        border: `1px solid ${isConflict ? "var(--color-conflict-border)" : m.isConfirmed ? "transparent" : "#000"}`,
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.35 : 1,
        transition: "opacity 0.15s",
        touchAction: "none",
        boxShadow: !isConflict && !m.isConfirmed ? "0 0 0 1px #000" : "none",
      }}
    >
      <Initials name={m.fullName} gender={m.gender} size={22} fontSize={9} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: isConflict ? "var(--color-conflict-text)" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {m.fullName}{isConflict && " ⚠"}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {m.age ? `Age ${m.age}` : "Age unknown"}
        </div>
      </div>
      {!isLocked && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, lineHeight: 1, display: "flex", alignItems: "center", borderRadius: "var(--radius-xs)", flexShrink: 0 }}
          title="Return to pool"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Sortable Name Input (Configure Groups modal) ────────────────────────────

function SortableNameInput({ id, value, index, onChange }: {
  id: string;
  value: string;
  index: number;
  onChange: (v: string) => void;
}) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-sm)",
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        type="button"
        style={{ background: "none", border: "none", cursor: "grab", color: "var(--text-muted)", padding: "2px 4px", display: "flex", alignItems: "center", flexShrink: 0, touchAction: "none" }}
      >
        <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
          <circle cx="3" cy="2" r="1.2"/><circle cx="9" cy="2" r="1.2"/>
          <circle cx="3" cy="7" r="1.2"/><circle cx="9" cy="7" r="1.2"/>
          <circle cx="3" cy="12" r="1.2"/><circle cx="9" cy="12" r="1.2"/>
        </svg>
      </button>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", minWidth: 20, textAlign: "right", flexShrink: 0 }}>{index + 1}.</span>
      <input
        className="input"
        style={{ flex: 1 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Group ${index + 1}`}
      />
    </div>
  );
}

// ─── Sortable Group Card ──────────────────────────────────────────────────────

interface ConflictItem {
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  type: string;
}

function SortableGroupCard({ group, members, conflictItems, isFull, isOver, onRemove, onLock, onRename }: {
  group: Group;
  members: Candidate[];
  conflictItems: ConflictItem[];
  isFull: boolean;
  isOver: boolean;
  onRemove: (id: string) => void;
  onLock: (locked: boolean) => void;
  onRename: (name: string) => void;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id, data: { type: "group" } });

  const conflictIds = new Set(conflictItems.flatMap((i) => [i.aId, i.bId]));
  const hasConflicts = conflictItems.length > 0;
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
        transition: `border-color 0.15s, box-shadow 0.15s, ${transition ?? ""}`,
        boxShadow: isOver ? "0 0 0 4px rgba(46,134,193,0.15)" : "var(--shadow-sm)",
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px var(--space-lg)", borderBottom: `1px solid var(--border-color)`, display: "flex", alignItems: "center", justifyContent: "space-between", background: hasConflicts ? "var(--color-conflict-bg)" : "var(--bg-hover)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <button
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            type="button"
            title="Drag to reorder"
            style={{ background: "none", border: "none", cursor: "grab", color: "var(--text-muted)", padding: "2px 4px", display: "flex", alignItems: "center", flexShrink: 0, touchAction: "none" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
            </svg>
          </button>
          <span style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>{group.name}</span>
          {hasConflicts && <Chip kind="danger">⚠ {conflictItems.length}</Chip>}
          {group.isLocked && <Chip kind="default">🔒</Chip>}
          {isFull && <Chip kind="success">Full</Chip>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{members.length}/{group.capacity}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onLock(!group.isLocked)} title={group.isLocked ? "Unlock" : "Lock"}>
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
      <div style={{ padding: "var(--space-sm)", minHeight: 64 }}>
        {members.length === 0 && (
          <div style={{ textAlign: "center", padding: "var(--space-lg) var(--space-sm)", color: "var(--text-muted)", fontSize: "var(--font-size-xs)", border: "1.5px dashed var(--border-color)", borderRadius: "var(--radius-md)", margin: "4px" }}>
            Drag candidates here
          </div>
        )}
        {members.map((m) => (
          <DraggableMember
            key={m.id}
            candidate={m}
            isConflict={conflictIds.has(m.id)}
            isLocked={group.isLocked}
            onRemove={() => onRemove(m.id)}
          />
        ))}
      </div>

      {/* Conflict list */}
      {hasConflicts && (
        <div style={{ borderTop: "1px solid var(--color-conflict-border)", background: "var(--color-conflict-bg)", padding: "var(--space-xs) var(--space-sm)" }}>
          {conflictItems.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "3px 4px",
                padding: "3px 2px",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-conflict-text)",
                lineHeight: 1.4,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontWeight: "var(--font-weight-semibold)" }}>{item.aName}</span>
              <span style={{ opacity: 0.65 }}>and</span>
              <span style={{ fontWeight: "var(--font-weight-semibold)" }}>{item.bName}</span>
              <span style={{ opacity: 0.5, margin: "0 1px" }}>●</span>
              <span style={{ opacity: 0.75 }}>{item.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
