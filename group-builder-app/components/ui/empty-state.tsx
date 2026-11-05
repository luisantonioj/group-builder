import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  /** "card" renders inside its own card; "inline" is for use inside an existing container. */
  variant?: "card" | "inline";
  tone?: "default" | "success";
  className?: string;
  style?: React.CSSProperties;
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
  variant = "inline",
  tone = "default",
  className,
  style,
}: EmptyStateProps) {
  return (
    <div
      className={cn("empty-state", variant === "card" && "card empty-state-card", tone === "success" && "is-success", className)}
      style={style}
    >
      {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
