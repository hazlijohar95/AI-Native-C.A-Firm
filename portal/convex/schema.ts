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
    role: v.union(v.literal("admin"), v.literal("client"), v.literal("staff")),
    organizationId: v.optional(v.id("organizations")),
    avatarUrl: v.optional(v.string()),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_workos_id", ["workosId"])
    .index("by_email", ["email"])
    .index("by_organization", ["organizationId"]),

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
    storageKey: v.string(), // R2 object key
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
});
