/**
 * Shared type definitions used across the portal.
 * Import from '@/types/shared' to use these types.
 */

// =============================================================================
// Status Types
// =============================================================================

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type SignatureStatus = "pending" | "signed" | "declined" | "expired";
export type UserRole = "admin" | "staff" | "client";
export type DocumentCategory =
  | "tax_return"
  | "financial_statement"
  | "invoice"
  | "receipt"
  | "contract"
  | "other";
export type AnnouncementType = "general" | "tax_update" | "deadline" | "news";

// =============================================================================
// Filter Types
// =============================================================================

export interface FilterOption<T = string> {
  value: T;
  label: string;
}

// Status filter options (includes "all")
export type StatusFilter<T extends string> = T | "all";

// =============================================================================
// Common Entity Shapes (for components that don't need full Convex types)
// =============================================================================

export interface BaseEntity {
  _id: string;
  _creationTime: number;
}

export interface WithOrganization {
  organizationId?: string;
  organizationName?: string;
}

export interface WithUser {
  userId?: string;
  userName?: string;
}

// =============================================================================
// Form Types
// =============================================================================

export interface FormFieldError {
  field: string;
  message: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/** Make specific fields optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specific fields required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Extract the array element type */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;
