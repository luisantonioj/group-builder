"use client";

// Dexie.js — IndexedDB wrapper for offline-first PWA storage.
// Rows are stored in plain IndexedDB (not encrypted). The local DB is cleared on sign-out.

import Dexie, { type Table } from "dexie";
import type { Candidate, Connection, Group, Room, Activity } from "@/types";

export type SyncEntity = "candidate" | "group" | "room" | "connection";
export type SyncStatus = "PENDING" | "FAILED" | "CONFLICT";

export interface SyncConflict {
  fields: string[];
  server: Record<string, unknown>;
}

export interface SyncQueueItem {
  id?: number;
  action: "create" | "update" | "delete";
  entity: SyncEntity;
  entityId: string;
  payload: unknown;
  /** Values the client last saw for each changed field — used for server-side conflict detection. */
  base?: Record<string, unknown>;
  timestamp: number;
  retries: number;
  /** Bumped whenever another write is merged into this item, so an in-flight send never drops it. */
  rev?: number;
  status?: SyncStatus;
  errorMessage?: string;
  conflict?: SyncConflict;
}

export type NewSyncItem = Omit<SyncQueueItem, "id" | "timestamp" | "retries" | "rev" | "status">;

class GroupBuilderDB extends Dexie {
  candidates!: Table<Candidate>;
  connections!: Table<Connection>;
  groups!: Table<Group>;
  rooms!: Table<Room>;
  activities!: Table<Activity>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super("GroupBuilderDB");

    this.version(1).stores({
      candidates: "id, batchId, groupId, roomId, gender, fullName",
      connections: "id, fromId, toId",
      groups: "id, batchId",
      rooms: "id, batchId, gender",
      activities: "id, createdAt",
      syncQueue: "++id, entity, timestamp",
    });

    this.version(2).stores({
      candidates: "id, eventId, groupId, roomId, gender, fullName",
      connections: "id, fromId, toId",
      groups: "id, eventId",
      rooms: "id, eventId, gender",
      activities: "id, createdAt",
      syncQueue: "++id, entity, timestamp",
    });

    this.version(3).stores({
      candidates: "id, eventId, groupId, roomId, gender, fullName, isConfirmed",
      connections: "id, fromId, toId",
      groups: "id, eventId",
      rooms: "id, eventId, gender",
      activities: "id, createdAt",
      syncQueue: "++id, entity, timestamp",
    });

    this.version(4).stores({
      candidates: "id, eventId, groupId, roomId, gender, fullName, isConfirmed",
      connections: "id, fromId, toId, eventId",
      groups: "id, eventId, order",
      rooms: "id, eventId, gender",
      activities: "id, createdAt",
      syncQueue: "++id, entity, timestamp",
    });

    this.version(5).stores({
      candidates: "id, eventId, groupId, roomId, gender, fullName, isConfirmed",
      connections: "id, fromId, toId, eventId",
      groups: "id, eventId, order",
      rooms: "id, eventId, gender",
      activities: "id, createdAt",
      syncQueue: "++id, entity, entityId, timestamp, status",
    });
  }
}

export const db = typeof window !== "undefined" ? new GroupBuilderDB() : null;

// ─── Cross-tab messaging ──────────────────────────────────────────────────────

export const SYNC_CHANNEL = "group-builder-sync";

export type SyncMessage =
  | { type: "SYNC_QUEUE_CHANGED" }
  | { type: "SYNC_DRAINED" }
  | { type: "AUTH_REQUIRED" }
  | { type: "RELOAD_FROM_SERVER" }
  | { type: "REFRESH_DATA"; eventId: string; tabId?: string };

/** Identifies this browser tab, so it can ignore its own cross-tab broadcasts. */
export const TAB_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function postSyncMessage(message: SyncMessage) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(SYNC_CHANNEL);
  channel.postMessage(message);
  channel.close();
}

export function broadcastSyncQueueChanged() {
  postSyncMessage({ type: "SYNC_QUEUE_CHANGED" });
}

export function isPending(item: SyncQueueItem) {
  return !item.status || item.status === "PENDING";
}

// ─── Payload whitelists ───────────────────────────────────────────────────────

const API_FIELDS: Record<SyncEntity, string[]> = {
  candidate: [
    "id",
    "fullName",
    "lastName",
    "firstName",
    "gender",
    "age",
    "school",
    "inviterName",
    "howHeard",
    "yeBatch",
    "birthday",
    "address",
    "facebook",
    "contact",
    "fatherName",
    "fatherContact",
    "motherName",
    "motherContact",
    "allergies",
    "shepherdNotes",
    "isConfirmed",
    "isPresent",
    "groupId",
    "roomId",
    "eventId",
  ],
  group: ["id", "name", "label", "capacity", "order", "isLocked", "eventId"],
  room: ["id", "name", "floor", "building", "capacity", "bedCount", "gender", "eventId"],
  connection: [
    "id",
    "fromId",
    "toId",
    "eventId",
    "relationshipType",
    "source",
    "note",
    "confirmed",
  ],
};

/**
 * Fields whose concurrent edits should be flagged as conflicts.
 * Group `order` is intentionally excluded — reordering is last-write-wins.
 */
