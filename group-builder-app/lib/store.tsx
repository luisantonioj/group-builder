"use client";

// Client-side state store for the Grouping System.
// Initialises with mock data so the app is immediately functional without a DB.
// All mutations call the real API when available and update local state optimistically.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import {
  MOCK_CANDIDATES,
  MOCK_CONNECTIONS,
  MOCK_GROUPS,
  MOCK_ROOMS,
  MOCK_ACTIVITIES,
  MOCK_BATCH,
} from "./mock-data";
import {
  buildAdjacencyMap,
  detectGroupConflicts,
  detectRoomConflicts,
  autoDistribute as autoDistributeImpl,
  deriveAutoConnections,
} from "./conflict-detection";
import type { Candidate, Connection, Group, Room, Activity, Batch, Conflict } from "@/types";
import { enqueueSync } from "./dexie";

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  batch: Batch;
  candidates: Candidate[];
  connections: Connection[];
  groups: Group[];
  rooms: Room[];
  activities: Activity[];
}

type Action =
  | { type: "SET_CANDIDATES"; payload: Candidate[] }
  | { type: "ADD_CANDIDATE"; payload: Candidate }
  | { type: "UPDATE_CANDIDATE"; payload: Candidate }
  | { type: "DELETE_CANDIDATE"; payload: string }
  | { type: "ADD_CONNECTION"; payload: Connection }
  | { type: "DELETE_CONNECTION"; payload: string }
  | { type: "ADD_GROUP"; payload: Group }
  | { type: "UPDATE_GROUP"; payload: Group }
  | { type: "DELETE_GROUP"; payload: string }
  | { type: "ASSIGN_TO_GROUP"; payload: { candidateId: string; groupId: string | null } }
  | { type: "ADD_ROOM"; payload: Room }
  | { type: "UPDATE_ROOM"; payload: Room }
  | { type: "ASSIGN_TO_ROOM"; payload: { candidateId: string; roomId: string | null } }
  | { type: "ADD_ACTIVITY"; payload: Activity }
  | { type: "LOCK_GROUP"; payload: { groupId: string; locked: boolean } }
  | { type: "REORDER_GROUPS"; payload: string[] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_CANDIDATES":
      return { ...state, candidates: action.payload };
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
    case "ADD_CONNECTION":
      return { ...state, connections: [...state.connections, action.payload] };
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

const initialState: AppState = {
  batch: MOCK_BATCH,
  candidates: MOCK_CANDIDATES,
  connections: MOCK_CONNECTIONS.filter((c) => c.source === "MANUAL"),
  groups: MOCK_GROUPS,
  rooms: MOCK_ROOMS,
  activities: MOCK_ACTIVITIES,
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue extends AppState {
  // Derived
  adjacency: Map<string, Set<string>>;
  groupConflicts: Omit<Conflict, "id" | "createdAt">[];
  roomConflicts: Omit<Conflict, "id" | "createdAt">[];
  allConflicts: Omit<Conflict, "id" | "createdAt">[];
  // Mutations
  addCandidate: (candidate: Candidate) => void;
  updateCandidate: (candidate: Candidate) => void;
  deleteCandidate: (id: string) => void;
  importCandidates: (candidates: Candidate[]) => void;
  addConnection: (conn: Connection) => void;
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
  assignToRoom: (candidateId: string, roomId: string | null) => void;
}

const AppContext = createContext<AppContextValue>(null!);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

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
    dispatch({
      type: "ADD_ACTIVITY",
      payload: {
        id: `act-${Date.now()}`,
        userId: "demo-admin",
        userName: "Shepherd",
        action,
        entityType,
        entityId: null,
        description: desc,
        createdAt: new Date().toISOString(),
      },
    });
  }, []);

  const addCandidate = useCallback((candidate: Candidate) => {
    dispatch({ type: "ADD_CANDIDATE", payload: candidate });
    addActivity(`Added candidate: ${candidate.fullName}`, "candidate", "created");
    if (!navigator.onLine) {
      enqueueSync({ action: "create", entity: "candidate", entityId: candidate.id, payload: candidate });
    }
  }, [addActivity]);

  const updateCandidate = useCallback((candidate: Candidate) => {
    dispatch({ type: "UPDATE_CANDIDATE", payload: candidate });
    if (!navigator.onLine) {
      enqueueSync({ action: "update", entity: "candidate", entityId: candidate.id, payload: candidate });
    }
  }, []);

  const deleteCandidate = useCallback((id: string) => {
    dispatch({ type: "DELETE_CANDIDATE", payload: id });
    if (!navigator.onLine) {
      enqueueSync({ action: "delete", entity: "candidate", entityId: id, payload: {} });
    }
  }, []);

  const importCandidates = useCallback((candidates: Candidate[]) => {
    dispatch({ type: "SET_CANDIDATES", payload: [...candidates, ...state.candidates] });
    addActivity(`Imported ${candidates.length} candidates`, "candidate", "imported");
  }, [state.candidates, addActivity]);

  const addConnection = useCallback((conn: Connection) => {
    dispatch({ type: "ADD_CONNECTION", payload: conn });
    addActivity(`Added connection: ${conn.fromName} ↔ ${conn.toName}`, "connection", "created");
  }, [addActivity]);

  const deleteConnection = useCallback((id: string) => {
    dispatch({ type: "DELETE_CONNECTION", payload: id });
  }, []);

  const addGroup = useCallback((group: Group) => {
    dispatch({ type: "ADD_GROUP", payload: group });
  }, []);

  const updateGroup = useCallback((group: Group) => {
    dispatch({ type: "UPDATE_GROUP", payload: group });
  }, []);

  const deleteGroup = useCallback((id: string) => {
    dispatch({ type: "DELETE_GROUP", payload: id });
  }, []);

  const assignToGroup = useCallback((candidateId: string, groupId: string | null) => {
    dispatch({ type: "ASSIGN_TO_GROUP", payload: { candidateId, groupId } });
    if (!navigator.onLine) {
      enqueueSync({ action: "update", entity: "candidate", entityId: candidateId, payload: { groupId } });
    }
  }, []);

  const autoDistribute = useCallback(() => {
    const unassigned = state.candidates.filter((c) => !c.groupId);
    const groupsForDist = state.groups.map((g) => ({
      id: g.id,
      capacity: g.capacity,
      candidates: state.candidates.filter((c) => c.groupId === g.id),
    }));
    const assignments = autoDistributeImpl(unassigned, groupsForDist, adjacency);
    assignments.forEach((groupId, candidateId) => {
      dispatch({ type: "ASSIGN_TO_GROUP", payload: { candidateId, groupId } });
    });
    addActivity(`Auto-distributed ${assignments.size} candidates`, "group", "assigned");
  }, [state.candidates, state.groups, adjacency, addActivity]);

  const clearAllGroups = useCallback(() => {
    state.candidates.forEach((c) => {
      if (c.groupId) dispatch({ type: "ASSIGN_TO_GROUP", payload: { candidateId: c.id, groupId: null } });
    });
  }, [state.candidates]);

  const lockGroup = useCallback((groupId: string, locked: boolean) => {
    dispatch({ type: "LOCK_GROUP", payload: { groupId, locked } });
  }, []);

  const reorderGroups = useCallback((groupIds: string[]) => {
    dispatch({ type: "REORDER_GROUPS", payload: groupIds });
  }, []);

  const addRoom = useCallback((room: Room) => {
    dispatch({ type: "ADD_ROOM", payload: room });
  }, []);

  const updateRoom = useCallback((room: Room) => {
    dispatch({ type: "UPDATE_ROOM", payload: room });
  }, []);

  const assignToRoom = useCallback((candidateId: string, roomId: string | null) => {
    dispatch({ type: "ASSIGN_TO_ROOM", payload: { candidateId, roomId } });
    if (!navigator.onLine) {
      enqueueSync({ action: "update", entity: "candidate", entityId: candidateId, payload: { roomId } });
    }
  }, []);

  const value: AppContextValue = {
    ...state,
    connections: allConnections,
    adjacency,
    groupConflicts,
    roomConflicts,
    allConflicts,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    importCandidates,
    addConnection,
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
    assignToRoom,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
