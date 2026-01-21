import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

// Document categories for filtering
export const categories = [
  { value: "tax_return", label: "Tax Returns" },
  { value: "financial_statement", label: "Financial Statements" },
  { value: "invoice", label: "Invoices" },
  { value: "agreement", label: "Agreements" },
  { value: "receipt", label: "Receipts" },
  { value: "other", label: "Other" },
] as const;

// ============================================
// QUERIES
// ============================================

// List documents for current user's organization
export const list = query({
  args: {
    category: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Admin/staff can see all, clients only see their org
    if (user.role === "client" && !user.organizationId) {
      return [];
    }

    let docsQuery;
    
    if (user.role === "admin" || user.role === "staff") {
      // Admin/staff see all documents (later can filter by org)
      docsQuery = ctx.db.query("documents");
    } else {
      // Clients only see their organization's documents
      docsQuery = ctx.db
        .query("documents")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!));
    }

    let docs = await docsQuery.collect();

    // Filter out deleted
    docs = docs.filter((d) => !d.isDeleted);

    // Filter by category if specified
    if (args.category) {
      docs = docs.filter((d) => d.category === args.category);
    }

    // Filter by folder if specified
    if (args.folderId !== undefined) {
      docs = docs.filter((d) => d.folderId === args.folderId);
    }

    // Sort by upload date descending
    docs.sort((a, b) => b.uploadedAt - a.uploadedAt);

    return docs;
  },
});

// Get single document
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);

    if (!doc || doc.isDeleted) {
      return null;
    }

    // Check access
    if (user.role === "client") {
      if (doc.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    return doc;
  },
});

// Count documents for dashboard
export const count = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    if (user.role === "client" && !user.organizationId) {
      return 0;
    }

    let docs;
    if (user.role === "admin" || user.role === "staff") {
      docs = await ctx.db.query("documents").collect();
    } else {
      docs = await ctx.db
        .query("documents")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
    }

    return docs.filter((d) => !d.isDeleted).length;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Create document record (after successful upload)
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageKey: v.string(),
    convexStorageId: v.optional(v.string()), // For Convex storage fallback
    category: v.union(
      v.literal("tax_return"),
      v.literal("financial_statement"),
      v.literal("invoice"),
      v.literal("agreement"),
      v.literal("receipt"),
      v.literal("other")
    ),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Validate organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Verify user has access to this organization
    if (user.role === "client") {
      if (args.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Validate folder if provided
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) {
        throw new Error("Folder not found");
      }
      if (folder.organizationId.toString() !== args.organizationId.toString()) {
        throw new Error("Folder belongs to different organization");
      }
    }

    // Validate inputs
    if (!args.name.trim()) {
      throw new Error("Document name is required");
    }
    if (args.name.length > 255) {
      throw new Error("Document name too long");
    }

    const docId = await ctx.db.insert("documents", {
      organizationId: args.organizationId,
      folderId: args.folderId,
      name: args.name.trim(),
      type: args.type,
      size: args.size,
      storageKey: args.storageKey,
      convexStorageId: args.convexStorageId,
      category: args.category,
      uploadedBy: user._id,
      uploadedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: "uploaded_document",
      resourceType: "document",
      resourceId: docId,
      resourceName: args.name.trim(),
      createdAt: Date.now(),
    });

    // Create notification for admins/staff (inline to avoid circular dependency)
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff")))
      .collect();

    for (const admin of admins) {
      if (admin._id.toString() !== user._id.toString()) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          type: "new_document",
          title: "New Document Uploaded",
          message: `${user.name} uploaded "${args.name.trim()}"`,
          link: `/documents`,
          relatedId: docId,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return docId;
  },
});

// Soft delete document
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);

    if (!doc) {
      throw new Error("Document not found");
    }

    // Only admin/staff can delete, or clients can delete their own uploads
    if (user.role === "client") {
      if (doc.uploadedBy.toString() !== user._id.toString()) {
        throw new Error("Access denied");
      }
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: doc.organizationId,
      userId: user._id,
      action: "deleted_document",
      resourceType: "document",
      resourceId: args.id,
      resourceName: doc.name,
      createdAt: Date.now(),
    });
  },
});

// ============================================
// ACTIONS (for file storage)
// ============================================

// Generate upload URL using Convex storage
export const generateUploadUrl = action({
  args: {
    filename: v.string(),
    contentType: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Generate a unique storage key
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = args.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storageKey = `documents/${args.organizationId}/${timestamp}-${randomSuffix}-${sanitizedFilename}`;

    // Use Convex's built-in storage (R2 integration can be added later)
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return {
      uploadUrl,
      storageKey,
    };
  },
});

// Get download URL for a document
export const generateDownloadUrl = action({
  args: {
    convexStorageId: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Use Convex storage URL
    const url = await ctx.storage.getUrl(args.convexStorageId as any);
    if (!url) {
      throw new Error("File not found");
    }
    
    return {
      downloadUrl: url,
      filename: args.filename,
    };
  },
});
