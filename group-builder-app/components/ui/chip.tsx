import { cn } from "@/lib/utils";
import type { Gender } from "@/types";

type ChipKind = "default" | "male" | "female" | "danger" | "warning" | "success" | "accent";

interface ChipProps {
  children: React.ReactNode;
  kind?: ChipKind;
  className?: string;
  style?: React.CSSProperties;
}

export function Chip({ children, kind = "default", className, style }: ChipProps) {
  return (
    <span className={cn("chip", `chip-${kind}`, className)} style={style}>
      {children}
    </span>
  );
}

export function GenderChip({ gender }: { gender: Gender }) {
  return (
    <Chip kind={gender === "MALE" ? "male" : "female"}>
      {gender === "MALE" ? "♂ Male" : "♀ Female"}
    </Chip>
  );
}

export function AllergyBadge({ allergies }: { allergies: string }) {
  return (
    <span
      className="chip"
      style={{
        background: "#fff7ed",
        color: "var(--color-allergy-badge)",
        border: "1px solid #fed7aa",
      }}
    >
      ⚠ {allergies}
    </span>
  );
}
