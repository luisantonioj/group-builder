import { NextResponse } from "next/server";

// Field-level optimistic concurrency for offline sync.
// Clients send `_base`: the value they last saw for each field they changed.
// If the server's current value differs from that base (and from the new value),
// someone else changed the same field in the meantime: that's a conflict.
// Edits to *different* fields never conflict, because clients only send changed fields.

function normalize(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function splitBase(raw: Record<string, any>) {
  const { _base, ...rest } = raw;
  const base = _base && typeof _base === "object" ? (_base as Record<string, unknown>) : null;
  return { base, body: rest };
}

export function findConflictingFields(
  existing: Record<string, unknown>,
  body: Record<string, unknown>,
  base: Record<string, unknown> | null
) {
  if (!base) return [];
  return Object.keys(base).filter((field) => {
    if (!(field in body)) return false;
    const server = normalize(existing[field]);
    return server !== normalize(base[field]) && server !== normalize(body[field]);
  });
}

export function conflictResponse(fields: string[], server: Record<string, unknown>) {
  return NextResponse.json(
    { error: `Changed by someone else: ${fields.join(", ")}`, conflict: { fields, server } },
    { status: 409 }
  );
}
