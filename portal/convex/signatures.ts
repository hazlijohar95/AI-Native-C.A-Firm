import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";
import { logActivity, notifyOrgUsers, notifyAdmins, validateSignatureData, enforceRateLimit, generateDocumentHash, DocumentIntegrityError } from "./lib/helpers";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ============================================
// QUERIES
// ============================================

// List signature requests for current user/organization
export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("signed"),
      v.literal("declined"),
      v.literal("expired")
    )),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const now = Date.now();

    let requests;

    if (user.role === "admin" || user.role === "staff") {
      requests = await ctx.db.query("signatureRequests").collect();
    } else if (user.organizationId) {
      requests = await ctx.db
        .query("signatureRequests")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
    } else {
      return [];
    }

    // Filter by status if specified
    if (args.status) {
      requests = requests.filter((r) => r.status === args.status);
    }

    // Sort by requested date descending
    requests.sort((a, b) => b.requestedAt - a.requestedAt);

    // Fetch document names
    const docIds = [...new Set(requests.map((r) => r.documentId))];
    const docs = await Promise.all(docIds.map((id) => ctx.db.get(id)));
    const docMap = new Map(
      docs.filter(Boolean).map((doc) => [doc!._id.toString(), doc!.name])
    );

    return requests.map((req) => ({
      ...req,
      // Compute expired status for display
      displayStatus: req.status === "pending" && req.expiresAt && req.expiresAt < now 
        ? "expired" 
        : req.status,
      documentName: docMap.get(req.documentId.toString()) || "Unknown Document",
    }));
  },
});

// Get single signature request with signature details
export const get = query({
  args: { id: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const request = await ctx.db.get(args.id);

    if (!request) {
      return null;
    }

    if (user.role === "client") {
      if (request.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    const document = await ctx.db.get(request.documentId);
    const now = Date.now();

    let signature = null;
    if (request.status === "signed") {
      signature = await ctx.db
        .query("signatures")
        .withIndex("by_request", (q) => q.eq("signatureRequestId", args.id))
        .first();
    }

    let signerName = null;
    if (request.signedBy) {
      const signer = await ctx.db.get(request.signedBy);
      signerName = signer?.name;
    }

    return {
      ...request,
      displayStatus: request.status === "pending" && request.expiresAt && request.expiresAt < now 
        ? "expired" 
        : request.status,
      documentName: document?.name || "Unknown Document",
      signature,
      signerName,
    };
  },
});

// Count pending signature requests for dashboard
export const countPending = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const now = Date.now();

    let requests;

    if (user.role === "admin" || user.role === "staff") {
      requests = await ctx.db.query("signatureRequests").collect();
    } else if (user.organizationId) {
      requests = await ctx.db
        .query("signatureRequests")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
    } else {
      return 0;
    }

    return requests.filter(
      (r) => r.status === "pending" && (!r.expiresAt || r.expiresAt > now)
    ).length;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Internal mutation to create signature request (called from action)
export const createInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    documentId: v.id("documents"),
    title: v.string(),
    description: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    documentHash: v.optional(v.string()),
    requestedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const requestId = await ctx.db.insert("signatureRequests", {
      organizationId: args.organizationId,
      documentId: args.documentId,
      title: args.title.trim(),
      description: args.description?.trim(),
      status: "pending",
      requestedBy: args.requestedBy,
      requestedAt: Date.now(),
      expiresAt: args.expiresAt,
      documentHash: args.documentHash,
    });

    await logActivity(ctx, {
      organizationId: args.organizationId,
      userId: args.requestedBy,
      action: "requested_signature",
      resourceType: "signature_request",
      resourceId: requestId,
      resourceName: args.title.trim(),
    });

    await notifyOrgUsers(ctx, args.organizationId, {
      type: "system",
      title: "Signature Required",
      message: `Please sign: "${args.title.trim()}"`,
      link: `/signatures`,
      relatedId: requestId,
    });

    return requestId;
  },
});

