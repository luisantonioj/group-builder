"use client";

// Client-side state store for the Grouping System.
// Initialises with the event passed from the server layout (or mock data in dev).
// All mutations call the real API when available and update local state optimistically.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { getMockInitialState } from "./mock-data";
import {
  buildAdjacencyMap,
  detectGroupConflicts,
  detectRoomConflicts,
  autoDistribute as autoDistributeImpl,
  deriveAutoConnections,
} from "./conflict-detection";
import type { Candidate, Connection, Group, Room, Activity, Event, Conflict } from "@/types";
import { broadcastSyncQueueChanged, db, flushSyncQueue, type SyncQueueItem } from "./dexie";

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  event: Event;
  candidates: Candidate[];
  connections: Connection[];
  groups: Group[];
  rooms: Room[];
  activities: Activity[];
}

type Action =
  | { type: "SET_EVENT"; payload: Event }
  | { type: "SET_APP_DATA"; payload: Partial<AppState> }
  | { type: "SET_CANDIDATES"; payload: Candidate[] }
  | { type: "SET_GROUPS"; payload: Group[] }
  | { type: "SET_ROOMS"; payload: Room[] }
  | { type: "SET_CONNECTIONS"; payload: Connection[] }
  | { type: "ADD_CANDIDATE"; payload: Candidate }
  | { type: "UPDATE_CANDIDATE"; payload: Candidate }
  | { type: "DELETE_CANDIDATE"; payload: string }
  | { type: "DELETE_CANDIDATES"; payload: string[] }
  | { type: "ADD_CONNECTION"; payload: Connection }
  | { type: "UPDATE_CONNECTION"; payload: Connection }
  | { type: "CONFIRM_CONNECTION"; payload: string }
  | { type: "DELETE_CONNECTION"; payload: string }
  | { type: "ADD_GROUP"; payload: Group }
  | { type: "UPDATE_GROUP"; payload: Group }
  | { type: "DELETE_GROUP"; payload: string }
  | { type: "ASSIGN_TO_GROUP"; payload: { candidateId: string; groupId: string | null } }
  | { type: "ADD_ROOM"; payload: Room }
  | { type: "UPDATE_ROOM"; payload: Room }
  | { type: "DELETE_ROOM"; payload: string }
  | { type: "ASSIGN_TO_ROOM"; payload: { candidateId: string; roomId: string | null } }
  | { type: "ADD_ACTIVITY"; payload: Activity }
  | { type: "LOCK_GROUP"; payload: { groupId: string; locked: boolean } }
  | { type: "REORDER_GROUPS"; payload: string[] };

