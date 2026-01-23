import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  /** Icon component to display */
  icon: React.ComponentType<{ className?: string }>;
  /** Main title text */
  title: string;
  /** Description text below the title */
  description: string;
  /** Optional action button or element */
  action?: React.ReactNode;
  /** Whether to wrap in a Card component */
  withCard?: boolean;
  /** Height class for the container */
  height?: "sm" | "md" | "lg";
}

const heightClasses = {
  sm: "h-32",
  md: "h-48",
  lg: "h-64",
};

/**
 * Reusable empty state component for when lists/data are empty.
 * Provides consistent UX with icon, title, description, and optional action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  withCard = true,
  height = "lg",
}: EmptyStateProps) {
  const content = (
    <div className={`flex ${heightClasses[height]} flex-col items-center justify-center text-center px-4`}>
      <Icon className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );

  if (withCard) {
    return (
      <Card>
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  }

  return content;
}
