import { initials as getInitials } from "@/lib/utils";
import type { Gender } from "@/types";

interface InitialsProps {
  name: string;
  gender: Gender;
  size?: number;
  fontSize?: number;
}

export default function Initials({ name, gender, size = 32, fontSize = 12 }: InitialsProps) {
  return (
    <div
      className={`initials initials-${gender === "MALE" ? "male" : "female"}`}
      style={{ width: size, height: size, fontSize }}
    >
      {getInitials(name)}
    </div>
  );
}
