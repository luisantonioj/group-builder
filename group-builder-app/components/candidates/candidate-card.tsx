"use client";

import { useDraggable } from "@dnd-kit/core";
import Initials from "@/components/ui/initials";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/types";

export function formatAge(age: number | null | undefined) {
  return age != null ? `Age ${age}` : "Age —";
}

interface CandidateCardBodyProps {
  candidate: Candidate;
  /** "pool" = roomy card in the left pool; "member" = compact row inside a group/room. */
  variant?: "pool" | "member";
  meta?: React.ReactNode;
  isConflict?: boolean;
  trailing?: React.ReactNode;
}

function CardBody({ candidate: c, variant = "pool", meta, isConflict, trailing }: CandidateCardBodyProps) {
  return (
    <>
      <Initials name={c.fullName} gender={c.gender} size={variant === "member" ? "sm" : "md"} />
      <div className="cand-text">
        <div className="cand-name">
          {c.fullName}
          {isConflict && <span aria-label="has a conflict"> ⚠</span>}
        </div>
        {meta && <div className="cand-meta">{meta}</div>}
      </div>
      {trailing}
    </>
  );
}

function cardClass(c: Candidate, variant: "pool" | "member", isConflict?: boolean, extra?: string) {
  return cn(
    "cand-card",
    variant === "member" && "cand-card--member",
    !c.isConfirmed && "is-unconfirmed",
    isConflict && "is-conflict",
    extra
  );
}

/** A candidate that can be dragged between the pool and groups/rooms. */
export function DraggableCandidate(props: CandidateCardBodyProps) {
  const { candidate: c, variant = "pool", isConflict } = props;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`${c.fullName}${c.isConfirmed ? "" : " (unconfirmed)"}`}
      title={c.isConfirmed ? undefined : "Unconfirmed"}
      className={cardClass(c, variant, isConflict, isDragging ? "is-dragging" : undefined)}
    >
      <CardBody {...props} />
    </div>
  );
}

/** The floating copy shown under the pointer while dragging. */
export function DragOverlayCard({ candidate, meta }: { candidate: Candidate; meta?: React.ReactNode }) {
  return (
    <div className={cardClass(candidate, "pool", false, "is-overlay")}>
      <CardBody candidate={candidate} meta={meta} />
    </div>
  );
}

/** Presence checkbox with a 32px hit area that never starts a drag. */
export function PresenceToggle({
  name,
  checked,
  onChange,
}: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className="presence-toggle"
      title={checked ? "Present" : "Not yet present"}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={`Mark ${name} present`}
      />
    </label>
  );
}

/** Small legend explaining the dashed (unconfirmed) card style. */
export function UnconfirmedLegend() {
  return (
    <div className="cand-legend">
      <span className="cand-legend-swatch" aria-hidden="true" />
      Dashed = unconfirmed
    </div>
  );
}
