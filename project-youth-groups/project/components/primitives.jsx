// Shared UI primitives
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const Card = ({ title, sub, action, children, padded = true, className = "" }) => (
  <div className={"card " + className}>
    {(title || action) && (
      <div className="card-head">
        <div>
          {title && <h3>{title}</h3>}
          {sub && <div className="card-sub">{sub}</div>}
        </div>
        {action && <div style={{marginLeft: 'auto'}}>{action}</div>}
      </div>
    )}
    <div className={padded ? "card-pad" : ""}>{children}</div>
  </div>
);

const Chip = ({ kind = "default", children, style = {} }) => {
  const cls = {
    default: "chip", male: "chip chip-male", female: "chip chip-female",
    warn: "chip chip-warn", danger: "chip chip-danger", ok: "chip chip-ok",
    accent: "chip chip-accent",
  }[kind] || "chip";
  return <span className={cls} style={style}>{children}</span>;
};

const GenderChip = ({ g }) => g === "M"
  ? <Chip kind="male">♂ Male</Chip>
  : <Chip kind="female">♀ Female</Chip>;

const SearchInput = ({ value, onChange, placeholder = "Search…" }) => (
  <div className="search-wrap" style={{maxWidth: 300}}>
    <Icon name="search" size={15} className="search-icon" />
    <input className="search-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

const Modal = ({ open, onClose, title, children, footer, maxWidth = 640 }) => {
  useEffect(() => {
    if (!open) return;
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{maxWidth}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="close" onClick={onClose}><Icon name="close" size={16}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
};

// Compute initials avatar
const Initials = ({ first, last, size = 32, gender }) => {
  const init = (first?.[0] || '') + (last?.[0] || '');
  const bg = gender === 'M'
    ? 'linear-gradient(135deg, #93c5fd 0%, #2563eb 100%)'
    : 'linear-gradient(135deg, #fbcfe8 0%, #db2777 100%)';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700,
      flexShrink: 0,
      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.05)',
    }}>{init}</div>
  );
};

// Donut chart — simple SVG
const Donut = ({ data, size = 140, thickness = 22 }) => {
  const r = size/2 - thickness/2 - 1;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eef1f6" strokeWidth={thickness}/>
      {data.map((d, i) => {
        const len = (d.value / total) * c;
        const dash = `${len} ${c - len}`;
        const off = c - acc;
        acc += len;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r}
            fill="none" stroke={d.color} strokeWidth={thickness}
            strokeDasharray={dash} strokeDashoffset={off}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
};

// Bar chart
const SimpleBars = ({ data, height = 90, color = "#2e86c1" }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '4px 0'}}>
      {data.map((d, i) => (
        <div key={i} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
          <div title={`${d.label}: ${d.value}`} style={{
            width: '100%', height: `${(d.value/max)*100}%`,
            background: color, borderRadius: '4px 4px 2px 2px', minHeight: 3,
            transition: 'height 0.3s',
          }}/>
          <div style={{fontSize: 10, color: 'var(--muted)', fontWeight: 600}}>{d.label}</div>
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { Card, Chip, GenderChip, SearchInput, Modal, Initials, Donut, SimpleBars });
