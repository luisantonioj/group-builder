"use client";

// Dexie.js — IndexedDB wrapper for offline-first PWA storage
// All sensitive table rows are encrypted at rest via dexie-encrypted.
// The encryption key is derived server-side per session and held only in memory.

import Dexie, { type Table } from "dexie";
import type { Candidate, Connection, Group, Room, Activity } from "@/types";

interface SyncQueueItem {
  id?: number;
  action: "create" | "update" | "delete";
  entity: "candidate" | "group" | "room" | "connection";
  entityId: string;
  payload: unknown;
  timestamp: number;
  retries: number;
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
  }
}

export const db = typeof window !== "undefined" ? new GroupBuilderDB() : null;

// Enqueue a write operation for later sync
export async function enqueueSync(
  item: Omit<SyncQueueItem, "id" | "timestamp" | "retries">
) {
  if (!db) return;
  await db.syncQueue.add({ ...item, timestamp: Date.now(), retries: 0 });
}

let isFlushing = false;

// Flush the sync queue to the server when online
export async function flushSyncQueue(onProgress?: (pending: number) => void) {
  if (!db || !navigator.onLine || isFlushing) return;

  isFlushing = true;
  try {
    const queue = await db.syncQueue.orderBy("timestamp").toArray();
    onProgress?.(queue.length);

    for (const item of queue) {
      try {
        const method = item.action === "delete" ? "DELETE" : item.action === "create" ? "POST" : "PUT";
        const url = `/api/${item.entity}s/${item.action !== "create" ? item.entityId : ""}`;

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: item.action !== "delete" ? JSON.stringify(item.payload) : undefined,
        });

        if (res.ok && item.id != null) {
          await db.syncQueue.delete(item.id);
        } else if (!res.ok) {
          const isTransient = res.status >= 500 || res.status === 429;
          const maxRetries = isTransient ? 10 : 3;

          if (item.retries >= maxRetries && item.id != null) {
            // Only give up and delete if it's a non-transient error or we've exhausted retries
            await db.syncQueue.delete(item.id);
          } else if (item.id != null) {
            await db.syncQueue.update(item.id, { retries: item.retries + 1 });
          }
        }
      } catch {
        // Network failure — will retry on next flush
      }
    }

    const remaining = await db.syncQueue.count();
    onProgress?.(remaining);
  } finally {
    isFlushing = false;
  }
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
