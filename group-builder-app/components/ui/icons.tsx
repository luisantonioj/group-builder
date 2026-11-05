// Small shared inline icons. All decorative (aria-hidden): label the button that contains them.

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function WarningIcon({ size = 14, className, style }: IconProps) {
  return (
    <svg width={size} height={size} strokeWidth={2.25} className={className} style={{ flexShrink: 0, ...style }} {...base}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function EditIcon({ size = 14, className, style }: IconProps) {
  return (
    <svg width={size} height={size} strokeWidth={2} className={className} style={style} {...base}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export function GripIcon({ size = 14, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className} style={style}>
      <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

export function CollapseIcon({ collapsed, size = 14 }: { collapsed: boolean; size?: number }) {
  return (
    <svg width={size} height={size} strokeWidth={2.5} {...base}>
      {collapsed ? <polyline points="13 17 18 12 13 7" /> : <polyline points="11 17 6 12 11 7" />}
      {collapsed ? <polyline points="6 17 11 12 6 7" /> : <polyline points="18 17 13 12 18 7" />}
    </svg>
  );
}

export function BedIcon({ size = 14, className, style }: IconProps) {
  return (
    <svg width={size} height={size} strokeWidth={2} className={className} style={style} {...base}>
      <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
    </svg>
  );
}
