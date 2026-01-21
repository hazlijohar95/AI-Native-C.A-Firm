import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";

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

    let requests;

    if (user.role === "admin" || user.role === "staff") {
      // Admin/staff see all signature requests
      requests = await ctx.db.query("signatureRequests").collect();
    } else if (user.organizationId) {
      // Clients see their organization's signature requests
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

    // Check for expired requests
    const now = Date.now();
    for (const req of requests) {
      if (req.status === "pending" && req.expiresAt && req.expiresAt < now) {
        req.status = "expired";
      }
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

    // Check access
    if (user.role === "client") {
      if (request.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Get document info
    const document = await ctx.db.get(request.documentId);

    // Get signature if signed
    let signature = null;
    if (request.status === "signed") {
      signature = await ctx.db
        .query("signatures")
        .withIndex("by_request", (q) => q.eq("signatureRequestId", args.id))
        .first();
    }

    // Get signer info if signed
    let signerName = null;
    if (request.signedBy) {
      const signer = await ctx.db.get(request.signedBy);
      signerName = signer?.name;
    }

    return {
      ...request,
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

    const now = Date.now();
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

    // Validate organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Validate document exists and belongs to organization
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }
    if (document.organizationId.toString() !== args.organizationId.toString()) {
      throw new Error("Document does not belong to this organization");
    }

    // Validate inputs
    if (!args.title.trim()) {
      throw new Error("Title is required");
    }

    // Check for existing pending request for this document
    const existingRequest = await ctx.db
      .query("signatureRequests")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      throw new Error("A signature request already exists for this document");
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

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: "requested_signature",
      resourceType: "signature_request",
      resourceId: requestId,
      resourceName: args.title.trim(),
      createdAt: Date.now(),
    });

    // Notify organization users
    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    for (const orgUser of orgUsers) {
      await ctx.db.insert("notifications", {
        userId: orgUser._id,
        type: "system",
        title: "Signature Required",
        message: `Please sign: "${args.title.trim()}"`,
        link: `/signatures/${requestId}`,
        relatedId: requestId,
        isRead: false,
        createdAt: Date.now(),
      });
    }

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
    signatureData: v.string(), // Base64 or typed name
    legalName: v.string(),
    agreedToTerms: v.boolean(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Validate request
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

    // Check status
    if (request.status !== "pending") {
      throw new Error("This signature request is no longer pending");
    }

    // Check expiry
    if (request.expiresAt && request.expiresAt < Date.now()) {
      await ctx.db.patch(args.requestId, { status: "expired" });
      throw new Error("This signature request has expired");
    }

    // Validate inputs
    if (!args.legalName.trim()) {
      throw new Error("Legal name is required");
    }
    if (!args.agreedToTerms) {
      throw new Error("You must agree to the terms");
    }
    if (!args.signatureData) {
      throw new Error("Signature is required");
    }

    // Create signature record
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

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "signed",
      signedAt: Date.now(),
      signedBy: user._id,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: request.organizationId,
      userId: user._id,
      action: "signed_document",
      resourceType: "signature_request",
      resourceId: args.requestId,
      resourceName: request.title,
      createdAt: Date.now(),
    });

    // Notify admin/staff about the signature
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff")))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        type: "system",
        title: "Document Signed",
        message: `${user.name} signed "${request.title}"`,
        link: `/signatures/${args.requestId}`,
        relatedId: args.requestId,
        isRead: false,
        createdAt: Date.now(),
      });
    }
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

    // Check access
    if (user.role === "client") {
      if (request.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    if (request.status !== "pending") {
      throw new Error("This signature request is no longer pending");
    }

    await ctx.db.patch(args.requestId, { status: "declined" });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: request.organizationId,
      userId: user._id,
      action: "declined_signature",
      resourceType: "signature_request",
      resourceId: args.requestId,
      resourceName: request.title,
      metadata: args.reason ? { reason: args.reason } : undefined,
      createdAt: Date.now(),
    });

    // Notify admin/staff
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff")))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        type: "system",
        title: "Signature Declined",
        message: `${user.name} declined to sign "${request.title}"`,
        link: `/signatures/${args.requestId}`,
        relatedId: args.requestId,
        isRead: false,
        createdAt: Date.now(),
      });
    }
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

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: request.organizationId,
      userId: user._id,
      action: "cancelled_signature_request",
      resourceType: "signature_request",
      resourceId: args.id,
      resourceName: request.title,
      createdAt: Date.now(),
    });
  },
});
