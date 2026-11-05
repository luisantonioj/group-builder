import { initials as getInitials } from "@/lib/utils";
import type { Gender } from "@/types";

export type AvatarSize = "sm" | "md" | "lg";

interface InitialsProps {
  name: string;
  gender: Gender;
  /** sm 22px (member rows, tables) · md 28px (cards, lists) · lg 32px (headers, modals) */
  size?: AvatarSize;
}

// Decorative: the full name is always rendered next to the avatar.
export default function Initials({ name, gender, size = "md" }: InitialsProps) {
  return (
    <div
      className={`initials initials-${size} initials-${gender === "MALE" ? "male" : "female"}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
