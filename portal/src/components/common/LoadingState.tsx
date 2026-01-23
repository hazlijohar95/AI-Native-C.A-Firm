import { Spinner } from "@/components/ui/spinner";

interface LoadingStateProps {
  /** Custom message to display below spinner */
  message?: string;
  /** Height class for the container */
  height?: "sm" | "md" | "lg" | "full";
}

const heightClasses = {
  sm: "h-32",
  md: "h-48",
  lg: "h-64",
  full: "h-full min-h-[400px]",
};

/**
 * Reusable loading state component for consistent loading UX across the app.
 * Use this when data is being fetched or when waiting for async operations.
 */
export function LoadingState({ message = "Loading...", height = "lg" }: LoadingStateProps) {
  return (
    <div
      className={`flex ${heightClasses[height]} items-center justify-center`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