const EMPTY_EVENT: Event = {
  id: "",
  name: "No event",
  isActive: false,
  featureVisualizer: false,
  featureRoomAssignment: false,
  createdAt: "",
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_EVENT":
      return {
        ...state,
        event: action.payload,
        candidates: [],
        connections: [],
        groups: [],
        rooms: [],
        activities: [],
      };
    case "SET_APP_DATA":
      return { ...state, ...action.payload };
    case "SET_CANDIDATES":
      return { ...state, candidates: action.payload };
    case "SET_GROUPS":
      return { ...state, groups: action.payload };
    case "SET_ROOMS":
      return { ...state, rooms: action.payload };
    case "SET_CONNECTIONS":
      return { ...state, connections: action.payload };
    case "ADD_CANDIDATE":
      return { ...state, candidates: [action.payload, ...state.candidates] };
    case "UPDATE_CANDIDATE":
      return {
        ...state,
        candidates: state.candidates.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case "DELETE_CANDIDATE":
      return {
        ...state,
        candidates: state.candidates.filter((c) => c.id !== action.payload),
        connections: state.connections.filter(
          (conn) => conn.fromId !== action.payload && conn.toId !== action.payload
        ),
      };
    case "DELETE_CANDIDATES":
      return {
        ...state,
        candidates: state.candidates.filter((c) => !action.payload.includes(c.id)),
        connections: state.connections.filter(
          (conn) => !action.payload.includes(conn.fromId) && !action.payload.includes(conn.toId)
        ),
      };
    case "ADD_CONNECTION":
      return { ...state, connections: [...state.connections, action.payload] };
    case "UPDATE_CONNECTION":
      return {
        ...state,
        connections: state.connections.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case "CONFIRM_CONNECTION":
      return {
        ...state,
        connections: state.connections.map((c) =>
          c.id === action.payload ? { ...c, confirmed: true } : c
        ),
      };
    case "DELETE_CONNECTION":
      return {
        ...state,
        connections: state.connections.filter((c) => c.id !== action.payload),
      };
    case "ADD_GROUP":
      return { ...state, groups: [...state.groups, action.payload] };
    case "UPDATE_GROUP":
      return {
        ...state,
        groups: state.groups.map((g) => (g.id === action.payload.id ? action.payload : g)),
      };
    case "DELETE_GROUP":
      return {
        ...state,
        groups: state.groups.filter((g) => g.id !== action.payload),
        candidates: state.candidates.map((c) =>
          c.groupId === action.payload ? { ...c, groupId: null } : c
        ),
      };
    case "ASSIGN_TO_GROUP":
      return {
        ...state,
        candidates: state.candidates.map((c) =>
          c.id === action.payload.candidateId
            ? { ...c, groupId: action.payload.groupId }
            : c
        ),
      };
    case "ADD_ROOM":
      return { ...state, rooms: [...state.rooms, action.payload] };
    case "UPDATE_ROOM":
      return {
        ...state,
        rooms: state.rooms.map((r) => (r.id === action.payload.id ? action.payload : r)),
      };
    case "DELETE_ROOM":
      return {
        ...state,
        rooms: state.rooms.filter((r) => r.id !== action.payload),
        candidates: state.candidates.map((c) =>
          c.roomId === action.payload ? { ...c, roomId: null } : c
        ),
      };
    case "ASSIGN_TO_ROOM":
      return {
        ...state,
        candidates: state.candidates.map((c) =>
          c.id === action.payload.candidateId
            ? { ...c, roomId: action.payload.roomId }
            : c
        ),
      };
    case "ADD_ACTIVITY":
      return {
        ...state,
        activities: [action.payload, ...state.activities].slice(0, 50),
      };
    case "LOCK_GROUP":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.payload.groupId ? { ...g, isLocked: action.payload.locked } : g
        ),
      };
    case "REORDER_GROUPS": {
      const order = action.payload;
      const sorted = [...state.groups].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      return { ...state, groups: sorted };
    }
    default:
      return state;
  }
}