const CONFLICT_FIELDS: Record<SyncEntity, string[]> = {
  candidate: API_FIELDS.candidate.filter((f) => f !== "id" && f !== "eventId" && f !== "yeBatch"),
  group: ["name", "label", "capacity", "isLocked"],
  room: ["name", "floor", "building", "capacity", "bedCount", "gender"],
  connection: [],
};

function pick(entity: SyncEntity, source: unknown, fields = API_FIELDS[entity]) {
  if (!source || typeof source !== "object") return {};
  const record = source as Record<string, unknown>;
  return fields.reduce<Record<string, unknown>>((clean, key) => {
    if (record[key] !== undefined) clean[key] = record[key];
    return clean;
  }, {});
}

function normalize(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/**
 * Builds a minimal update: only fields that actually changed, plus the values
 * this client last saw for them (the "base") so the server can detect conflicts.
 * Returns null when nothing syncable changed.
 */
export function diffForSync(
  entity: SyncEntity,
  prev: object | undefined,
  next: object
): { payload: Record<string, unknown>; base: Record<string, unknown> } | null {
  const before = (prev ?? {}) as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  const base: Record<string, unknown> = {};

  for (const key of API_FIELDS[entity]) {
    if (key === "id" || key === "eventId") continue;
    if (after[key] === undefined) continue;
    if (normalize(before[key]) === normalize(after[key])) continue;
    payload[key] = after[key];
    if (prev && CONFLICT_FIELDS[entity].includes(key)) base[key] = before[key] ?? null;
  }

  return Object.keys(payload).length ? { payload, base } : null;
}

/** Base values for a partial update built by hand (e.g. assigning a candidate to a group). */
export function baseFor(entity: SyncEntity, prev: object | undefined, fields: string[]) {
  if (!prev) return undefined;
  const record = prev as Record<string, unknown>;
  const base: Record<string, unknown> = {};
  for (const key of fields) {
    if (CONFLICT_FIELDS[entity].includes(key)) base[key] = record[key] ?? null;
  }
  return Object.keys(base).length ? base : undefined;
}

// ─── Enqueue (with coalescing) ────────────────────────────────────────────────

/**
 * Adds writes to the queue, merging them into earlier pending items for the same
 * entity where possible. Must be called inside a Dexie transaction that includes syncQueue.
 */
export async function addToQueue(items: NewSyncItem[]) {
  if (!db) return;
  const database = db;

  for (const item of items) {
    const existing = (
      await database.syncQueue.where("entityId").equals(item.entityId).toArray()
    ).filter((q) => q.entity === item.entity && isPending(q));

    if (item.action === "update") {
      const target = existing.find((q) => q.action === "update" || q.action === "create");
      if (target?.id != null) {
        const merged: Partial<SyncQueueItem> = {
          payload: { ...(target.payload as object), ...(item.payload as object) },
          rev: (target.rev ?? 0) + 1,
        };
        if (target.action === "update") {
          // Keep the earliest base value per field — that's what the server should still have.
          merged.base = { ...(item.base ?? {}), ...(target.base ?? {}) };
        }
        await database.syncQueue.update(target.id, merged);
        continue;
      }
    }

    if (item.action === "delete") {
      // Pending updates are moot once the row is deleted. The create (if any) is dropped too;
      // the delete is still sent in case that create already reached the server (a 404 is fine).
      const moot = existing.filter((q) => q.action !== "delete" && q.id != null).map((q) => q.id!);
      if (moot.length) await database.syncQueue.bulkDelete(moot);
      if (existing.some((q) => q.action === "delete")) continue;
    }

    await database.syncQueue.add({
      ...item,
      timestamp: Date.now(),
      retries: 0,
      rev: 0,
      status: "PENDING",
    });
  }
}

// ─── Flush ────────────────────────────────────────────────────────────────────

export interface FlushResult {
  pending: number;
  failed: number;
  /** The server could not be reached — treat the app as offline. */
  networkError: boolean;
  /** The session expired; the user must sign in again before the queue can drain. */
  authRequired: boolean;
}

let isFlushing = false;

async function readErrorBody(res: Response) {
  try {
    return (await res.json()) as { error?: unknown; conflict?: SyncConflict };
  } catch {
    return {};
  }
}

async function countQueue(): Promise<Pick<FlushResult, "pending" | "failed">> {
  if (!db) return { pending: 0, failed: 0 };
  const queue = await db.syncQueue.toArray();
  return {
    pending: queue.filter(isPending).length,
    failed: queue.length - queue.filter(isPending).length,
  };
}

async function runFlush(onProgress?: (pending: number) => void): Promise<FlushResult> {
  const database = db!;
  let networkError = false;
  let authRequired = false;
  let sentAny = false;

  const queue = (await database.syncQueue.orderBy("timestamp").toArray()).filter(isPending);
  onProgress?.(queue.length);

  for (const item of queue) {
    const method = item.action === "delete" ? "DELETE" : item.action === "create" ? "POST" : "PUT";
    const url = `/api/${item.entity}s/${item.action !== "create" ? item.entityId : ""}`;
    const body =
      item.action === "delete"
        ? undefined
        : JSON.stringify({
            ...pick(item.entity, item.payload),
            ...(item.action === "update" && item.base ? { _base: item.base } : {}),
          });

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
      });
    } catch {
      // Network failure — stop so later writes never overtake this one.
      networkError = true;
      break;
    }

    if (res.status === 401) {
      authRequired = true;
      break;
    }

    if (res.ok || (item.action === "delete" && res.status === 404)) {
      sentAny = true;
      await database.transaction("rw", database.syncQueue, async () => {
        const current = item.id != null ? await database.syncQueue.get(item.id) : undefined;
        if (!current) return;
        if ((current.rev ?? 0) === (item.rev ?? 0)) {
          await database.syncQueue.delete(item.id!);
        } else {
          // More edits were merged in while this was in flight. The fields already sent now match
          // the server, so drop their base to avoid a false conflict on the next send.
          const sent = (item.payload as Record<string, unknown>) ?? {};
          const latest = (current.payload as Record<string, unknown>) ?? {};
          const base = { ...(current.base ?? {}) };
          for (const key of Object.keys(sent)) {
            if (normalize(latest[key]) === normalize(sent[key])) delete base[key];
            else if (key in base) base[key] = sent[key] ?? null;
          }
          await database.syncQueue.update(item.id!, {
            action: current.action === "create" ? "update" : current.action,
            base,
          });
        }
      });
      onProgress?.((await countQueue()).pending);
      continue;
    }

    const errData = await readErrorBody(res);
    const errorMsg =
      typeof errData.error === "string"
        ? errData.error
        : errData.error
        ? JSON.stringify(errData.error)
        : `Server returned status ${res.status}`;

    if (res.status === 409 && errData.conflict && item.id != null) {
      await database.syncQueue.update(item.id, {
        status: "CONFLICT",
        conflict: errData.conflict,
        errorMessage: errorMsg,
      });
      continue;
    }

    const isTransient = res.status >= 500 || res.status === 429;
    if (item.id != null) {
      if (isTransient && item.retries < 10) {
        await database.syncQueue.update(item.id, { retries: item.retries + 1, errorMessage: errorMsg });
        // Keep ordering: stop and try again on the next flush.
        break;
      }
      await database.syncQueue.update(item.id, { status: "FAILED", errorMessage: errorMsg });
    }
  }

  const counts = await countQueue();
  onProgress?.(counts.pending);
  broadcastSyncQueueChanged();
  if (authRequired) postSyncMessage({ type: "AUTH_REQUIRED" });
  if (sentAny && counts.pending === 0) postSyncMessage({ type: "SYNC_DRAINED" });
  return { ...counts, networkError, authRequired };
}

