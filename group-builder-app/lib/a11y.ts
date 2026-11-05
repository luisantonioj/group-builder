import type { KeyboardEvent } from "react";

/** Keyboard activation (Enter/Space) for an element that already has its own role, e.g. a table row. */
export function keyActivate(onActivate: () => void) {
  return {
    tabIndex: 0,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

/** Makes a non-button element (div, span, svg <g>) behave like a button for keyboard and screen readers. */
export function pressable(onActivate: () => void, label?: string) {
  return {
    role: "button" as const,
    "aria-label": label,
    onClick: onActivate,
    ...keyActivate(onActivate),
  };
}
