import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";
import { 
  logActivity, 
  notifyOrgUsers, 
  generateInvoiceNumber, 
  validateLineItems,
  validatePaymentAmount,
  enforceRateLimit,
} from "./lib/helpers";
import { api } from "./_generated/api";

// ============================================
// QUERIES
// ============================================

// List invoices for current user's organization
export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const now = Date.now();

    let invoices;

    if (user.role === "admin" || user.role === "staff") {
      invoices = await ctx.db.query("invoices").collect();
    } else if (user.organizationId) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
      // Clients don't see draft invoices
      invoices = invoices.filter((inv) => inv.status !== "draft");
    } else {
      return [];
    }

    // Filter by status if specified (handle overdue as computed status)
    if (args.status === "overdue") {
      invoices = invoices.filter((inv) => 
        (inv.status === "pending" || inv.status === "overdue") && inv.dueDate < now
      );
    } else if (args.status) {
      invoices = invoices.filter((inv) => inv.status === args.status);
    }

    // Sort by issued date descending
    invoices.sort((a, b) => b.issuedDate - a.issuedDate);

    // Compute display status and fetch org names
    const orgIds = [...new Set(invoices.map((inv) => inv.organizationId))];
    const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
    const orgMap = new Map(
      orgs.filter(Boolean).map((org) => [org!._id.toString(), org!.name])
    );

    return invoices.map((inv) => ({
      ...inv,
      // Compute overdue status for display (don't mutate DB status)
      displayStatus: inv.status === "pending" && inv.dueDate < now ? "overdue" : inv.status,
      organizationName: orgMap.get(inv.organizationId.toString()) || "Unknown",
    }));
  },
});

// Get single invoice
export const get = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const invoice = await ctx.db.get(args.id);

    if (!invoice) {
      return null;
    }

    // Check access
    if (user.role === "client") {
      if (invoice.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
      if (invoice.status === "draft") {
        throw new Error("Access denied");
      }
    }

    const org = await ctx.db.get(invoice.organizationId);
    const now = Date.now();

    return {
      ...invoice,
      displayStatus: invoice.status === "pending" && invoice.dueDate < now ? "overdue" : invoice.status,
      organizationName: org?.name || "Unknown",
    };
  },
});

// Count pending/overdue invoices for dashboard
export const countPending = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const now = Date.now();

    let invoices;

    if (user.role === "admin" || user.role === "staff") {
      invoices = await ctx.db.query("invoices").collect();
    } else if (user.organizationId) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
    } else {
      return { pending: 0, overdue: 0, total: 0 };
    }

    // Exclude drafts and cancelled for counting
    const activeInvoices = invoices.filter(
      (inv) => inv.status === "pending" || inv.status === "overdue"
    );

    const pending = activeInvoices.filter((inv) => inv.dueDate >= now).length;
    const overdue = activeInvoices.filter((inv) => inv.dueDate < now).length;
    const totalUnpaid = activeInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    return { pending, overdue, total: totalUnpaid };
  },
});

// Get payment history for an invoice
export const getPayments = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (user.role === "client") {
      if (invoice.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    return payments.sort((a, b) => b.paidAt - a.paidAt);
  },
});

// ============================================
// MUTATIONS
// ============================================

// Create invoice (admin/staff only)
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    description: v.string(),
    lineItems: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      amount: v.number(),
    })),
    dueDate: v.number(),
    notes: v.optional(v.string()),
    isDraft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    // Validate organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Validate description
    if (!args.description.trim()) {
      throw new Error("Description is required");
    }
    if (args.description.length > 1000) {
      throw new Error("Description too long (max 1000 characters)");
    }

    // Validate notes length
    if (args.notes && args.notes.length > 5000) {
      throw new Error("Notes too long (max 5000 characters)");
    }

    // Validate line items with server-side calculation check
    const validation = validateLineItems(args.lineItems);
    if (!validation.valid) {
      throw new Error(validation.error!);
    }

    // Generate unique invoice number
    const invoiceNumber = await generateInvoiceNumber(ctx);

    const invoiceId = await ctx.db.insert("invoices", {
      organizationId: args.organizationId,
      invoiceNumber,
      description: args.description.trim(),
      amount: validation.totalAmount,
      currency: "MYR",
      status: args.isDraft ? "draft" : "pending",
      dueDate: args.dueDate,
      issuedDate: Date.now(),
      lineItems: args.lineItems.map(item => ({
        ...item,
        description: item.description.trim(),
      })),
      notes: args.notes?.trim(),
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // Log activity
    await logActivity(ctx, {
      organizationId: args.organizationId,
      userId: user._id,
      action: args.isDraft ? "created_draft_invoice" : "issued_invoice",
      resourceType: "invoice",
      resourceId: invoiceId,
      resourceName: invoiceNumber,
    });

    // Notify organization users if not draft
    if (!args.isDraft) {
      await notifyOrgUsers(ctx, args.organizationId, {
        type: "invoice_due",
        title: "New Invoice",
        message: `Invoice ${invoiceNumber} has been issued. Click to view details.`,
        link: `/invoices`,
        relatedId: invoiceId,
      });
    }

    return invoiceId;
  },
});