// Create signature request (admin/staff only)
// This mutation validates and then calls an action to generate document hash
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    documentId: v.id("documents"),
    title: v.string(),
    description: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }
    if (document.organizationId.toString() !== args.organizationId.toString()) {
      throw new Error("Document does not belong to this organization");
    }

    if (!args.title.trim()) {
      throw new Error("Title is required");
    }
    if (args.title.length > 200) {
      throw new Error("Title too long (max 200 characters)");
    }
    if (args.description && args.description.length > 1000) {
      throw new Error("Description too long (max 1000 characters)");
    }

    const existingRequest = await ctx.db
      .query("signatureRequests")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      throw new Error("A pending signature request already exists for this document");
    }

    // Create without hash initially (hash will be added via action)
    const requestId = await ctx.db.insert("signatureRequests", {
      organizationId: args.organizationId,
      documentId: args.documentId,
      title: args.title.trim(),
      description: args.description?.trim(),
      status: "pending",
      requestedBy: user._id,
      requestedAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    await logActivity(ctx, {
      organizationId: args.organizationId,
      userId: user._id,
      action: "requested_signature",
      resourceType: "signature_request",
      resourceId: requestId,
      resourceName: args.title.trim(),
    });

    await notifyOrgUsers(ctx, args.organizationId, {
      type: "system",
      title: "Signature Required",
      message: `Please sign: "${args.title.trim()}"`,
      link: `/signatures`,
      relatedId: requestId,
    });

    return requestId;
  },
});

// Create signature request with hash and email notifications (admin/staff only)
// This is the preferred way to create signature requests as it handles all side effects
export const createWithNotifications = action({
  args: {
    organizationId: v.id("organizations"),
    documentId: v.id("documents"),
    title: v.string(),
    description: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"signatureRequests">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Create the signature request via mutation
    const requestId = await ctx.runMutation(api.signatures.create, {
      organizationId: args.organizationId,
      documentId: args.documentId,
      title: args.title,
      description: args.description,
      expiresAt: args.expiresAt,
    });

    // Generate and store document hash (best effort - don't fail if this fails)
    try {
      await ctx.runAction(api.signatures.generateAndStoreDocumentHash, {
        requestId,
      });
    } catch (error) {
      console.error("Failed to generate document hash:", error);
    }

    // Send email notifications to organization users
    try {
      await ctx.runMutation(internal.signatures.sendSignatureRequestEmails, {
        requestId,
        organizationId: args.organizationId,
        title: args.title,
      });
    } catch (error) {
      console.error("Failed to send signature request emails:", error);
    }

    return requestId;
  },
});

// Internal mutation to queue signature request emails
export const sendSignatureRequestEmails = internalMutation({
  args: {
    requestId: v.id("signatureRequests"),
    organizationId: v.id("organizations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    // Get requesting user's name
    const request = await ctx.db.get(args.requestId);
    if (!request) return;

    const requestedByUser = await ctx.db.get(request.requestedBy);
    const requestedByName = requestedByUser?.name || "Amjad & Hazli";

    // Get all users in the organization
    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Schedule emails for each user
    for (const user of orgUsers) {
      // Check email preferences (respects signatures preference)
      const prefs = user.emailPreferences;
      if (prefs?.signatures === false) {
        continue;
      }

      // Schedule the email via scheduler (runs in background)
      await ctx.scheduler.runAfter(0, internal.emails.sendSignatureRequestEmail, {
        recipientId: user._id.toString(),
        recipientEmail: user.email,
        recipientName: user.name,
        documentTitle: args.title,
        requestedBy: requestedByName,
      });
    }
  },
});

// Generate and store document hash for a signature request
export const generateAndStoreDocumentHash = action({
  args: {
    requestId: v.id("signatureRequests"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; hash?: string; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get the signature request
    const request = await ctx.runQuery(api.signatures.get, { id: args.requestId });
    if (!request) {
      return { success: false, error: "Signature request not found" };
    }

    // Get the document
    const doc = await ctx.runQuery(api.documents.get, { id: request.documentId });
    if (!doc || !doc.convexStorageId) {
      return { success: false, error: "Document not found or not available" };
    }

    // Get storage URL
    const url = await ctx.storage.getUrl(doc.convexStorageId as Id<"_storage">);
    if (!url) {
      return { success: false, error: "Document file not found in storage" };
    }

    try {
      // Generate hash
      const hash = await generateDocumentHash(url);

      // Store hash via internal mutation
      await ctx.runMutation(internal.signatures.updateDocumentHash, {
        requestId: args.requestId,
        documentHash: hash,
      });

      return { success: true, hash };
    } catch (error) {
      console.error("Failed to generate document hash:", error);
      return { success: false, error: "Failed to generate document hash" };
    }
  },
});

// Internal mutation to update document hash
export const updateDocumentHash = internalMutation({
  args: {
    requestId: v.id("signatureRequests"),
    documentHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      documentHash: args.documentHash,
    });
  },
});

