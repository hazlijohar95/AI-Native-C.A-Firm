import { Input } from "@/components/ui/input";
import { Search } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Width constraint */
  maxWidth?: "sm" | "md" | "lg" | "full";
}

const maxWidthClasses = {
  sm: "max-w-xs",
  md: "max-w-md",
  lg: "max-w-lg",
  full: "w-full",
};

/**
 * Reusable search input with icon.
 * Use this for consistent search UX across list pages.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  maxWidth = "md",
}: SearchInputProps) {
  return (
    <div className={cn("relative", maxWidthClasses[maxWidth], className)}>
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
        aria-label={placeholder}
      />
    </div>
  );
}