/** Flush the sync queue to the server. Only one tab flushes at a time. */
export async function flushSyncQueue(onProgress?: (pending: number) => void): Promise<FlushResult> {
  const idle: FlushResult = { pending: 0, failed: 0, networkError: false, authRequired: false };
  if (!db) return idle;
  if (!navigator.onLine) return { ...(await countQueue()), networkError: true, authRequired: false };
  if (isFlushing) return { ...(await countQueue()), networkError: false, authRequired: false };

  isFlushing = true;
  try {
    if (typeof navigator !== "undefined" && navigator.locks?.request) {
      const result = await navigator.locks.request(
        "group-builder-sync-flush",
        { ifAvailable: true },
        async (lock) => (lock ? runFlush(onProgress) : null)
      );
      return result ?? { ...(await countQueue()), networkError: false, authRequired: false };
    }
    return await runFlush(onProgress);
  } finally {
    isFlushing = false;
  }
}

// ─── Failed / conflict resolution ─────────────────────────────────────────────

/** Re-queue a failed item, or resolve a conflict by sending this device's values anyway. */
export async function retrySyncItem(id: number) {
  if (!db) return;
  const item = await db.syncQueue.get(id);
  if (!item) return;
  await db.syncQueue.update(id, {
    status: "PENDING",
    retries: 0,
    errorMessage: undefined,
    conflict: undefined,
    // "Keep mine" — drop the base so the server accepts this device's values.
    base: item.status === "CONFLICT" ? undefined : item.base,
  });
  broadcastSyncQueueChanged();
}

/** Drop a failed or conflicting change and reload this event from the server. */
export async function discardSyncItem(id: number) {
  if (!db) return;
  await db.syncQueue.delete(id);
  broadcastSyncQueueChanged();
  postSyncMessage({ type: "RELOAD_FROM_SERVER" });
}

export async function retryAllFailed() {
  if (!db) return;
  const items = await db.syncQueue.where("status").equals("FAILED").toArray();
  await Promise.all(
    items.map((item) =>
      db!.syncQueue.update(item.id!, { status: "PENDING", retries: 0, errorMessage: undefined })
    )
  );
  broadcastSyncQueueChanged();
}

export async function countPendingWrites() {
  if (!db) return 0;
  return (await countQueue()).pending;
}

/** Wipes every local table — used on sign-out so another user on this device sees nothing. */
export async function clearLocalData() {
  if (!db) return;
  await Promise.all(db.tables.map((table) => table.clear()));
}
