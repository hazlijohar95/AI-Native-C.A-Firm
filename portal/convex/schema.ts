import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // USERS & ORGANIZATIONS
  // ============================================

  // Users - synced from WorkOS
  users: defineTable({
    workosId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("client"), v.literal("staff")),
    organizationId: v.optional(v.id("organizations")),
    avatarUrl: v.optional(v.string()),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    // User deactivation
    isActive: v.optional(v.boolean()), // defaults to true if not set
    deactivatedAt: v.optional(v.number()),
    deactivatedBy: v.optional(v.id("users")),
    deactivationReason: v.optional(v.string()),
    // Onboarding
    onboardingCompleted: v.optional(v.boolean()),
    onboardingCompletedAt: v.optional(v.number()),
  })
    .index("by_workos_id", ["workosId"])
    .index("by_email", ["email"])
    .index("by_organization", ["organizationId"])
    .index("by_role", ["role"]),

  // Organizations (Client Companies)
  organizations: defineTable({
    name: v.string(),
    registrationNumber: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_email", ["email"]),

  // ============================================
  // DOCUMENTS
  // ============================================

  // Document folders
  folders: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_organization", ["organizationId"])
    .index("by_parent", ["parentId"]),

  // Documents
  documents: defineTable({
    organizationId: v.id("organizations"),
    folderId: v.optional(v.id("folders")),
    name: v.string(),
    type: v.string(), // MIME type
    size: v.number(), // bytes
    storageKey: v.string(), // R2 object key or Convex storage reference
    convexStorageId: v.optional(v.string()), // Convex storage ID if using fallback
    category: v.union(
      v.literal("tax_return"),
      v.literal("financial_statement"),
      v.literal("invoice"),
      v.literal("agreement"),
      v.literal("receipt"),
      v.literal("other")
    ),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_folder", ["folderId"])
    .index("by_category", ["organizationId", "category"])
    .index("by_uploaded_at", ["organizationId", "uploadedAt"]),

  // ============================================
  // TASKS
  // ============================================

  tasks: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    dueDate: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("users")),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_assigned", ["assignedTo"])
    .index("by_due_date", ["organizationId", "dueDate"]),

  // ============================================
  // ANNOUNCEMENTS
  // ============================================

  announcements: defineTable({
    title: v.string(),
    content: v.string(), // Markdown supported
    type: v.union(
      v.literal("general"),
      v.literal("tax_update"),
      v.literal("deadline"),
      v.literal("news")
    ),
    // null = visible to all, array = specific orgs only
    targetOrganizations: v.optional(v.array(v.id("organizations"))),
    publishedAt: v.number(),
    expiresAt: v.optional(v.number()),
    isPinned: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_published", ["publishedAt"])
    .index("by_pinned", ["isPinned", "publishedAt"]),

  // Track which users have read which announcements
  announcementReads: defineTable({
    announcementId: v.id("announcements"),
    userId: v.id("users"),
    readAt: v.number(),
  })
    .index("by_announcement", ["announcementId"])
    .index("by_user", ["userId"])
    .index("by_user_announcement", ["userId", "announcementId"]),

  // ============================================
  // NOTIFICATIONS
  // ============================================

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("new_document"),
      v.literal("new_task"),
      v.literal("task_due"),
      v.literal("task_completed"),
      v.literal("new_announcement"),
      v.literal("invoice_due"),
      v.literal("payment_received"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()), // In-app route
    relatedId: v.optional(v.string()), // Related document/task/etc ID
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_created", ["userId", "createdAt"]),

  // ============================================
  // ACTIVITY LOG (for dashboard feed)
  // ============================================

  activityLogs: defineTable({
    organizationId: v.optional(v.id("organizations")), // null for system-wide
    userId: v.id("users"),
    action: v.string(), // e.g., "uploaded_document", "completed_task"
    resourceType: v.string(), // e.g., "document", "task"
    resourceId: v.optional(v.string()),
    resourceName: v.optional(v.string()), // Human-readable name
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),

  // ============================================
  // INVOICES & PAYMENTS (Phase 3)
  // ============================================

  invoices: defineTable({
    organizationId: v.id("organizations"),
    invoiceNumber: v.string(), // e.g., "INV-2026-001"
    description: v.string(),
    amount: v.number(), // in cents (e.g., 10000 = RM100.00)
    currency: v.string(), // e.g., "MYR"
    status: v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled")
    ),
    dueDate: v.number(),
    issuedDate: v.number(),
    paidAt: v.optional(v.number()),
    // Line items stored as JSON
    lineItems: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(), // in cents
      amount: v.number(), // quantity * unitPrice
    })),
    // Stripe integration
    stripePaymentIntentId: v.optional(v.string()),
    stripeCheckoutSessionId: v.optional(v.string()),
    // PDF document reference
    documentStorageKey: v.optional(v.string()),
    // Metadata
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_due_date", ["organizationId", "dueDate"])
    .index("by_invoice_number", ["invoiceNumber"]),

  // Payment records (for history and reconciliation)
  payments: defineTable({
    invoiceId: v.id("invoices"),
    organizationId: v.id("organizations"),
    amount: v.number(), // in cents
    currency: v.string(),
    method: v.union(
      v.literal("stripe"),
      v.literal("bank_transfer"),
      v.literal("cash"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    reference: v.optional(v.string()), // bank reference, receipt number, etc.
    notes: v.optional(v.string()),
    paidAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_organization", ["organizationId"])
    .index("by_stripe_intent", ["stripePaymentIntentId"]),

  // ============================================
  // E-SIGNATURES (Phase 3)
  // ============================================

  // Documents requiring signature
  signatureRequests: defineTable({
    organizationId: v.id("organizations"),
    documentId: v.id("documents"), // Reference to the document to sign
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("signed"),
      v.literal("declined"),
      v.literal("expired")
    ),
    requestedBy: v.id("users"),
    requestedAt: v.number(),
    expiresAt: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    signedBy: v.optional(v.id("users")),
  })
    .index("by_organization", ["organizationId"])
    .index("by_document", ["documentId"])
    .index("by_status", ["organizationId", "status"]),

  // Signature records (the actual signatures)
  signatures: defineTable({
    signatureRequestId: v.id("signatureRequests"),
    userId: v.id("users"),
    // Signature data
    signatureType: v.union(
      v.literal("draw"), // Canvas drawing
      v.literal("type"), // Typed name
      v.literal("upload") // Uploaded image
    ),
    signatureData: v.string(), // Base64 image data or typed name
    // Legal metadata
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
    // Consent
    agreedToTerms: v.boolean(),
    legalName: v.string(), // Full legal name entered by signer
  })
    .index("by_request", ["signatureRequestId"])
    .index("by_user", ["userId"]),

  // ============================================
  // RATE LIMITING (Phase 5)
  // ============================================

  rateLimits: defineTable({
    key: v.string(), // Format: "userId:action"
    count: v.number(),
    windowStart: v.number(), // Timestamp when window started
  })
    .index("by_key", ["key"])
    .index("by_window_start", ["windowStart"]),
});
