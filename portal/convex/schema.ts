import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // SERVICE TYPES & SUBSCRIPTIONS
  // ============================================

  // Master list of available services (Accounting, Advisory, Taxation, etc.)
  serviceTypes: defineTable({
    code: v.string(), // "accounting", "taxation", "advisory", "cosec", "payroll"
    name: v.string(), // Display name
    description: v.optional(v.string()),
    icon: v.string(), // Lucide icon name
    color: v.string(), // Tailwind color: "blue", "emerald", etc.
    displayOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive", "displayOrder"]),

  // Track which services each organization subscribes to
  clientSubscriptions: defineTable({
    organizationId: v.id("organizations"),
    serviceTypeId: v.id("serviceTypes"),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending")
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_service", ["serviceTypeId"]),

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
    // Email Preferences (defaults to true if not set)
    emailPreferences: v.optional(v.object({
      documentRequests: v.optional(v.boolean()),
      taskAssignments: v.optional(v.boolean()),
      taskComments: v.optional(v.boolean()),
      invoices: v.optional(v.boolean()),
      signatures: v.optional(v.boolean()),
      announcements: v.optional(v.boolean()),
    })),
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

  // Document folders (2 levels max: Service → Folder → Documents)
  folders: defineTable({
    organizationId: v.id("organizations"),
    serviceTypeId: v.optional(v.id("serviceTypes")), // Associate folder with service
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()), // For visual distinction
    parentId: v.optional(v.id("folders")), // Exists but we enforce 2-level max in mutations
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_organization", ["organizationId"])
    .index("by_parent", ["parentId"])
    .index("by_service", ["organizationId", "serviceTypeId"]),

  // Documents
  documents: defineTable({
    organizationId: v.id("organizations"),
    folderId: v.optional(v.id("folders")),
    serviceTypeId: v.optional(v.id("serviceTypes")), // Associate document with service
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
    // Enhanced metadata
    description: v.optional(v.string()),
    fiscalYear: v.optional(v.string()), // "2025", "2024"
    fiscalPeriod: v.optional(v.string()), // "Q1", "Jan", etc.
    expiresAt: v.optional(v.number()), // For auto-archival
    currentVersion: v.optional(v.number()), // Latest version number
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_folder", ["folderId"])
    .index("by_category", ["organizationId", "category"])
    .index("by_uploaded_at", ["organizationId", "uploadedAt"])
    .index("by_service", ["organizationId", "serviceTypeId"])
    .index("by_fiscal_year", ["organizationId", "fiscalYear"]),

  // Document tags for flexible categorization
  documentTags: defineTable({
    documentId: v.id("documents"),
    tag: v.string(), // Normalized tag (lowercase, trimmed)
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_document", ["documentId"])
    .index("by_tag", ["tag"]),

  // Document version history for audit trail
  documentVersions: defineTable({
    documentId: v.id("documents"),
    version: v.number(), // 1, 2, 3...
    storageKey: v.string(),
    convexStorageId: v.optional(v.string()),
    size: v.number(),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    changeNote: v.optional(v.string()),
  })
    .index("by_document", ["documentId"])
    .index("by_document_version", ["documentId", "version"]),

  // Document access logs for tracking downloads/views
  documentAccessLogs: defineTable({
    documentId: v.id("documents"),
    userId: v.id("users"),
    action: v.union(
      v.literal("view"),
      v.literal("download"),
      v.literal("preview")
    ),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_document", ["documentId", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),

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
    // === REMINDER TRACKING ===
    remindersSent: v.optional(v.object({
      sevenDays: v.optional(v.number()),   // timestamp when sent
      threeDays: v.optional(v.number()),
      oneDay: v.optional(v.number()),
      onDue: v.optional(v.number()),
      overdue: v.optional(v.array(v.number())), // array of overdue reminder timestamps
    })),
    escalatedAt: v.optional(v.number()),  // when staff was notified
    escalatedTo: v.optional(v.id("users")), // which staff member
    // === CLIENT REQUESTS ===
    isClientRequest: v.optional(v.boolean()),
    requestStatus: v.optional(v.union(
      v.literal("pending_approval"),
      v.literal("approved"),
      v.literal("rejected")
    )),
    requestedBy: v.optional(v.id("users")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    // === RECURRING TASKS ===
    generatedFromTemplate: v.optional(v.id("taskTemplates")),
    generatedFromSubscription: v.optional(v.id("organizationTemplates")),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_assigned", ["assignedTo"])
    .index("by_due_date", ["organizationId", "dueDate"])
    .index("by_escalated", ["escalatedAt"])
    .index("by_request_status", ["organizationId", "isClientRequest", "requestStatus"]),

  // Task templates for recurring workflows
  taskTemplates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("tax"),
      v.literal("bookkeeping"),
      v.literal("compliance"),
      v.literal("advisory"),
      v.literal("onboarding")
    ),
    recurrence: v.object({
      frequency: v.union(
        v.literal("monthly"),
        v.literal("quarterly"),
        v.literal("yearly")
      ),
      dayOfMonth: v.optional(v.number()), // 1-28 for monthly
      monthOfYear: v.optional(v.number()), // 1-12 for yearly
      quarterMonth: v.optional(v.number()), // 1, 2, or 3 (month within quarter)
    }),
    taskDefaults: v.object({
      title: v.string(),
      description: v.optional(v.string()),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      dueDaysAfterGeneration: v.number(), // e.g., 14 days to complete
    }),
    isActive: v.boolean(),
    isBuiltIn: v.boolean(), // true for pre-built templates
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // Link organizations to templates they subscribe to
  organizationTemplates: defineTable({
    organizationId: v.id("organizations"),
    templateId: v.id("taskTemplates"),
    isActive: v.boolean(),
    lastGeneratedAt: v.optional(v.number()),
    nextGenerationAt: v.optional(v.number()),
    customTitle: v.optional(v.string()), // override template title
    customDescription: v.optional(v.string()),
    assignToUserId: v.optional(v.id("users")), // auto-assign to this user
  })
    .index("by_organization", ["organizationId"])
    .index("by_template", ["templateId"])
    .index("by_next_generation", ["nextGenerationAt"]),

  // ============================================
  // ANNOUNCEMENTS
  // ============================================

  announcements: defineTable({
    title: v.string(),
    content: v.string(), // Markdown supported
    type: v.union(
      v.literal("general"),       // Blue - general updates
      v.literal("tax_deadline"),  // Red - urgent tax dates
      v.literal("regulatory"),    // Amber - compliance changes
      v.literal("firm_news"),     // Purple - firm updates
      v.literal("maintenance"),   // Gray - system updates
      v.literal("tip")            // Green - helpful tips
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
      v.literal("task_reminder"),      // Reminder before due date
      v.literal("task_overdue"),       // Task is past due
      v.literal("task_escalated"),     // Escalated to staff
      v.literal("task_request"),       // Client submitted request
      v.literal("task_request_approved"), // Request was approved
      v.literal("task_request_rejected"), // Request was rejected
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
    // Payment reminder tracking
    remindersSent: v.optional(v.object({
      beforeDue: v.optional(v.number()),   // Sent 3 days before due date
      oneDayOverdue: v.optional(v.number()), // Sent 1 day after due date
      weeklyOverdue: v.optional(v.array(v.number())), // Weekly overdue reminders
    })),
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
    // Document integrity verification
    documentHash: v.optional(v.string()), // SHA-256 hash of document at time of request
    signedDocumentHash: v.optional(v.string()), // SHA-256 hash verified at signing
    // Multi-party signature support
    signerCount: v.optional(v.number()), // Total number of signers required
    completedCount: v.optional(v.number()), // Number of signers who have signed
    requireAll: v.optional(v.boolean()), // True = all must sign, false = any can sign
    requireSequential: v.optional(v.boolean()), // True = must sign in order
  })
    .index("by_organization", ["organizationId"])
    .index("by_document", ["documentId"])
    .index("by_status", ["organizationId", "status"]),

  // Individual signers for multi-party signature requests
  signatureRequestSigners: defineTable({
    signatureRequestId: v.id("signatureRequests"),
    userId: v.optional(v.id("users")), // Optional - may be external signer
    email: v.string(),
    name: v.string(),
    sequence: v.number(), // Order in signing sequence (1, 2, 3...)
    status: v.union(
      v.literal("pending"),
      v.literal("signed"),
      v.literal("declined")
    ),
    signedAt: v.optional(v.number()),
    notifiedAt: v.optional(v.number()),
  })
    .index("by_request", ["signatureRequestId"])
    .index("by_user", ["userId"])
    .index("by_request_sequence", ["signatureRequestId", "sequence"]),

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
  // DOCUMENT REQUESTS
  // ============================================

  // Admin requests specific documents from clients
  documentRequests: defineTable({
    organizationId: v.id("organizations"),
    clientId: v.id("users"), // The client user who should upload
    requestedBy: v.id("users"), // Admin/staff who made the request
    title: v.string(), // e.g., "Bank statements for Q4 2025"
    description: v.optional(v.string()), // Detailed instructions
    category: v.union(
      v.literal("tax_return"),
      v.literal("financial_statement"),
      v.literal("invoice"),
      v.literal("agreement"),
      v.literal("receipt"),
      v.literal("other")
    ),
    dueDate: v.optional(v.number()),
    status: v.union(
      v.literal("pending"), // Waiting for client to upload
      v.literal("uploaded"), // Client uploaded, awaiting review
      v.literal("reviewed"), // Admin reviewed and accepted
      v.literal("rejected") // Admin rejected, needs re-upload
    ),
    documentId: v.optional(v.id("documents")), // Linked document once uploaded
    reviewNote: v.optional(v.string()), // Admin note on rejection/review
    createdAt: v.number(),
    uploadedAt: v.optional(v.number()),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_client", ["clientId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_document", ["documentId"]),

  // ============================================
  // TASK COMMENTS
  // ============================================

  // Comments/discussion on tasks
  taskComments: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_task", ["taskId"])
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

  // ============================================
  // COUNTERS (for atomic sequential IDs)
  // ============================================

  counters: defineTable({
    name: v.string(), // e.g., "invoice_2026"
    value: v.number(),
  })
    .index("by_name", ["name"]),
});
