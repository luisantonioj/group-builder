"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const kindStyles: Record<ToastKind, { bg: string; border: string; color: string }> = {
    success: { bg: "#f0fdf4", border: "#bbf7d0", color: "var(--color-success)" },
    error:   { bg: "var(--color-conflict-bg)", border: "var(--color-conflict-border)", color: "var(--color-danger)" },
    warning: { bg: "#fffbeb", border: "#fde68a", color: "var(--color-warning)" },
    info:    { bg: "var(--bg-selected)", border: "var(--border-focus)", color: "var(--color-primary)" },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "calc(28px + var(--space-lg))",
          right: "var(--space-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-sm)",
          zIndex: 200,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const s = kindStyles[t.kind];
          return (
            <div
              key={t.id}
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                color: s.color,
                borderRadius: "var(--radius-md)",
                padding: "10px 16px",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                boxShadow: "var(--shadow-md)",
                maxWidth: 360,
                pointerEvents: "auto",
              }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
