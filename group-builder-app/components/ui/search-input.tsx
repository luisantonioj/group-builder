import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Applied to the wrapper only. */
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  inputClassName,
  "aria-label": ariaLabel,
}: SearchInputProps) {
  return (
    <div className={cn("search-input", className)}>
      <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        className={cn("input", inputClassName)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
      />
    </div>
  );
}
