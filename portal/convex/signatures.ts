import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";
import { logActivity, notifyOrgUsers, notifyAdmins, validateSignatureData } from "./lib/helpers";

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

// Create signature request (admin/staff only)
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

// Sign a document
export const sign = mutation({
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
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Signature request not found");
    }

    // Check access - only users in the organization can sign
    if (user.role === "client") {
      if (request.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    if (request.status !== "pending") {
      throw new Error(`This signature request is ${request.status}, not pending`);
    }

    if (request.expiresAt && request.expiresAt < Date.now()) {
      await ctx.db.patch(args.requestId, { status: "expired" });
      throw new Error("This signature request has expired");
    }

    // Validate legal name
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

    await ctx.db.insert("signatures", {
      signatureRequestId: args.requestId,
      userId: user._id,
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
      signedBy: user._id,
    });

    await logActivity(ctx, {
      organizationId: request.organizationId,
      userId: user._id,
      action: "signed_document",
      resourceType: "signature_request",
      resourceId: args.requestId,
      resourceName: request.title,
    });

    await notifyAdmins(ctx, {
      type: "system",
      title: "Document Signed",
      message: `${user.name} signed "${request.title}"`,
      link: `/signatures`,
      relatedId: args.requestId,
    }, user._id);
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
