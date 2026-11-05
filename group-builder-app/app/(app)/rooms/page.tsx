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
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useApp } from "@/lib/store";
import { BoardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Chip, GenderChip } from "@/components/ui/chip";
import Modal from "@/components/ui/modal";
import SearchInput from "@/components/ui/search-input";
import EmptyState from "@/components/ui/empty-state";
import { BedIcon, CollapseIcon, EditIcon } from "@/components/ui/icons";
import {
  DraggableCandidate,
  DragOverlayCard,
  PresenceToggle,
  UnconfirmedLegend,
  formatAge,
} from "@/components/candidates/candidate-card";
import {
  AssignmentCard,
  DropHint,
  PoolDropZone,
  buildConflictMap,
  type ConflictItem,
} from "@/components/candidates/assignment-board";
import { cn } from "@/lib/utils";
import type { Candidate, Room, RoomGender } from "@/types";

function roomMeta(c: Candidate, groups: { id: string; name: string }[]) {
  const groupName = groups.find((g) => g.id === c.groupId)?.name;
  return groupName ? `${formatAge(c.age)} · ${groupName}` : formatAge(c.age);
}

type GenderTab = "MALE" | "FEMALE";

export default function RoomsPage() {
  const { candidates, connections, rooms, groups, adjacency, roomConflicts, assignToRoom, addRoom, updateRoom, deleteRoom, event, updateCandidate, dataReady } = useApp();
  const { showToast } = useToast();

  const [genderTab, setGenderTab] = useState<GenderTab>("MALE");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overRoomId, setOverRoomId] = useState<string | null>(null);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [editRoomData, setEditRoomData] = useState<Room | null>(null);
  const [poolCollapsed, setPoolCollapsed] = useState(false);
  const [search, setSearch] = useState("");
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

  const poolForTab = useMemo(
    () => candidates.filter((c) => !c.roomId && c.gender === genderTab),
    [candidates, genderTab]
  );

  const unassigned = useMemo(() => {
    if (!search) return poolForTab;
    const q = search.toLowerCase();
    return poolForTab.filter(
      (c) => c.fullName.toLowerCase().includes(q) || (c.age !== null && String(c.age).includes(q))
    );
  }, [poolForTab, search]);

  const roomCandidates = useMemo(() => {
    const map = new Map<string, Candidate[]>();
    for (const r of rooms) {
      map.set(r.id, candidates.filter((c) => c.roomId === r.id));
    }
    return map;
  }, [rooms, candidates]);

  const conflictsByRoom = useMemo(
    () => buildConflictMap(roomConflicts, connections, "roomId"),
    [roomConflicts, connections]
  );

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

  function handleEditRoom() {
    if (!editRoomData) return;
    updateRoom({
      ...editRoomData,
      updatedAt: new Date().toISOString(),
    });
    setEditRoomOpen(false);
    setEditRoomData(null);
    showToast("Room updated", "success");
  }

  function handleDeleteRoom() {
    if (!editRoomData) return;
    if (confirm(`Are you sure you want to delete ${editRoomData.name}?`)) {
      deleteRoom(editRoomData.id);
      setEditRoomOpen(false);
      setEditRoomData(null);
      showToast("Room deleted", "success");
    }
  }


  if (!dataReady) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Room Assignment</h1>
          </div>
        </div>
        <BoardSkeleton cards={4} />
      </div>
    );
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
            <button className="btn btn-primary" onClick={() => setAddRoomOpen(true)}>+ Add Room</button>
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
            <button key={g} className={`tab ${genderTab === g ? "active" : ""}`} aria-pressed={genderTab === g} onClick={() => setGenderTab(g)}>
              {g === "MALE" ? "♂ Male Rooms" : "♀ Female Rooms"}
            </button>
          ))}
        </div>

        <div className="groups-layout">
          {/* Candidate Pool */}
          <div className={cn("pool-sidebar", poolCollapsed && "collapsed")}>
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="card-head pool-head">
                <div>
                  <div className="pool-title">{genderTab === "MALE" ? "♂ Male" : "♀ Female"} Pool</div>
                  <div className="pool-sub">{poolForTab.length} unassigned</div>
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
                  </div>
                  <PoolDropZone id="room-pool">
                    {unassigned.map((c) => (
                      <DraggableCandidate key={c.id} candidate={c} meta={roomMeta(c, groups)} />
                    ))}
                    {unassigned.length === 0 && (
                      <EmptyState
                        tone={poolForTab.length === 0 ? "success" : "default"}
                        title={poolForTab.length === 0 ? "All assigned 🎉" : "No matches"}
                      />
                    )}
                  </PoolDropZone>
                  <UnconfirmedLegend />
                </>
              )}
            </div>
          </div>

          {/* Room Cards */}
          <div className="assign-grid">
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
                  onTogglePresence={(cid, isPresent) => {
                    const cand = candidates.find((c) => c.id === cid);
                    if (cand) updateCandidate({ ...cand, isPresent });
                  }}
                  onEditClick={() => {
                    setEditRoomData(room);
                    setEditRoomOpen(true);
                  }}
                />
              );
            })}
            {tabRooms.length === 0 && (
              <EmptyState
                variant="card"
                style={{ gridColumn: "1/-1" }}
                title={`No ${genderTab.toLowerCase()} rooms yet`}
                description="Add a room, then drag candidates from the pool into it."
                action={<button className="btn btn-primary" onClick={() => setAddRoomOpen(true)}>+ Add Room</button>}
              />
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDragCandidate && (
          <DragOverlayCard candidate={activeDragCandidate} meta={roomMeta(activeDragCandidate, groups)} />
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

      <Modal open={editRoomOpen} title="Edit Room" onClose={() => { setEditRoomOpen(false); setEditRoomData(null); }}
        footer={
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
            <button className="btn btn-danger-outline" onClick={handleDeleteRoom}>Delete Room</button>
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <button className="btn btn-secondary" onClick={() => { setEditRoomOpen(false); setEditRoomData(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditRoom}>Save Changes</button>
            </div>
          </div>
        }
      >
        {editRoomData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <div className="form-group">
              <label className="form-label">Room Name *</label>
              <input className="input" value={editRoomData.name} onChange={(e) => setEditRoomData((p) => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Upper Room C" required />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Floor</label>
                <input className="input" value={editRoomData.floor ?? ""} onChange={(e) => setEditRoomData((p) => p ? { ...p, floor: e.target.value } : null)} placeholder="e.g. 2nd Floor" />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="input" value={editRoomData.gender} onChange={(e) => setEditRoomData((p) => p ? { ...p, gender: e.target.value as RoomGender } : null)}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="MIXED">Mixed</option>
                </select>
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Capacity</label>
                <input className="input" type="number" min={1} max={30} value={editRoomData.capacity} onChange={(e) => setEditRoomData((p) => p ? { ...p, capacity: Number(e.target.value) } : null)} />
              </div>
              <div className="form-group">
                <label className="form-label">Bed Count</label>
                <input className="input" type="number" min={1} max={30} value={editRoomData.bedCount} onChange={(e) => setEditRoomData((p) => p ? { ...p, bedCount: Number(e.target.value) } : null)} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DndContext>
  );
}

// ─── Room Drop Zone ───────────────────────────────────────────────────────────

function RoomDropZone({ room, members, conflictItems, isOver, groups, onTogglePresence, onEditClick }: {
  room: Room;
  members: Candidate[];
  conflictItems: ConflictItem[];
  isOver: boolean;
  groups: { id: string; name: string }[];
  onTogglePresence: (id: string, isPresent: boolean) => void;
  onEditClick: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: room.id });
  const conflictIds = new Set(conflictItems.flatMap((i) => [i.aId, i.bId]));
  const hasConflicts = conflictItems.length > 0;
  const isFull = members.length >= room.capacity;

  return (
    <AssignmentCard
      ref={setNodeRef}
      isOver={isOver}
      hasConflicts={hasConflicts}
      conflicts={conflictItems}
      header={
        <>
          <div className="assign-card-title-row">
            <BedIcon style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span className="assign-card-title">{room.name}</span>
            <GenderChip gender={room.gender} />
            {hasConflicts && <Chip kind="danger">⚠ {conflictItems.length}</Chip>}
            {isFull && <Chip kind="success">Full</Chip>}
          </div>
          <div className="assign-card-actions">
            <span className="assign-card-count">{members.length}/{room.capacity}</span>
            <button onClick={onEditClick} className="icon-btn" aria-label={`Edit ${room.name}`} title="Edit room">
              <EditIcon />
            </button>
          </div>
        </>
      }
      subheader={
        room.floor && (
          <div className="assign-card-sub">
            {room.floor} · {room.bedCount} beds
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
          meta={roomMeta(m, groups)}
          isConflict={conflictIds.has(m.id)}
          trailing={
            <PresenceToggle
              name={m.fullName}
              checked={m.isPresent || false}
              onChange={(isPresent) => onTogglePresence(m.id, isPresent)}
            />
          }
        />
      ))}
    </AssignmentCard>
  );
}
