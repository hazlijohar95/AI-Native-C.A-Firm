import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

// =============================================================================
// Invoice Status Badge
// =============================================================================

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

const invoiceStatusConfig: Record<InvoiceStatus, {
  label: string;
  variant: "secondary" | "warning" | "success" | "destructive";
  className?: string;
}> = {
  draft: { label: "Draft", variant: "secondary" },
  pending: { label: "Pending", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  overdue: { label: "Overdue", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "secondary", className: "text-muted-foreground" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = invoiceStatusConfig[status];
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

// =============================================================================
// User Status Badge
// =============================================================================

export function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "outline" : "destructive"}>
      {isActive ? "Active" : "Deactivated"}
    </Badge>
  );
}

// =============================================================================
// User Role Badge
// =============================================================================

export type UserRole = "admin" | "staff" | "client";

const roleConfig: Record<UserRole, {
  label: string;
  variant: "default" | "secondary" | "outline";
}> = {
  admin: { label: "Admin", variant: "default" },
  staff: { label: "Staff", variant: "secondary" },
  client: { label: "Client", variant: "outline" },
};

export function UserRoleBadge({ role }: { role: UserRole }) {
  const config = roleConfig[role];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// =============================================================================
// Task Priority Badge
// =============================================================================

export type TaskPriority = "low" | "medium" | "high" | "urgent";

const priorityConfig: Record<TaskPriority, {
  label: string;
  variant: "secondary" | "outline" | "warning" | "destructive";
}> = {
  low: { label: "Low", variant: "secondary" },
  medium: { label: "Medium", variant: "outline" },
  high: { label: "High", variant: "warning" },
  urgent: { label: "Urgent", variant: "destructive" },
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = priorityConfig[priority];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// =============================================================================
// Task Status Badge
// =============================================================================

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

const taskStatusConfig: Record<TaskStatus, {
  label: string;
  variant: "secondary" | "info" | "success" | "outline";
  icon?: typeof Clock;
}> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  in_progress: { label: "In Progress", variant: "info", icon: Clock },
  completed: { label: "Completed", variant: "success", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "outline", icon: XCircle },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = taskStatusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {config.label}
    </Badge>
  );
}

// =============================================================================
// Announcement Type Badge
// =============================================================================

export type AnnouncementType = "general" | "update" | "deadline";

const announcementTypeConfig: Record<AnnouncementType, {
  label: string;
  variant: "secondary" | "info" | "destructive";
}> = {
  general: { label: "General", variant: "secondary" },
  update: { label: "Update", variant: "info" },
  deadline: { label: "Deadline", variant: "destructive" },
};

export function AnnouncementTypeBadge({ type }: { type: AnnouncementType }) {
  const config = announcementTypeConfig[type];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// =============================================================================
// Signature Status Badge
// =============================================================================

export type SignatureStatus = "pending" | "signed" | "expired" | "cancelled";

const signatureStatusConfig: Record<SignatureStatus, {
  label: string;
  variant: "warning" | "success" | "secondary" | "outline";
  icon?: typeof Clock;
}> = {
  pending: { label: "Pending", variant: "warning", icon: AlertCircle },
  signed: { label: "Signed", variant: "success", icon: CheckCircle2 },
  expired: { label: "Expired", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "outline", icon: XCircle },
};

export function SignatureStatusBadge({ status }: { status: SignatureStatus }) {
  const config = signatureStatusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {config.label}
    </Badge>
  );
}

// =============================================================================
// Document Category Badge
// =============================================================================

export type DocumentCategory = "financial" | "tax" | "legal" | "report" | "other";

const documentCategoryConfig: Record<DocumentCategory, {
  label: string;
  variant: "default" | "info" | "warning" | "secondary" | "outline";
}> = {
  financial: { label: "Financial", variant: "default" },
  tax: { label: "Tax", variant: "info" },
  legal: { label: "Legal", variant: "warning" },
  report: { label: "Report", variant: "secondary" },
  other: { label: "Other", variant: "outline" },
};

export function DocumentCategoryBadge({ category }: { category: DocumentCategory }) {
  const config = documentCategoryConfig[category] || documentCategoryConfig.other;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// =============================================================================
// Activity Action Badge (for activity logs)
// =============================================================================

export type ActivityAction = "created" | "updated" | "deleted" | "viewed" | "downloaded" | "signed" | "completed";

export function ActivityActionBadge({ action }: { action: string }) {
  if (action.includes("deleted") || action.includes("removed")) {
    return <Badge variant="destructive" className="text-xs">Removed</Badge>;
  }
  if (action.includes("created") || action.includes("added")) {
    return <Badge variant="success" className="text-xs">Created</Badge>;
  }
  if (action.includes("completed") || action.includes("signed")) {
    return <Badge variant="success" className="text-xs">Completed</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">Action</Badge>;
}

// =============================================================================
// Payment Status Badge
// =============================================================================

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

const paymentStatusConfig: Record<PaymentStatus, {
  label: string;
  variant: "warning" | "success" | "destructive" | "secondary";
}> = {
  pending: { label: "Pending", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "secondary" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status] || paymentStatusConfig.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
