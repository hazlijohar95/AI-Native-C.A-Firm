import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";

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

// Allowed file types for document uploads
const ALLOWED_FILE_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Spreadsheets
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Text
  "text/plain",
] as const;

// Max file size: 25MB
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Validate file type against allowed list
 */
function validateFileType(contentType: string): { valid: boolean; error?: string } {
  const normalizedType = contentType.toLowerCase().trim();
  
  if (!normalizedType) {
    return { valid: false, error: "File type is required" };
  }
  
  if (!ALLOWED_FILE_TYPES.includes(normalizedType as typeof ALLOWED_FILE_TYPES[number])) {
    return { 
      valid: false, 
      error: `File type "${contentType}" is not allowed. Allowed types: PDF, Word, Excel, CSV, images (JPEG, PNG, GIF, WebP), and plain text.` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate filename
 */
function validateFilename(filename: string): { valid: boolean; error?: string; sanitized: string } {
  if (!filename || !filename.trim()) {
    return { valid: false, error: "Filename is required", sanitized: "" };
  }
  
  if (filename.length > 255) {
    return { valid: false, error: "Filename too long (max 255 characters)", sanitized: "" };
  }
  
  // Check for path traversal attempts
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return { valid: false, error: "Invalid filename", sanitized: "" };
  }
  
  // Sanitize: replace non-alphanumeric chars (except . and -) with underscore
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  
  return { valid: true, sanitized };
}

// Generate upload URL using Convex storage
export const generateUploadUrl = action({
  args: {
    filename: v.string(),
    contentType: v.string(),
    organizationId: v.string(),
    fileSize: v.optional(v.number()), // Optional file size for validation
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Validate file type
    const typeValidation = validateFileType(args.contentType);
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    // Validate filename
    const filenameValidation = validateFilename(args.filename);
    if (!filenameValidation.valid) {
      throw new Error(filenameValidation.error);
    }

    // Validate file size if provided
    if (args.fileSize !== undefined) {
      if (args.fileSize <= 0) {
        throw new Error("Invalid file size");
      }
      if (args.fileSize > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
      }
    }

    // Generate a unique storage key
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const storageKey = `documents/${args.organizationId}/${timestamp}-${randomSuffix}-${filenameValidation.sanitized}`;

    // Use Convex's built-in storage (R2 integration can be added later)
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return {
      uploadUrl,
      storageKey,
    };
  },
});

// Get download URL for a document (with authorization check)
// Note: Uses internal query to avoid circular type reference
export const generateDownloadUrl = action({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args): Promise<{ downloadUrl: string | null; filename: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Verify user has access to this document via the get query
    // This checks organization access for clients
    const doc = await ctx.runQuery(api.documents.get, { id: args.documentId });
    if (!doc) {
      throw new Error("Document not found or access denied");
    }

    if (!doc.convexStorageId) {
      throw new Error("File not available for download");
    }

    // Use Convex storage URL
    const url = await ctx.storage.getUrl(doc.convexStorageId as Id<"_storage">);
    if (!url) {
      throw new Error("File not found");
    }
    
    return {
      downloadUrl: url,
      filename: doc.name,
    };
  },
});

// ============================================
// DOCUMENT REQUESTS
// ============================================

// List document requests for current user
export const listRequests = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("uploaded"),
      v.literal("reviewed"),
      v.literal("rejected")
    )),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    let requests;

    if (user.role === "admin" || user.role === "staff") {
      // Admin/staff see all requests
      requests = await ctx.db.query("documentRequests").collect();
    } else if (user.organizationId) {
      // Clients see requests assigned to them
      requests = await ctx.db
        .query("documentRequests")
        .withIndex("by_client", (q) => q.eq("clientId", user._id))
        .collect();
    } else {
      return [];
    }

    // Filter by status if specified
    if (args.status) {
      requests = requests.filter((r) => r.status === args.status);
    }

    // Sort by due date (soonest first), then by created date
    requests.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    });

    return requests;
  },
});

// Get single document request
export const getRequest = query({
  args: { id: v.id("documentRequests") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const request = await ctx.db.get(args.id);

    if (!request) {
      return null;
    }

    // Check access
    if (user.role === "client") {
      if (request.clientId.toString() !== user._id.toString()) {
        throw new Error("Access denied");
      }
    }

    return request;
  },
});

