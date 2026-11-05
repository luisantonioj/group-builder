"use client";

import { forwardRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { WarningIcon } from "@/components/ui/icons";
import { cn, formatConnectionLabel } from "@/lib/utils";
import type { Conflict, Connection } from "@/types";

// Shared building blocks for the Group Formation and Room Assignment boards.

export interface ConflictItem {
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  type: string;
}

/** Group conflicts by their group/room id, labelled with the connection type. */
export function buildConflictMap(
  conflicts: Omit<Conflict, "id" | "createdAt">[],
  connections: Connection[],
  key: "groupId" | "roomId"
) {
  const labelByPair = new Map<string, string>();
  for (const conn of connections) {
    const [a, b] = [conn.fromId, conn.toId].sort();
    labelByPair.set(`${a}:${b}`, formatConnectionLabel(conn));
  }

  const map = new Map<string, ConflictItem[]>();
  for (const c of conflicts) {
    const containerId = c[key];
    if (!containerId) continue;
    const [a, b] = [c.candidateAId, c.candidateBId].sort();
    if (!map.has(containerId)) map.set(containerId, []);
    map.get(containerId)!.push({
      aId: c.candidateAId,
      bId: c.candidateBId,
      aName: c.candidateAName ?? c.candidateAId,
      bName: c.candidateBName ?? c.candidateBId,
      type: labelByPair.get(`${a}:${b}`) ?? "Connection",
    });
  }
  return map;
}

/** Drop target for un-assigning candidates (the left pool). */
export function PoolDropZone({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("pool-drop", isOver && "is-over", className)}>
      {children}
    </div>
  );
}

interface AssignmentCardProps {
  isOver?: boolean;
  hasConflicts?: boolean;
  isDragging?: boolean;
  style?: React.CSSProperties;
  header: React.ReactNode;
  subheader?: React.ReactNode;
  children: React.ReactNode;
  conflicts?: ConflictItem[];
}

/** Card shell for a group or room: header, optional sub-header, members, conflict list. */
export const AssignmentCard = forwardRef<HTMLDivElement, AssignmentCardProps>(function AssignmentCard(
  { isOver, hasConflicts, isDragging, style, header, subheader, children, conflicts },
  ref
) {
  return (
    <div
      ref={ref}
      style={style}
      className={cn("assign-card", isOver && "is-over", hasConflicts && "has-conflicts", isDragging && "is-dragging")}
    >
      <div className="assign-card-head">{header}</div>
      {subheader}
      <div className="assign-card-body">{children}</div>
      {conflicts && conflicts.length > 0 && <ConflictList items={conflicts} />}
    </div>
  );
});

export function DropHint() {
  return <div className="drop-hint">Drag candidates here</div>;
}

export function ConflictList({ items }: { items: ConflictItem[] }) {
  return (
    <ul className="conflict-list">
      {items.map((item) => (
        <li key={`${item.aId}:${item.bId}`} className="conflict-row">
          <WarningIcon size={11} />
          <strong>{item.aName}</strong>
          <span className="conflict-and">and</span>
          <strong>{item.bName}</strong>
          <span className="conflict-sep" aria-hidden="true">●</span>
          <span className="conflict-type">{item.type}</span>
        </li>
      ))}
    </ul>
  );
}

/** Red banner summarising all conflicts on a board. */
export function ConflictBanner({ count, noun }: { count: number; noun: "group" | "room" }) {
  if (count === 0) return null;
  return (
    <div className="conflict-banner" role="status">
      <WarningIcon />
      {count} conflict{count !== 1 ? "s" : ""} detected — connected candidates in the same {noun}.
    </div>
  );
}