function buildInitialState(initialEvent: Event | null): AppState {
  if (!initialEvent) {
    if (process.env.NODE_ENV === "development") {
      return getMockInitialState();
    }
    return {
      event: EMPTY_EVENT,
      candidates: [],
      connections: [],
      groups: [],
      rooms: [],
      activities: [],
    };
  }
  return {
    event: initialEvent,
    candidates: [],
    connections: [],
    groups: [],
    rooms: [],
    activities: [],
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue extends AppState {
  // Derived
  adjacency: Map<string, Set<string>>;
  groupConflicts: Omit<Conflict, "id" | "createdAt">[];
  roomConflicts: Omit<Conflict, "id" | "createdAt">[];
  allConflicts: Omit<Conflict, "id" | "createdAt">[];
  // Event management
  setEvent: (event: Event) => void;
  loadEventData: (eventId: string) => Promise<void>;
  // Mutations
  addCandidate: (candidate: Candidate) => void;
  updateCandidate: (candidate: Candidate) => void;
  deleteCandidate: (id: string) => void;
  deleteCandidates: (ids: string[]) => void;
  importCandidates: (candidates: Candidate[]) => void;
  addConnection: (conn: Connection) => void;
  updateConnection: (conn: Connection) => void;
  confirmConnection: (id: string) => void;
  deleteConnection: (id: string) => void;
  addGroup: (group: Group) => void;
  updateGroup: (group: Group) => void;
  deleteGroup: (id: string) => void;
  assignToGroup: (candidateId: string, groupId: string | null) => void;
  autoDistribute: () => void;
  clearAllGroups: () => void;
  lockGroup: (groupId: string, locked: boolean) => void;
  reorderGroups: (groupIds: string[]) => void;
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  deleteRoom: (id: string) => void;
  assignToRoom: (candidateId: string, roomId: string | null) => void;
}

const AppContext = createContext<AppContextValue>(null!);

async function readEventDataFromDexie(eventId: string) {
  if (!db) return null;
  const database = db;

  const [cands, grps, rms, conns, acts] = await Promise.all([
    database.candidates.where("eventId").equals(eventId).toArray(),
    database.groups.where("eventId").equals(eventId).sortBy("order"),
    database.rooms.where("eventId").equals(eventId).toArray(),
    database.connections.where("eventId").equals(eventId).toArray(),
    database.activities.orderBy("createdAt").reverse().limit(50).toArray(),
  ]);

  return { candidates: cands, groups: grps, rooms: rms, connections: conns, activities: acts };
}

async function replaceEventDataInDexie(eventId: string, data: Partial<AppState>) {
  if (!db) return;
  const database = db;

  await database.transaction(
    "rw",
    database.candidates,
    database.connections,
    database.groups,
    database.rooms,
    async () => {
      if (data.candidates) {
        await database.candidates.where("eventId").equals(eventId).delete();
        await database.candidates.bulkPut(data.candidates);
      }
      if (data.groups) {
        await database.groups.where("eventId").equals(eventId).delete();
        await database.groups.bulkPut(data.groups);
      }
      if (data.rooms) {
        await database.rooms.where("eventId").equals(eventId).delete();
        await database.rooms.bulkPut(data.rooms);
      }
      if (data.connections) {
        await database.connections.where("eventId").equals(eventId).delete();
        await database.connections.bulkPut(data.connections);
      }
    }
  );
}

async function persistOfflineWrite(
  write: () => Promise<void>,
  items: Array<Omit<SyncQueueItem, "id" | "timestamp" | "retries">>
) {
  if (!db) return;
  const database = db;

  await database.transaction(
    "rw",
    [database.candidates, database.connections, database.groups, database.rooms, database.activities, database.syncQueue],
    async () => {
      await write();
      await database.syncQueue.bulkAdd(
        items.map((item) => ({ ...item, timestamp: Date.now(), retries: 0 }))
      );
    }
  );
  broadcastSyncQueueChanged();
}

export function AppProvider({
  children,
  initialEvent = null,
  currentUser = { id: "demo-admin", name: "Shepherd" },
}: {
  children: React.ReactNode;
  initialEvent?: Event | null;
  currentUser?: { id: string; name: string };
}) {
  const [state, dispatch] = useReducer(reducer, buildInitialState(initialEvent));

  const autoConnections = useMemo(
    () => deriveAutoConnections(state.candidates),
    [state.candidates]
  );

  const allConnections = useMemo(
    () => [...autoConnections, ...state.connections],
    [autoConnections, state.connections]
  );

  const adjacency = useMemo(
    () => buildAdjacencyMap(allConnections),
    [allConnections]
  );

  const groupConflicts = useMemo(() => {
    const groupsWithCandidates = state.groups.map((g) => ({
      id: g.id,
      candidates: state.candidates.filter((c) => c.groupId === g.id),
    }));
    return detectGroupConflicts(groupsWithCandidates, adjacency);
  }, [state.groups, state.candidates, adjacency]);

  const roomConflicts = useMemo(() => {
    const roomsWithCandidates = state.rooms.map((r) => ({
      id: r.id,
      candidates: state.candidates.filter((c) => c.roomId === r.id),
    }));
    return detectRoomConflicts(roomsWithCandidates, adjacency);
  }, [state.rooms, state.candidates, adjacency]);

  const allConflicts = useMemo(
    () => [...groupConflicts, ...roomConflicts],
    [groupConflicts, roomConflicts]
  );

  const addActivity = useCallback((desc: string, entityType = "candidate", action = "updated") => {
    const activity: Activity = {
      id: `act-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      entityType,
      entityId: null,
      description: desc,
      createdAt: new Date().toISOString(),
    };
    dispatch({
      type: "ADD_ACTIVITY",
      payload: activity,
    });
    // Persist to Dexie
    import("./dexie").then(({ db }) => {
      if (db) db.activities.add(activity);
    });
  }, [currentUser]);

  const setEvent = useCallback((event: Event) => {
    dispatch({ type: "SET_EVENT", payload: event });
  }, []);

  const loadEventData = useCallback(async (eventId: string) => {
    // 1. Try to load from IndexedDB (Dexie) first for immediate, offline-first display
    try {
      const localData = await readEventDataFromDexie(eventId);
      if (localData && (localData.candidates.length > 0 || localData.groups.length > 0 || localData.rooms.length > 0 || localData.connections.length > 0)) {
        dispatch({
          type: "SET_APP_DATA",
          payload: localData,
        });
      }
    } catch {
      // Ignore Dexie errors
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const pendingLocalWrites = db ? await db.syncQueue.count().catch(() => 0) : 0;
    if (pendingLocalWrites > 0) return;

    // 2. Then, fetch from the server to ensure we have the latest data
    try {
      const [candidatesRes, groupsRes, roomsRes, connectionsRes] = await Promise.allSettled([
        fetch(`/api/candidates?eventId=${eventId}`).then((r) => r.json()),
        fetch(`/api/groups?eventId=${eventId}`).then((r) => r.json()),
        fetch(`/api/rooms?eventId=${eventId}`).then((r) => r.json()),
        fetch(`/api/connections?eventId=${eventId}`).then((r) => r.json()),
      ]);

      const newData: Partial<AppState> = {};
      let hasNewData = false;

      if (candidatesRes.status === "fulfilled" && candidatesRes.value.data) {
        newData.candidates = candidatesRes.value.data;
        hasNewData = true;
      }
      if (groupsRes.status === "fulfilled" && groupsRes.value.data) {
        newData.groups = groupsRes.value.data;
        hasNewData = true;
      }
      if (roomsRes.status === "fulfilled" && roomsRes.value.data) {
        newData.rooms = roomsRes.value.data;
        hasNewData = true;
      }
      if (connectionsRes.status === "fulfilled" && connectionsRes.value.data) {
        newData.connections = connectionsRes.value.data.map((c: Connection & { from?: { fullName: string }; to?: { fullName: string } }) => ({
          ...c,
          fromName: c.from?.fullName ?? c.fromName,
          toName:   c.to?.fullName   ?? c.toName,
        }));
        hasNewData = true;
      }

      if (hasNewData) {
        dispatch({ type: "SET_APP_DATA", payload: newData });

        // 3. Replace local event data so deleted server rows do not reappear offline.
        await replaceEventDataInDexie(eventId, newData);
      }
    } catch {
      // Silently ignore network errors — app stays with Dexie data
    }
  }, []);

  // ── Sync across tabs ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    const channel = new BroadcastChannel("group-builder-sync");
    channel.onmessage = (event) => {
      if (event.data.type === "REFRESH_DATA" && event.data.eventId === state.event.id) {
        // Reload from Dexie (which has been updated by the other tab)
        readEventDataFromDexie(state.event.id).then((data) => {
          if (data) {
            dispatch({ type: "SET_APP_DATA", payload: data });
          }
        });
      }
    };
    return () => channel.close();
  }, [state.event.id]);

  const notifyOtherTabs = useCallback(() => {
    if (typeof window !== "undefined") {
      const channel = new BroadcastChannel("group-builder-sync");
      channel.postMessage({ type: "REFRESH_DATA", eventId: state.event.id });
      channel.close();
    }
  }, [state.event.id]);

  // Load data from the API whenever the active event changes
  useEffect(() => {
    if (state.event.id) loadEventData(state.event.id);
  }, [state.event.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addCandidate = useCallback((candidate: Candidate) => {
    dispatch({ type: "ADD_CANDIDATE", payload: candidate });
    addActivity(`Added candidate: ${candidate.fullName}`, "candidate", "created");

    persistOfflineWrite(
      () => db!.candidates.put(candidate).then(() => undefined),
      [{ action: "create", entity: "candidate", entityId: candidate.id, payload: candidate }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [addActivity, notifyOtherTabs]);

  const updateCandidate = useCallback(async (candidate: Candidate) => {
    dispatch({ type: "UPDATE_CANDIDATE", payload: candidate });

    persistOfflineWrite(
      () => db!.candidates.put(candidate).then(() => undefined),
      [{ action: "update", entity: "candidate", entityId: candidate.id, payload: candidate }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const deleteCandidate = useCallback((id: string) => {
    dispatch({ type: "DELETE_CANDIDATE", payload: id });

    persistOfflineWrite(
      async () => {
        await db!.candidates.delete(id);
        await db!.connections.where("fromId").equals(id).or("toId").equals(id).delete();
      },
      [{ action: "delete", entity: "candidate", entityId: id, payload: {} }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const deleteCandidates = useCallback((ids: string[]) => {
    dispatch({ type: "DELETE_CANDIDATES", payload: ids });

    persistOfflineWrite(
      async () => {
        await db!.candidates.bulkDelete(ids);
        await db!.connections.where("fromId").anyOf(ids).or("toId").anyOf(ids).delete();
      },
      ids.map((id) => ({ action: "delete", entity: "candidate", entityId: id, payload: {} }))
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const importCandidates = useCallback((candidates: Candidate[]) => {
    dispatch({ type: "SET_CANDIDATES", payload: [...candidates, ...state.candidates] });
    addActivity(`Imported ${candidates.length} candidates`, "candidate", "imported");
    
    persistOfflineWrite(
      () => db!.candidates.bulkPut(candidates).then(() => undefined),
      candidates.map((c) => ({ action: "create", entity: "candidate", entityId: c.id, payload: c }))
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [state.candidates, addActivity, notifyOtherTabs]);

  function canonicalizeConnection(conn: Connection): Connection {
    if (conn.fromId > conn.toId) {
      return {
        ...conn,
        fromId: conn.toId,
        toId: conn.fromId,
        fromName: conn.toName,
        toName: conn.fromName,
      };
    }
    return conn;
  }

  const addConnection = useCallback((conn: Connection) => {
    // Ensure eventId is present and sorted
    const connection = canonicalizeConnection({ ...conn, eventId: state.event.id });
    dispatch({ type: "ADD_CONNECTION", payload: connection });
    addActivity(`Added connection: ${connection.fromName} ↔ ${connection.toName}`, "connection", "created");
    
    persistOfflineWrite(
      () => db!.connections.put(connection).then(() => undefined),
      [{ action: "create", entity: "connection", entityId: connection.id, payload: connection }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [state.event.id, addActivity, notifyOtherTabs]);

  const updateConnection = useCallback((conn: Connection) => {
    const connection = canonicalizeConnection({ ...conn, eventId: state.event.id });
    dispatch({ type: "UPDATE_CONNECTION", payload: connection });
    
    persistOfflineWrite(
      () => db!.connections.put(connection).then(() => undefined),
      [{ action: "update", entity: "connection", entityId: connection.id, payload: connection }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [state.event.id, notifyOtherTabs]);

  const confirmConnection = useCallback((id: string) => {
    dispatch({ type: "CONFIRM_CONNECTION", payload: id });
    
    persistOfflineWrite(
      () => db!.connections.update(id, { confirmed: true }).then(() => undefined),
      [{ action: "update", entity: "connection", entityId: id, payload: { confirmed: true } }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const deleteConnection = useCallback((id: string) => {
    dispatch({ type: "DELETE_CONNECTION", payload: id });
    
    persistOfflineWrite(
      () => db!.connections.delete(id).then(() => undefined),
      [{ action: "delete", entity: "connection", entityId: id, payload: {} }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const addGroup = useCallback((group: Group) => {
    dispatch({ type: "ADD_GROUP", payload: group });
    addActivity(`Created group: ${group.name}`, "group", "created");
    
    persistOfflineWrite(
      () => db!.groups.put(group).then(() => undefined),
      [{ action: "create", entity: "group", entityId: group.id, payload: group }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [addActivity, notifyOtherTabs]);

  const updateGroup = useCallback((group: Group) => {
    dispatch({ type: "UPDATE_GROUP", payload: group });
    
    persistOfflineWrite(
      () => db!.groups.put(group).then(() => undefined),
      [{ action: "update", entity: "group", entityId: group.id, payload: group }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const deleteGroup = useCallback((id: string) => {
    dispatch({ type: "DELETE_GROUP", payload: id });
    
    persistOfflineWrite(
      async () => {
        await db!.groups.delete(id);
        await db!.candidates.where("groupId").equals(id).modify({ groupId: null });
      },
      [{ action: "delete", entity: "group", entityId: id, payload: {} }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const assignToGroup = useCallback((candidateId: string, groupId: string | null) => {
    dispatch({ type: "ASSIGN_TO_GROUP", payload: { candidateId, groupId } });
    const candidate = state.candidates.find((c) => c.id === candidateId);
    const group = groupId ? state.groups.find((g) => g.id === groupId) : null;
    if (candidate) {
      if (group) addActivity(`Assigned ${candidate.fullName} to ${group.name}`, "group", "assigned");
      else addActivity(`Removed ${candidate.fullName} from group`, "group", "removed");
    }

    persistOfflineWrite(
      () => db!.candidates.update(candidateId, { groupId }).then(() => undefined),
      [{ action: "update", entity: "candidate", entityId: candidateId, payload: { groupId } }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [state.candidates, state.groups, addActivity, notifyOtherTabs]);

  const autoDistribute = useCallback(() => {
    const unassigned = state.candidates.filter((c) => !c.groupId);
    const groupsForDist = state.groups.map((g) => ({
      id: g.id,
      capacity: g.capacity,
      candidates: state.candidates.filter((c) => c.groupId === g.id),
    }));
    const assignments = autoDistributeImpl(unassigned, groupsForDist, adjacency);
    const syncItems: Array<Omit<SyncQueueItem, "id" | "timestamp" | "retries">> = [];
    assignments.forEach((groupId, candidateId) => {
      dispatch({ type: "ASSIGN_TO_GROUP", payload: { candidateId, groupId } });
      syncItems.push({ action: "update", entity: "candidate", entityId: candidateId, payload: { groupId } });
    });
    persistOfflineWrite(
      async () => {
        for (const [candidateId, groupId] of assignments) {
          await db!.candidates.update(candidateId, { groupId });
        }
      },
      syncItems
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
    addActivity(`Auto-distributed ${assignments.size} candidates`, "group", "assigned");
  }, [state.candidates, state.groups, adjacency, addActivity, notifyOtherTabs]);

  const clearAllGroups = useCallback(() => {
    const assigned = state.candidates.filter((c) => c.groupId);
    assigned.forEach((c) => {
      if (c.groupId) {
        dispatch({ type: "ASSIGN_TO_GROUP", payload: { candidateId: c.id, groupId: null } });
      }
    });
    persistOfflineWrite(
      async () => {
        for (const c of assigned) {
          await db!.candidates.update(c.id, { groupId: null });
        }
      },
      assigned.map((c) => ({ action: "update", entity: "candidate", entityId: c.id, payload: { groupId: null } }))
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [state.candidates, notifyOtherTabs]);

  const lockGroup = useCallback((groupId: string, locked: boolean) => {
    dispatch({ type: "LOCK_GROUP", payload: { groupId, locked } });
    
    persistOfflineWrite(
      () => db!.groups.update(groupId, { isLocked: locked }).then(() => undefined),
      [{ action: "update", entity: "group", entityId: groupId, payload: { isLocked: locked } }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const reorderGroups = useCallback((groupIds: string[]) => {
    dispatch({ type: "REORDER_GROUPS", payload: groupIds });
    
    persistOfflineWrite(
      async () => {
        for (const [index, id] of groupIds.entries()) {
          await db!.groups.update(id, { order: index });
        }
      },
      groupIds.map((id, index) => ({
        action: "update",
        entity: "group",
        entityId: id,
        payload: { order: index },
      }))
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const addRoom = useCallback((room: Room) => {
    dispatch({ type: "ADD_ROOM", payload: room });
    addActivity(`Created room: ${room.name}`, "room", "created");

    persistOfflineWrite(
      () => db!.rooms.put(room).then(() => undefined),
      [{ action: "create", entity: "room", entityId: room.id, payload: room }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [addActivity, notifyOtherTabs]);

  const updateRoom = useCallback((room: Room) => {
    dispatch({ type: "UPDATE_ROOM", payload: room });

    persistOfflineWrite(
      () => db!.rooms.put(room).then(() => undefined),
      [{ action: "update", entity: "room", entityId: room.id, payload: room }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const deleteRoom = useCallback((id: string) => {
    dispatch({ type: "DELETE_ROOM", payload: id });

    persistOfflineWrite(
      async () => {
        await db!.rooms.delete(id);
        await db!.candidates.where("roomId").equals(id).modify({ roomId: null });
      },
      [{ action: "delete", entity: "room", entityId: id, payload: {} }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [notifyOtherTabs]);

  const assignToRoom = useCallback((candidateId: string, roomId: string | null) => {
    dispatch({ type: "ASSIGN_TO_ROOM", payload: { candidateId, roomId } });
    const candidate = state.candidates.find((c) => c.id === candidateId);
    const room = roomId ? state.rooms.find((r) => r.id === roomId) : null;
    if (candidate) {
      if (room) addActivity(`Assigned ${candidate.fullName} to ${room.name}`, "room", "assigned");
      else addActivity(`Removed ${candidate.fullName} from room`, "room", "removed");
    }

    persistOfflineWrite(
      () => db!.candidates.update(candidateId, { roomId }).then(() => undefined),
      [{ action: "update", entity: "candidate", entityId: candidateId, payload: { roomId } }]
    ).then(() => {
      notifyOtherTabs();
      flushSyncQueue();
    });
  }, [state.candidates, state.rooms, addActivity, notifyOtherTabs]);

  const value: AppContextValue = {
    ...state,
    connections: allConnections,
    adjacency,
    groupConflicts,
    roomConflicts,
    allConflicts,
    setEvent,
    loadEventData,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    deleteCandidates,
    importCandidates,
    addConnection,
    updateConnection,
    confirmConnection,
    deleteConnection,
    addGroup,
    updateGroup,
    deleteGroup,
    assignToGroup,
    autoDistribute,
    clearAllGroups,
    lockGroup,
    reorderGroups,
    addRoom,
    updateRoom,
    deleteRoom,
    assignToRoom,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