// Count pending document requests for dashboard
export const countPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    let requests;

    if (user.role === "admin" || user.role === "staff") {
      requests = await ctx.db.query("documentRequests").collect();
      // Admin sees count of uploaded (needs review)
      return requests.filter((r) => r.status === "uploaded").length;
    } else {
      // Clients see count of pending (needs upload)
      requests = await ctx.db
        .query("documentRequests")
        .withIndex("by_client", (q) => q.eq("clientId", user._id))
        .collect();
      return requests.filter((r) => r.status === "pending" || r.status === "rejected").length;
    }
  },
});

// Create document request (admin/staff only)
export const createRequest = mutation({
  args: {
    organizationId: v.id("organizations"),
    clientId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("tax_return"),
      v.literal("financial_statement"),
      v.literal("invoice"),
      v.literal("agreement"),
      v.literal("receipt"),
      v.literal("other")
    ),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    // Validate organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Validate client exists and belongs to organization
    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new Error("Client not found");
    }
    if (client.role !== "client") {
      throw new Error("User is not a client");
    }
    if (client.organizationId?.toString() !== args.organizationId.toString()) {
      throw new Error("Client does not belong to this organization");
    }

    // Validate title
    if (!args.title.trim()) {
      throw new Error("Request title is required");
    }
    if (args.title.length > 200) {
      throw new Error("Request title too long");
    }

    const requestId = await ctx.db.insert("documentRequests", {
      organizationId: args.organizationId,
      clientId: args.clientId,
      requestedBy: user._id,
      title: args.title.trim(),
      description: args.description?.trim(),
      category: args.category,
      dueDate: args.dueDate,
      status: "pending",
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: "requested_document",
      resourceType: "documentRequest",
      resourceId: requestId,
      resourceName: args.title.trim(),
      createdAt: Date.now(),
    });

    // Notify the client
    await ctx.db.insert("notifications", {
      userId: args.clientId,
      type: "new_document",
      title: "Document Requested",
      message: `Please upload: "${args.title.trim()}"`,
      link: `/documents`,
      relatedId: requestId,
      isRead: false,
      createdAt: Date.now(),
    });

    return requestId;
  },
});

// Fulfill document request (client uploads document)
export const fulfillRequest = mutation({
  args: {
    requestId: v.id("documentRequests"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Request not found");
    }

    // Check access - only assigned client can fulfill
    if (user.role === "client") {
      if (request.clientId.toString() !== user._id.toString()) {
        throw new Error("Access denied");
      }
    }

    // Validate document exists
    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    // Update request
    await ctx.db.patch(args.requestId, {
      status: "uploaded",
      documentId: args.documentId,
      uploadedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: request.organizationId,
      userId: user._id,
      action: "fulfilled_document_request",
      resourceType: "documentRequest",
      resourceId: args.requestId,
      resourceName: request.title,
      createdAt: Date.now(),
    });

    // Notify admins/staff
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff")))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        type: "new_document",
        title: "Document Uploaded",
        message: `${user.name} uploaded "${request.title}" for review`,
        link: `/documents`,
        relatedId: args.requestId,
        isRead: false,
        createdAt: Date.now(),
      });
    }
  },
});

// Review document request (admin/staff only)
export const reviewRequest = mutation({
  args: {
    requestId: v.id("documentRequests"),
    action: v.union(v.literal("approve"), v.literal("reject")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "uploaded") {
      throw new Error("Request must be in uploaded status to review");
    }

    const newStatus = args.action === "approve" ? "reviewed" : "rejected";

    await ctx.db.patch(args.requestId, {
      status: newStatus,
      reviewNote: args.note?.trim(),
      reviewedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: request.organizationId,
      userId: user._id,
      action: args.action === "approve" ? "approved_document" : "rejected_document",
      resourceType: "documentRequest",
      resourceId: args.requestId,
      resourceName: request.title,
      createdAt: Date.now(),
    });

    // Notify the client
    await ctx.db.insert("notifications", {
      userId: request.clientId,
      type: "new_document",
      title: args.action === "approve" ? "Document Approved" : "Document Rejected",
      message: args.action === "approve"
        ? `Your document "${request.title}" has been approved`
        : `Your document "${request.title}" needs to be re-uploaded${args.note ? `: ${args.note}` : ""}`,
      link: `/documents`,
      relatedId: args.requestId,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

// Cancel document request (admin/staff only)
export const cancelRequest = mutation({
  args: { id: v.id("documentRequests") },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);
    const request = await ctx.db.get(args.id);

    if (!request) {
      throw new Error("Request not found");
    }

    await ctx.db.delete(args.id);

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: request.organizationId,
      userId: user._id,
      action: "cancelled_document_request",
      resourceType: "documentRequest",
      resourceId: args.id,
      resourceName: request.title,
      createdAt: Date.now(),
    });
  },
});