// Internal mutation to complete signature (called from sign action)
export const signInternal = internalMutation({
  args: {
    requestId: v.id("signatureRequests"),
    userId: v.id("users"),
    userName: v.string(),
    signatureType: v.union(
      v.literal("draw"),
      v.literal("type"),
      v.literal("upload")
    ),
    signatureData: v.string(),
    legalName: v.string(),
    agreedToTerms: v.boolean(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    signedDocumentHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Signature request not found");
    }

    await ctx.db.insert("signatures", {
      signatureRequestId: args.requestId,
      userId: args.userId,
      signatureType: args.signatureType,
      signatureData: args.signatureData,
      legalName: args.legalName.trim(),
      agreedToTerms: args.agreedToTerms,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.requestId, {
      status: "signed",
      signedAt: Date.now(),
      signedBy: args.userId,
      signedDocumentHash: args.signedDocumentHash,
    });

    await logActivity(ctx, {
      organizationId: request.organizationId,
      userId: args.userId,
      action: "signed_document",
      resourceType: "signature_request",
      resourceId: args.requestId,
      resourceName: request.title,
    });

    await notifyAdmins(ctx, {
      type: "system",
      title: "Document Signed",
      message: `${args.userName} signed "${request.title}"`,
      link: `/signatures`,
      relatedId: args.requestId,
    }, args.userId);
  },
});

// Sign a document with hash verification
export const sign = action({
  args: {
    requestId: v.id("signatureRequests"),
    signatureType: v.union(
      v.literal("draw"),
      v.literal("type"),
      v.literal("upload")
    ),
    signatureData: v.string(),
    legalName: v.string(),
    agreedToTerms: v.boolean(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get request details
    const request = await ctx.runQuery(api.signatures.get, { id: args.requestId });
    if (!request) {
      throw new Error("Signature request not found");
    }

    if (request.status !== "pending" && request.displayStatus !== "pending") {
      throw new Error(`This signature request is ${request.displayStatus || request.status}, not pending`);
    }

    // Get user details
    const user = await ctx.runQuery(api.users.me, {});
    if (!user) {
      throw new Error("User not found");
    }

    // Validate inputs
    if (!args.legalName.trim()) {
      throw new Error("Legal name is required");
    }
    if (args.legalName.length > 200) {
      throw new Error("Legal name too long (max 200 characters)");
    }
    if (!args.agreedToTerms) {
      throw new Error("You must agree to the terms");
    }

    // Validate signature data
    const signatureValidation = validateSignatureData(args.signatureType, args.signatureData);
    if (!signatureValidation.valid) {
      throw new Error(signatureValidation.error!);
    }

    // Verify document hash if one was stored at creation time
    let currentHash: string | undefined;
    if (request.documentHash) {
      // Get document and verify hash hasn't changed
      const doc = await ctx.runQuery(api.documents.get, { id: request.documentId });
      if (!doc || !doc.convexStorageId) {
        throw new Error("Document not found or not available");
      }

      const url = await ctx.storage.getUrl(doc.convexStorageId as Id<"_storage">);
      if (!url) {
        throw new Error("Document file not found in storage");
      }

      try {
        currentHash = await generateDocumentHash(url);

        if (currentHash !== request.documentHash) {
          throw new DocumentIntegrityError(
            "Document integrity check failed. The document may have been modified since the signature request was created. Please contact support."
          );
        }
      } catch (error) {
        // If it's a document integrity error, re-throw it (security-critical)
        if (error instanceof DocumentIntegrityError) {
          throw error;
        }
        // For other errors (network issues, etc.), log but continue
        console.error("Hash verification error (non-fatal):", error);
      }
    }

    // Complete the signature
    await ctx.runMutation(internal.signatures.signInternal, {
      requestId: args.requestId,
      userId: user._id,
      userName: user.name,
      signatureType: args.signatureType,
      signatureData: args.signatureData,
      legalName: args.legalName.trim(),
      agreedToTerms: args.agreedToTerms,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      signedDocumentHash: currentHash,
    });
  },
});

// Decline signature request
export const decline = mutation({
  args: {
    requestId: v.id("signatureRequests"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Signature request not found");
    }

    if (user.role === "client") {
      if (request.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    if (request.status !== "pending") {
      throw new Error(`This signature request is ${request.status}, not pending`);
    }

    await ctx.db.patch(args.requestId, { status: "declined" });

    await logActivity(ctx, {
      organizationId: request.organizationId,
      userId: user._id,
      action: "declined_signature",
      resourceType: "signature_request",
      resourceId: args.requestId,
      resourceName: request.title,
      metadata: args.reason ? { reason: args.reason } : undefined,
    });

    await notifyAdmins(ctx, {
      type: "system",
      title: "Signature Declined",
      message: `${user.name} declined to sign "${request.title}"`,
      link: `/signatures`,
      relatedId: args.requestId,
    }, user._id);
  },
});

// Cancel signature request (admin/staff only)
export const cancel = mutation({
  args: { id: v.id("signatureRequests") },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("Signature request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Only pending requests can be cancelled");
    }

    await ctx.db.patch(args.id, { status: "expired" });

    await logActivity(ctx, {
      organizationId: request.organizationId,
      userId: user._id,
      action: "cancelled_signature_request",
      resourceType: "signature_request",
      resourceId: args.id,
      resourceName: request.title,
    });
  },
});

// ============================================
// DOCUMENT PREVIEW
// ============================================

// Get document preview URL for signature request
export const getDocumentPreview = action({
  args: {
    requestId: v.id("signatureRequests"),
  },
  handler: async (ctx, args): Promise<{ url: string | null; filename: string; mimeType: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get the signature request
    const request = await ctx.runQuery(api.signatures.get, { id: args.requestId });
    if (!request) {
      throw new Error("Signature request not found or access denied");
    }

    // Get the document
    const doc = await ctx.runQuery(api.documents.get, { id: request.documentId });
    if (!doc) {
      throw new Error("Document not found");
    }

    if (!doc.convexStorageId) {
      throw new Error("Document file not available");
    }

    // Get the storage URL
    const url = await ctx.storage.getUrl(doc.convexStorageId as Id<"_storage">);
    if (!url) {
      throw new Error("Document file not found");
    }

    return {
      url,
      filename: doc.name,
      mimeType: doc.type || "application/pdf",
    };
  },
});

// Record that user previewed document (for audit trail)
export const recordDocumentPreview = mutation({
  args: {
    requestId: v.id("signatureRequests"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Signature request not found");
    }

    // Check access
    if (user.role === "client") {
      if (request.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Log the preview for audit purposes
    await logActivity(ctx, {
      organizationId: request.organizationId,
      userId: user._id,
      action: "previewed_document_for_signature",
      resourceType: "signature_request",
      resourceId: args.requestId,
      resourceName: request.title,
    });

    return { success: true, previewedAt: Date.now() };
  },
});
