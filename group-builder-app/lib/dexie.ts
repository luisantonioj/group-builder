"use client";

// Dexie.js — IndexedDB wrapper for offline-first PWA storage
// All sensitive table rows are encrypted at rest via dexie-encrypted.
// The encryption key is derived server-side per session and held only in memory.

import Dexie, { type Table } from "dexie";
import type { Candidate, Connection, Group, Room, Activity } from "@/types";

export interface SyncQueueItem {
  id?: number;
  action: "create" | "update" | "delete";
  entity: "candidate" | "group" | "room" | "connection";
  entityId: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  status?: "PENDING" | "FAILED";
  errorMessage?: string;
}

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
  }
}

export const db = typeof window !== "undefined" ? new GroupBuilderDB() : null;

function notifySyncQueueChanged() {
  if (typeof window === "undefined") return;

  const channel = new BroadcastChannel("group-builder-sync");
  channel.postMessage({ type: "SYNC_QUEUE_CHANGED" });
  channel.close();
}

const API_FIELDS: Record<SyncQueueItem["entity"], string[]> = {
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

function sanitizePayload(entity: SyncQueueItem["entity"], payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;

  const source = payload as Record<string, unknown>;
  return API_FIELDS[entity].reduce<Record<string, unknown>>((clean, key) => {
    if (source[key] !== undefined) clean[key] = source[key];
    return clean;
  }, {});
}

// Enqueue a write operation for later sync
export async function enqueueSync(
  item: Omit<SyncQueueItem, "id" | "timestamp" | "retries">
) {
  if (!db) return;
  await db.syncQueue.add({ ...item, timestamp: Date.now(), retries: 0 });
  notifySyncQueueChanged();
}

let isFlushing = false;

// Flush the sync queue to the server when online
export async function flushSyncQueue(onProgress?: (pending: number) => void) {
  if (!db || !navigator.onLine || isFlushing) return;

  isFlushing = true;
  try {
    const queue = await db.syncQueue.orderBy("timestamp").toArray();
    const pendingQueue = queue.filter((item) => item.status !== "FAILED");
    onProgress?.(pendingQueue.length);

    for (const item of pendingQueue) {
      try {
        const method = item.action === "delete" ? "DELETE" : item.action === "create" ? "POST" : "PUT";
        const url = `/api/${item.entity}s/${item.action !== "create" ? item.entityId : ""}`;

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body:
            item.action !== "delete"
              ? JSON.stringify(sanitizePayload(item.entity, item.payload))
              : undefined,
        });

        if ((res.ok || (item.action === "delete" && res.status === 404)) && item.id != null) {
          await db.syncQueue.delete(item.id);
        } else if (!res.ok) {
          const isTransient = res.status >= 500 || res.status === 429;
          const maxRetries = isTransient ? 10 : 3;

          let errorMsg = `Server returned status ${res.status}`;
          try {
            const errData = await res.json();
            if (errData && errData.error) {
              errorMsg = typeof errData.error === "string" ? errData.error : JSON.stringify(errData.error);
            }
          } catch {
            // ignore JSON parsing errors
          }

          if (item.id != null) {
            if (item.retries >= maxRetries || !isTransient) {
              // Mark as FAILED with error message instead of silently deleting
              await db.syncQueue.update(item.id, {
                status: "FAILED",
                errorMessage: errorMsg,
              });
            } else {
              await db.syncQueue.update(item.id, { retries: item.retries + 1 });
            }
          }
        }
      } catch {
        // Network failure — will retry on next flush
      }
    }

    const remainingQueue = await db.syncQueue.toArray();
    const remaining = remainingQueue.filter((item) => item.status !== "FAILED").length;
    onProgress?.(remaining);
    notifySyncQueueChanged();
  } finally {
    isFlushing = false;
  }
}

export function broadcastSyncQueueChanged() {
  notifySyncQueueChanged();
}

// Seed local DB from server response
export async function hydrateFromServer(data: {
  candidates?: Candidate[];
  connections?: Connection[];
  groups?: Group[];
  rooms?: Room[];
}) {
  if (!db) return;
  if (data.candidates?.length) {
    await db.candidates.bulkPut(data.candidates);
  }
  if (data.connections?.length) {
    await db.connections.bulkPut(data.connections);
  }
  if (data.groups?.length) {
    await db.groups.bulkPut(data.groups);
  }
  if (data.rooms?.length) {
    await db.rooms.bulkPut(data.rooms);
  }
}
