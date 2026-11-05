import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: React.ReactNode }[];
  /** Accessible name for the group, e.g. "Filter by gender". */
  label: string;
  /** Stretch segments to fill the available width. */
  fill?: boolean;
  className?: string;
}

export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  fill,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("segmented", fill && "segmented-fill", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          className={cn("segmented-option", value === opt.value && "active")}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
