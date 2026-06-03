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
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useApp } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { Chip, GenderChip } from "@/components/ui/chip";
import Initials from "@/components/ui/initials";
import Modal from "@/components/ui/modal";
import { cn, formatConnectionLabel } from "@/lib/utils";
import type { Candidate, Room, Gender, RoomGender } from "@/types";

type GenderTab = "MALE" | "FEMALE";

export default function RoomsPage() {
  const { candidates, connections, rooms, groups, adjacency, roomConflicts, assignToRoom, addRoom, event } = useApp();
  const { showToast } = useToast();

  const [genderTab, setGenderTab] = useState<GenderTab>("MALE");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overRoomId, setOverRoomId] = useState<string | null>(null);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [poolCollapsed, setPoolCollapsed] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", floor: "", capacity: 8, bedCount: 8, gender: "MALE" as RoomGender });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 15 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tabRooms = useMemo(
    () => rooms.filter((r) => r.gender === genderTab || r.gender === "MIXED"),
    [rooms, genderTab]
  );

  const unassigned = useMemo(
    () => candidates.filter((c) => !c.roomId && c.gender === genderTab),
    [candidates, genderTab]
  );

  const roomCandidates = useMemo(() => {
    const map = new Map<string, Candidate[]>();
    for (const r of rooms) {
      map.set(r.id, candidates.filter((c) => c.roomId === r.id));
    }
    return map;
  }, [rooms, candidates]);

  const connectionByPair = useMemo(() => {
    const map = new Map<string, string>();
    for (const conn of connections) {
      const [a, b] = [conn.fromId, conn.toId].sort();
      map.set(`${a}:${b}`, formatConnectionLabel(conn));
    }
    return map;
  }, [connections]);

  const conflictsByRoom = useMemo(() => {
    const map = new Map<string, { aId: string; bId: string; aName: string; bName: string; type: string }[]>();
    for (const c of roomConflicts) {
      if (!c.roomId) continue;
      const [a, b] = [c.candidateAId, c.candidateBId].sort();
      const type = connectionByPair.get(`${a}:${b}`) ?? "Connection";
      if (!map.has(c.roomId)) map.set(c.roomId, []);
      map.get(c.roomId)!.push({
        aId: c.candidateAId,
        bId: c.candidateBId,
        aName: c.candidateAName ?? c.candidateAId,
        bName: c.candidateBName ?? c.candidateBId,
        type,
      });
    }
    return map;
  }, [roomConflicts, connectionByPair]);

  const activeDragCandidate = useMemo(
    () => candidates.find((c) => c.id === activeDragId),
    [candidates, activeDragId]
  );

  const totalOccupied = rooms.reduce((sum, r) => sum + (roomCandidates.get(r.id)?.length ?? 0), 0);
  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);

  function onDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const overId = e.over?.id;
    if (overId && rooms.find((r) => r.id === overId)) {
      setOverRoomId(String(overId));
    } else {
      setOverRoomId(null);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveDragId(null);
    setOverRoomId(null);

    const candidateId = String(active.id);

    // Dropped outside all zones or on the pool → return to pool
    if (!over || over.id === "room-pool") {
      assignToRoom(candidateId, null);
      return;
    }

    const targetId = String(over.id);
    const targetRoom = rooms.find((r) => r.id === targetId);
    if (!targetRoom) return;

    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) return;

    // Already in this room — no-op
    if (cand.roomId === targetRoom.id) return;

    // Hard gender constraint
    if (targetRoom.gender !== "MIXED" && targetRoom.gender !== cand.gender) {
      showToast(`Gender mismatch — ${cand.fullName} cannot be assigned to ${targetRoom.name}.`, "error");
      return;
    }
    const members = roomCandidates.get(targetRoom.id) ?? [];
    if (members.length >= targetRoom.capacity) {
      showToast(`${targetRoom.name} is at full capacity (${targetRoom.capacity}).`, "warning");
      return;
    }
    assignToRoom(candidateId, targetId);
  }

  function handleAddRoom() {
    addRoom({
      id: `r${Date.now()}`,
      ...newRoom,
      building: null,
      eventId: event.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setAddRoomOpen(false);
    setNewRoom({ name: "", floor: "", capacity: 8, bedCount: 8, gender: "MALE" });
    showToast("Room added", "success");
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Room Assignment</h1>
            <p className="page-sub">{totalOccupied} / {totalCapacity} beds filled</p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button className="btn btn-secondary" onClick={() => setAddRoomOpen(true)}>+ Add Room</button>
          </div>
        </div>

        {/* Status bar */}
        <div className="stat-grid">
          <div className="stat-tile">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>Capacity Used</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-sm)", color: "var(--text-secondary)" }}>{totalOccupied}/{totalCapacity}</span>
            </div>
            <div style={{ height: 8, background: "var(--border-color)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0}%`, background: "var(--color-primary)", borderRadius: "var(--radius-full)", transition: "width 0.3s" }} />
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-value" style={{ color: roomConflicts.length > 0 ? "var(--color-danger)" : "var(--color-success)" }}>{roomConflicts.length}</div>
            <div className="stat-label">Room Conflicts</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value" style={{ color: "var(--color-primary)" }}>{candidates.filter((c) => !c.roomId).length}</div>
            <div className="stat-label">Unassigned</div>
          </div>
        </div>

        {/* Gender tabs */}
        <div className="tabs" style={{ marginBottom: "var(--space-xl)" }}>
          {(["MALE", "FEMALE"] as const).map((g) => (
            <button key={g} className={`tab ${genderTab === g ? "active" : ""}`} onClick={() => setGenderTab(g)}>
              {g === "MALE" ? "♂ Male Rooms" : "♀ Female Rooms"}
            </button>
          ))}
        </div>

        <div className="groups-layout">
          {/* Candidate Pool */}
          <div className={cn("pool-sidebar", poolCollapsed && "collapsed")}>
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="card-head" style={{ padding: "var(--space-md) var(--space-lg)" }}>
                <div>
                  <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>{genderTab === "MALE" ? "♂ Male" : "♀ Female"} Pool</div>
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
                <PoolDropZone id="room-pool" style={{ flex: 1, padding: "var(--space-sm)", overflowY: "auto" }}>
                  {unassigned.map((c) => (
                    <RoomDraggableCard key={c.id} candidate={c} groups={groups} />
                  ))}
                  {unassigned.length === 0 && (
                    <div style={{ textAlign: "center", padding: "var(--space-xl) 0", color: "var(--text-muted)", fontSize: "var(--font-size-sm)" }}>
                      All assigned 🎉
                    </div>
                  )}
                </PoolDropZone>
              )}
            </div>
          </div>

          {/* Room Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--space-lg)" }}>
            {tabRooms.map((room) => {
              const members = roomCandidates.get(room.id) ?? [];
              const conflictItems = conflictsByRoom.get(room.id) ?? [];
              return (
                <RoomDropZone
                  key={room.id}
                  room={room}
                  members={members}
                  conflictItems={conflictItems}
                  isOver={overRoomId === room.id}
                  groups={groups}
                  onRemove={(cid) => assignToRoom(cid, null)}
                />
              );
            })}
            {tabRooms.length === 0 && (
              <div className="card" style={{ padding: "var(--space-2xl)", textAlign: "center", color: "var(--text-muted)", gridColumn: "1/-1" }}>
                No {genderTab.toLowerCase()} rooms yet. Click &quot;Add Room&quot; to create one.
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDragCandidate && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", padding: "8px 12px", boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: "var(--space-sm)", fontSize: "var(--font-size-sm)", width: 220, opacity: 0.95 }}>
            <Initials name={activeDragCandidate.fullName} gender={activeDragCandidate.gender} size={28} />
            <span style={{ fontWeight: "var(--font-weight-semibold)" }}>{activeDragCandidate.fullName}</span>
          </div>
        )}
      </DragOverlay>

      <Modal open={addRoomOpen} title="Add Room" onClose={() => setAddRoomOpen(false)}
        footer={
          <><button className="btn btn-secondary" onClick={() => setAddRoomOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddRoom}>Add Room</button></>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div className="form-group">
            <label className="form-label">Room Name *</label>
            <input className="input" value={newRoom.name} onChange={(e) => setNewRoom((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Upper Room C" required />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Floor</label>
              <input className="input" value={newRoom.floor} onChange={(e) => setNewRoom((p) => ({ ...p, floor: e.target.value }))} placeholder="e.g. 2nd Floor" />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="input" value={newRoom.gender} onChange={(e) => setNewRoom((p) => ({ ...p, gender: e.target.value as RoomGender }))}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input className="input" type="number" min={1} max={30} value={newRoom.capacity} onChange={(e) => setNewRoom((p) => ({ ...p, capacity: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Bed Count</label>
              <input className="input" type="number" min={1} max={30} value={newRoom.bedCount} onChange={(e) => setNewRoom((p) => ({ ...p, bedCount: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
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

function RoomDraggableCard({ candidate: c, groups }: { candidate: Candidate; groups: { id: string; name: string }[] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });
  const groupName = groups.find((g) => g.id === c.groupId)?.name;
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
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.35 : 1,
        transition: "opacity 0.15s",
        touchAction: "none",
      }}
    >
      <Initials name={c.fullName} gender={c.gender} size={26} fontSize={10} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.fullName}</div>
        {groupName && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{groupName}</div>}
      </div>
    </div>
  );
}

// ─── Draggable Member (inside room) ──────────────────────────────────────────

function RoomDraggableMember({ candidate: m, isConflict, onRemove, groups }: {
  candidate: Candidate;
  isConflict: boolean;
  onRemove: () => void;
  groups: { id: string; name: string }[];
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: m.id });
  const groupName = groups.find((g) => g.id === m.groupId)?.name;
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
        border: `1px solid ${isConflict ? "var(--color-conflict-border)" : "transparent"}`,
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.35 : 1,
        transition: "opacity 0.15s",
        touchAction: "none",
      }}
    >
      <Initials name={m.fullName} gender={m.gender} size={22} fontSize={9} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: isConflict ? "var(--color-conflict-text)" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {m.fullName}{isConflict && " ⚠"}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {m.age ? `Age ${m.age}` : ""}{groupName ? ` · ${groupName}` : ""}
        </div>
      </div>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, display: "flex", alignItems: "center", flexShrink: 0 }}
        title="Return to pool"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ─── Room Drop Zone ───────────────────────────────────────────────────────────

interface RoomConflictItem {
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  type: string;
}

function RoomDropZone({ room, members, conflictItems, isOver, groups, onRemove }: {
  room: Room;
  members: Candidate[];
  conflictItems: RoomConflictItem[];
  isOver: boolean;
  groups: { id: string; name: string }[];
  onRemove: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: room.id });
  const conflictIds = new Set(conflictItems.flatMap((i) => [i.aId, i.bId]));
  const hasConflicts = conflictItems.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        background: "var(--bg-card)",
        border: `2px solid ${hasConflicts ? "var(--color-conflict-border)" : isOver ? "var(--color-primary)" : "var(--border-color)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: isOver ? "0 0 0 4px rgba(46,134,193,0.15)" : "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px var(--space-lg)", borderBottom: "1px solid var(--border-color)", background: hasConflicts ? "var(--color-conflict-bg)" : "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
          </svg>
          <span style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>{room.name}</span>
          <GenderChip gender={room.gender === "MIXED" ? "MALE" : room.gender as Gender} />
          {hasConflicts && <Chip kind="danger">⚠ {conflictItems.length}</Chip>}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{members.length}/{room.capacity}</span>
      </div>

      {room.floor && (
        <div style={{ padding: "4px var(--space-lg)", fontSize: "var(--font-size-xs)", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>
          {room.floor} · {room.bedCount} beds
        </div>
      )}

      {/* Members */}
      <div style={{ padding: "var(--space-sm)", minHeight: 64 }}>
        {members.length === 0 && (
          <div style={{ textAlign: "center", padding: "var(--space-lg) var(--space-sm)", color: "var(--text-muted)", fontSize: "var(--font-size-xs)", border: "1.5px dashed var(--border-color)", borderRadius: "var(--radius-md)", margin: 4 }}>
            Drag candidates here
          </div>
        )}
        {members.map((m) => (
          <RoomDraggableMember
            key={m.id}
            candidate={m}
            isConflict={conflictIds.has(m.id)}
            groups={groups}
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
