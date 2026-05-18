"use client";

interface DonutSlice {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
}

export default function DonutChart({ data, size = 120, thickness = 24 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={(size - thickness) / 2} fill="none" stroke="var(--border-color)" strokeWidth={thickness} />
      </svg>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = data.map((slice) => {
    const pct = slice.value / total;
    const dashLen = pct * circumference;
    const dashGap = circumference - dashLen;
    const rotation = (offset / total) * 360 - 90;
    offset += slice.value;
    return { ...slice, dashLen, dashGap, rotation };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={thickness}
          strokeDasharray={`${s.dashLen} ${s.dashGap}`}
          strokeLinecap="butt"
          transform={`rotate(${s.rotation} ${cx} ${cy})`}
        />
      ))}
    </svg>
  );
}