// Update invoice (admin/staff only, only drafts can be edited)
export const update = mutation({
  args: {
    id: v.id("invoices"),
    description: v.optional(v.string()),
    lineItems: v.optional(v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      amount: v.number(),
    }))),
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status !== "draft") {
      throw new Error("Only draft invoices can be edited");
    }

    const updates: Record<string, unknown> = {};

    if (args.description !== undefined) {
      if (!args.description.trim()) {
        throw new Error("Description is required");
      }
      if (args.description.length > 1000) {
        throw new Error("Description too long (max 1000 characters)");
      }
      updates.description = args.description.trim();
    }

    if (args.lineItems !== undefined) {
      const validation = validateLineItems(args.lineItems);
      if (!validation.valid) {
        throw new Error(validation.error!);
      }
      updates.lineItems = args.lineItems.map(item => ({
        ...item,
        description: item.description.trim(),
      }));
      updates.amount = validation.totalAmount;
    }

    if (args.dueDate !== undefined) {
      updates.dueDate = args.dueDate;
    }

    if (args.notes !== undefined) {
      if (args.notes.length > 5000) {
        throw new Error("Notes too long (max 5000 characters)");
      }
      updates.notes = args.notes.trim();
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.id, updates);
      
      // Log activity for draft updates
      await logActivity(ctx, {
        organizationId: invoice.organizationId,
        userId: user._id,
        action: "updated_draft_invoice",
        resourceType: "invoice",
        resourceId: args.id,
        resourceName: invoice.invoiceNumber,
      });
    }
  },
});

// Publish draft invoice (admin/staff only)
export const publish = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status !== "draft") {
      throw new Error("Only draft invoices can be published");
    }

    await ctx.db.patch(args.id, {
      status: "pending",
      issuedDate: Date.now(),
    });

    await logActivity(ctx, {
      organizationId: invoice.organizationId,
      userId: user._id,
      action: "issued_invoice",
      resourceType: "invoice",
      resourceId: args.id,
      resourceName: invoice.invoiceNumber,
    });

    await notifyOrgUsers(ctx, invoice.organizationId, {
      type: "invoice_due",
      title: "New Invoice",
      message: `Invoice ${invoice.invoiceNumber} has been issued. Click to view details.`,
      link: `/invoices`,
      relatedId: args.id,
    });
  },
});

// Cancel invoice (admin/staff only)
export const cancel = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "paid") {
      throw new Error("Cannot cancel a paid invoice");
    }

    if (invoice.status === "cancelled") {
      throw new Error("Invoice is already cancelled");
    }

    await ctx.db.patch(args.id, { status: "cancelled" });

    await logActivity(ctx, {
      organizationId: invoice.organizationId,
      userId: user._id,
      action: "cancelled_invoice",
      resourceType: "invoice",
      resourceId: args.id,
      resourceName: invoice.invoiceNumber,
    });
  },
});

// Record manual payment (admin/staff only)
export const recordPayment = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amount: v.number(),
    method: v.union(
      v.literal("bank_transfer"),
      v.literal("cash"),
      v.literal("other")
    ),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    paidAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    // Rate limit: max 10 payment recordings per minute per user
    enforceRateLimit(user._id.toString(), "recordPayment", {
      maxRequests: 10,
      windowMs: 60000,
    });

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "paid") {
      throw new Error("Invoice is already paid");
    }

    if (invoice.status === "cancelled") {
      throw new Error("Cannot record payment for cancelled invoice");
    }

    if (invoice.status === "draft") {
      throw new Error("Cannot record payment for draft invoice");
    }

    // Validate payment amount
    const paymentValidation = await validatePaymentAmount(
      ctx, 
      args.invoiceId, 
      args.amount, 
      invoice.amount
    );
    if (!paymentValidation.valid) {
      throw new Error(paymentValidation.error!);
    }

    const paidAt = args.paidAt || Date.now();

    await ctx.db.insert("payments", {
      invoiceId: args.invoiceId,
      organizationId: invoice.organizationId,
      amount: args.amount,
      currency: invoice.currency,
      method: args.method,
      status: "completed",
      reference: args.reference,
      notes: args.notes,
      paidAt,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.invoiceId, {
      status: "paid",
      paidAt,
    });

    await logActivity(ctx, {
      organizationId: invoice.organizationId,
      userId: user._id,
      action: "recorded_payment",
      resourceType: "invoice",
      resourceId: args.invoiceId,
      resourceName: invoice.invoiceNumber,
    });

    await notifyOrgUsers(ctx, invoice.organizationId, {
      type: "payment_received",
      title: "Payment Received",
      message: `Payment received for invoice ${invoice.invoiceNumber}. Click to view details.`,
      link: `/invoices`,
      relatedId: args.invoiceId,
    });
  },
});

// ============================================
// STRIPE ACTIONS
// ============================================

export const createCheckoutSession = action({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const invoice = await ctx.runQuery(api.invoices.get, { id: args.invoiceId });
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status !== "pending" && invoice.displayStatus !== "overdue") {
      throw new Error("Invoice cannot be paid");
    }

    // Placeholder - Stripe integration pending
    return {
      checkoutUrl: null,
      message: "Online payment is coming soon. Please use bank transfer for now.",
    };
  },
});
