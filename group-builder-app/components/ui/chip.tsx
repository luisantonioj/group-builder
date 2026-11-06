import { cn } from "@/lib/utils";
import type { Gender } from "@/types";

type ChipKind = "default" | "male" | "female" | "mixed" | "danger" | "warning" | "success" | "accent" | "allergy";

interface ChipProps {
  children: React.ReactNode;
  kind?: ChipKind;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function Chip({ children, kind = "default", className, style, title }: ChipProps) {
  return (
    <span className={cn("chip", `chip-${kind}`, className)} style={style} title={title}>
      {children}
    </span>
  );
}

export function GenderChip({ gender }: { gender: Gender | "MIXED" }) {
  if (gender === "MIXED") return <Chip kind="mixed">⚥ Mixed</Chip>;
  return (
    <Chip kind={gender === "MALE" ? "male" : "female"}>
      {gender === "MALE" ? "♂ Male" : "♀ Female"}
    </Chip>
  );
}

/** Allergy flag. Long text is truncated to one line by default; hover shows the full text. */
export function AllergyBadge({ allergies, truncate = true }: { allergies: string; truncate?: boolean }) {
  return (
    <Chip kind="allergy" className={truncate ? "chip-truncate" : undefined} title={allergies}>
      <span aria-hidden="true">⚠</span>
      <span className="chip-text">
        <span className="sr-only">Allergies: </span>
        {allergies}
      </span>
    </Chip>
  );
}
