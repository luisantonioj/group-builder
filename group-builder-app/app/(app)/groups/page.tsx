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
import { BoardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import SearchInput from "@/components/ui/search-input";
import { Chip } from "@/components/ui/chip";
import Modal from "@/components/ui/modal";
import SegmentedControl from "@/components/ui/segmented-control";
import EmptyState from "@/components/ui/empty-state";
import { CollapseIcon, EditIcon, GripIcon } from "@/components/ui/icons";
import {
  DraggableCandidate,
  DragOverlayCard,
  PresenceNote,
  PresenceToggle,
  UnconfirmedLegend,
  formatAge,
} from "@/components/candidates/candidate-card";
import {
  AssignmentCard,
  ConflictBanner,
  DropHint,
  PoolDropZone,
  buildConflictMap,
  type ConflictItem,
} from "@/components/candidates/assignment-board";
import { cn } from "@/lib/utils";
import type { Candidate, Group } from "@/types";

const GENDER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "MALE", label: "♂ Male" },
  { value: "FEMALE", label: "♀ Female" },
] as const;


export default function GroupsPage() {
  const { candidates, connections, groups, adjacency, groupConflicts, assignToGroup, updateCandidate, autoDistribute, clearAllGroups, addGroup, deleteGroup, updateGroup, lockGroup, reorderGroups, event, dataReady } = useApp();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editGroupData, setEditGroupData] = useState<Group | null>(null);
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

  // Per-group conflict items with names + relationship type
  const conflictsByGroup = useMemo(
    () => buildConflictMap(groupConflicts, connections, "groupId"),
    [groupConflicts, connections]
  );

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
        order: i,
        isLocked: false,
        eventId: event.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    setSetupOpen(false);
    showToast(`Created ${nameEntries.length} groups`, "success");
  }

  function handleEditGroup() {
    if (!editGroupData) return;
    updateGroup({
      ...editGroupData,
      updatedAt: new Date().toISOString(),
    });
    setEditGroupOpen(false);
    setEditGroupData(null);
    showToast("Group updated", "success");
  }

  function handleDeleteGroup() {
    if (!editGroupData) return;
    if (confirm(`Are you sure you want to delete ${editGroupData.name}?`)) {
      deleteGroup(editGroupData.id);
      setEditGroupOpen(false);
      setEditGroupData(null);
      showToast("Group deleted", "success");
    }
  }

  const totalAssigned = candidates.filter((c) => c.groupId).length;
  const totalConflicts = groupConflicts.length;


  if (!dataReady) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Group Formation</h1>
          </div>
        </div>
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Group Formation</h1>
            <PresenceNote
              present={candidates.filter((c) => c.groupId && c.isPresent).length}
              total={totalAssigned}
              extra="(hidden in locked groups)"
            />
          </div>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button className="btn btn-ghost" onClick={handleClearAll} disabled={totalAssigned === 0}>Clear All</button>
            <button className="btn btn-secondary" onClick={handleOpenSetup}>Configure Groups</button>
            <button className="btn btn-primary" onClick={handleAutoDistribute} disabled={groups.length === 0}>✨ Distribute Evenly</button>
          </div>
        </div>

        {/* Conflict banner */}
        <ConflictBanner count={totalConflicts} noun="group" />

        <div className="groups-layout">
          {/* Left: Candidate Pool */}
          <div className={cn("pool-sidebar", poolCollapsed && "collapsed")}>
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="card-head pool-head">
                <div>
                  <div className="pool-title">Candidate Pool</div>
                  <div className="pool-sub">{unassigned.length} unassigned</div>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => setPoolCollapsed(!poolCollapsed)}
                  aria-label={poolCollapsed ? "Expand pool" : "Collapse pool"}
                  aria-expanded={!poolCollapsed}
                  title={poolCollapsed ? "Expand pool" : "Collapse pool"}
                >
                  <CollapseIcon collapsed={poolCollapsed} />
                </button>
              </div>

              {!poolCollapsed && (
                <>
                  <div className="pool-controls">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search name or age…" />
                    <SegmentedControl
                      label="Filter pool by gender"
                      value={genderFilter}
                      onChange={setGenderFilter}
                      options={GENDER_OPTIONS}
                      fill
                    />
                  </div>
                  <PoolDropZone id="pool">
                    {unassigned.map((c) => {
                      const degree = adjacency.get(c.id)?.size ?? 0;
                      return (
                        <DraggableCandidate
                          key={c.id}
                          candidate={c}
                          meta={formatAge(c.age)}
                          trailing={
                            degree > 0 ? (
                              <Chip kind="warning" title={`${degree} connection${degree !== 1 ? "s" : ""}`}>{degree}</Chip>
                            ) : undefined
                          }
                        />
                      );
                    })}
                    {unassigned.length === 0 && (
                      <EmptyState
                        tone={candidates.some((c) => !c.groupId) ? "default" : "success"}
                        title={candidates.some((c) => !c.groupId) ? "No matches" : "All assigned 🎉"}
                      />
                    )}
                  </PoolDropZone>
                  <UnconfirmedLegend />
                </>
              )}
            </div>
          </div>

          {/* Right: Group Cards */}
          <div className="groups-grid-container">
            {groups.length === 0 ? (
              <EmptyState
                variant="card"
                title="No groups set up yet"
                description="Create groups, then drag candidates from the pool or distribute them evenly."
                action={<button className="btn btn-primary" onClick={handleOpenSetup}>Set Up Groups</button>}
              />
            ) : (
              <SortableContext items={groups.map((g) => g.id)} strategy={rectSortingStrategy}>
                <div className="assign-grid">
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
                        onTogglePresence={(cid, isPresent) => {
                          const cand = candidates.find((c) => c.id === cid);
                          if (cand) updateCandidate({ ...cand, isPresent });
                        }}
                        onEditClick={() => {
                          setEditGroupData(group);
                          setEditGroupOpen(true);
                        }}
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
          <DragOverlayCard candidate={activeDragCandidate} meta={formatAge(activeDragCandidate.age)} />
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
                style={{ justifyContent: "flex-start", textAlign: "left", color: "var(--color-danger)" }}
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

      <Modal open={editGroupOpen} title="Edit Group" onClose={() => { setEditGroupOpen(false); setEditGroupData(null); }}
        footer={
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
            <button className="btn btn-danger-outline" onClick={handleDeleteGroup}>Delete Group</button>
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <button className="btn btn-secondary" onClick={() => { setEditGroupOpen(false); setEditGroupData(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditGroup}>Save Changes</button>
            </div>
          </div>
        }
      >
        {editGroupData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <div className="form-group">
              <label className="form-label">Group Name *</label>
              <input className="input" value={editGroupData.name} onChange={(e) => setEditGroupData((p) => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Group 1" required />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Capacity</label>
                <input className="input" type="number" min={1} max={50} value={editGroupData.capacity} onChange={(e) => setEditGroupData((p) => p ? { ...p, capacity: Number(e.target.value) } : null)} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', marginTop: 'var(--space-xl)' }}>
                  <input type="checkbox" checked={editGroupData.isLocked} onChange={(e) => setEditGroupData((p) => p ? { ...p, isLocked: e.target.checked } : null)} />
                  <span className="form-label" style={{ margin: 0 }}>Locked</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DndContext>
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
        className="icon-btn icon-btn-grab"
        aria-label={`Reorder group ${index + 1}`}
      >
        <GripIcon />
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

function SortableGroupCard({ group, members, conflictItems, isFull, isOver, onTogglePresence, onEditClick }: {
  group: Group;
  members: Candidate[];
  conflictItems: ConflictItem[];
  isFull: boolean;
  isOver: boolean;
  onTogglePresence: (id: string, isPresent: boolean) => void;
  onEditClick: () => void;
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
    <AssignmentCard
      ref={setNodeRef}
      isOver={isOver}
      hasConflicts={hasConflicts}
      isDragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition: transition ?? undefined }}
      conflicts={conflictItems}
      header={
        <>
          <div className="assign-card-title-row">
            <button
              ref={setActivatorNodeRef}
              {...listeners}
              {...attributes}
              type="button"
              className="icon-btn icon-btn-grab"
              aria-label={`Reorder ${group.name}`}
              title="Drag to reorder"
            >
              <GripIcon size={12} />
            </button>
            <span className="assign-card-title">{group.name}</span>
            {hasConflicts && <Chip kind="danger">⚠ {conflictItems.length}</Chip>}
            {group.isLocked && <Chip kind="default" title="Locked">🔒</Chip>}
            {isFull && <Chip kind="success">Full</Chip>}
          </div>
          <div className="assign-card-actions">
            <span className="assign-card-count">{members.length}/{group.capacity}</span>
            <button onClick={onEditClick} className="icon-btn" aria-label={`Edit ${group.name}`} title="Edit group">
              <EditIcon />
            </button>
          </div>
        </>
      }
      subheader={
        members.length > 0 && (
          <div className="gender-split" aria-label={`${males} male, ${females} female`}>
            <div style={{ width: `${(males / members.length) * 100}%`, background: "var(--color-male)" }} />
            <div style={{ width: `${(females / members.length) * 100}%`, background: "var(--color-female)" }} />
          </div>
        )
      }
    >
      {members.length === 0 && <DropHint />}
      {members.map((m) => (
        <DraggableCandidate
          key={m.id}
          variant="member"
          candidate={m}
          meta={formatAge(m.age)}
          isConflict={conflictIds.has(m.id)}
          trailing={
            !group.isLocked && (
              <PresenceToggle
                name={m.fullName}
                checked={m.isPresent || false}
                onChange={(isPresent) => onTogglePresence(m.id, isPresent)}
              />
            )
          }
        />
      ))}
    </AssignmentCard>
  );
}
