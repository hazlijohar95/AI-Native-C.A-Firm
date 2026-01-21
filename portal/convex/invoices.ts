import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";
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

    let invoices;

    if (user.role === "admin" || user.role === "staff") {
      // Admin/staff see all invoices
      invoices = await ctx.db.query("invoices").collect();
    } else if (user.organizationId) {
      // Clients see their organization's invoices (exclude drafts)
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
      // Clients don't see draft invoices
      invoices = invoices.filter((inv) => inv.status !== "draft");
    } else {
      return [];
    }

    // Filter by status if specified
    if (args.status) {
      invoices = invoices.filter((inv) => inv.status === args.status);
    }

    // Check for overdue invoices and update status
    const now = Date.now();
    for (const inv of invoices) {
      if (inv.status === "pending" && inv.dueDate < now) {
        // Mark as overdue (this is a side effect, but acceptable for status sync)
        inv.status = "overdue";
      }
    }

    // Sort by issued date descending
    invoices.sort((a, b) => b.issuedDate - a.issuedDate);

    // Fetch organization names for admin view
    if (user.role === "admin" || user.role === "staff") {
      const orgIds = [...new Set(invoices.map((inv) => inv.organizationId))];
      const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
      const orgMap = new Map(
        orgs.filter(Boolean).map((org) => [org!._id.toString(), org!.name])
      );

      return invoices.map((inv) => ({
        ...inv,
        organizationName: orgMap.get(inv.organizationId.toString()) || "Unknown",
      }));
    }

    return invoices;
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
      // Clients can't see draft invoices
      if (invoice.status === "draft") {
        throw new Error("Access denied");
      }
    }

    // Get organization info
    const org = await ctx.db.get(invoice.organizationId);

    return {
      ...invoice,
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

    const pending = invoices.filter(
      (inv) => inv.status === "pending" && inv.dueDate >= now
    ).length;

    const overdue = invoices.filter(
      (inv) => (inv.status === "pending" || inv.status === "overdue") && inv.dueDate < now
    ).length;

    const totalUnpaid = invoices
      .filter((inv) => inv.status === "pending" || inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.amount, 0);

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

    // Check access
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

    // Validate inputs
    if (!args.description.trim()) {
      throw new Error("Description is required");
    }
    if (args.lineItems.length === 0) {
      throw new Error("At least one line item is required");
    }

    // Calculate total amount
    const amount = args.lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Generate invoice number
    const year = new Date().getFullYear();
    const existingInvoices = await ctx.db
      .query("invoices")
      .collect();
    const yearInvoices = existingInvoices.filter((inv) => 
      inv.invoiceNumber.includes(`INV-${year}`)
    );
    const nextNumber = yearInvoices.length + 1;
    const invoiceNumber = `INV-${year}-${String(nextNumber).padStart(4, "0")}`;

    const invoiceId = await ctx.db.insert("invoices", {
      organizationId: args.organizationId,
      invoiceNumber,
      description: args.description.trim(),
      amount,
      currency: "MYR",
      status: args.isDraft ? "draft" : "pending",
      dueDate: args.dueDate,
      issuedDate: Date.now(),
      lineItems: args.lineItems,
      notes: args.notes?.trim(),
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: args.isDraft ? "created_draft_invoice" : "issued_invoice",
      resourceType: "invoice",
      resourceId: invoiceId,
      resourceName: invoiceNumber,
      createdAt: Date.now(),
    });

    // Notify organization users if not draft
    if (!args.isDraft) {
      const orgUsers = await ctx.db
        .query("users")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
        .collect();

      for (const orgUser of orgUsers) {
        await ctx.db.insert("notifications", {
          userId: orgUser._id,
          type: "invoice_due",
          title: "New Invoice",
          message: `Invoice ${invoiceNumber} for RM${(amount / 100).toFixed(2)} has been issued`,
          link: `/invoices`,
          relatedId: invoiceId,
          isRead: false,
          createdAt: Date.now(),
        });
      }
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
    await requireAdminOrStaff(ctx);

    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Only drafts can be edited
    if (invoice.status !== "draft") {
      throw new Error("Only draft invoices can be edited");
    }

    const updates: Record<string, unknown> = {};

    if (args.description !== undefined) {
      if (!args.description.trim()) {
        throw new Error("Description is required");
      }
      updates.description = args.description.trim();
    }

    if (args.lineItems !== undefined) {
      if (args.lineItems.length === 0) {
        throw new Error("At least one line item is required");
      }
      updates.lineItems = args.lineItems;
      updates.amount = args.lineItems.reduce((sum, item) => sum + item.amount, 0);
    }

    if (args.dueDate !== undefined) {
      updates.dueDate = args.dueDate;
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes.trim();
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.id, updates);
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

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: invoice.organizationId,
      userId: user._id,
      action: "issued_invoice",
      resourceType: "invoice",
      resourceId: args.id,
      resourceName: invoice.invoiceNumber,
      createdAt: Date.now(),
    });

    // Notify organization users
    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", invoice.organizationId))
      .collect();

    for (const orgUser of orgUsers) {
      await ctx.db.insert("notifications", {
        userId: orgUser._id,
        type: "invoice_due",
        title: "New Invoice",
        message: `Invoice ${invoice.invoiceNumber} for RM${(invoice.amount / 100).toFixed(2)} has been issued`,
        link: `/invoices`,
        relatedId: args.id,
        isRead: false,
        createdAt: Date.now(),
      });
    }
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

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: invoice.organizationId,
      userId: user._id,
      action: "cancelled_invoice",
      resourceType: "invoice",
      resourceId: args.id,
      resourceName: invoice.invoiceNumber,
      createdAt: Date.now(),
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

    const paidAt = args.paidAt || Date.now();

    // Create payment record
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

    // Update invoice status
    await ctx.db.patch(args.invoiceId, {
      status: "paid",
      paidAt,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: invoice.organizationId,
      userId: user._id,
      action: "recorded_payment",
      resourceType: "invoice",
      resourceId: args.invoiceId,
      resourceName: invoice.invoiceNumber,
      createdAt: Date.now(),
    });

    // Notify organization users
    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", invoice.organizationId))
      .collect();

    for (const orgUser of orgUsers) {
      await ctx.db.insert("notifications", {
        userId: orgUser._id,
        type: "payment_received",
        title: "Payment Received",
        message: `Payment of RM${(args.amount / 100).toFixed(2)} received for invoice ${invoice.invoiceNumber}`,
        link: `/invoices`,
        relatedId: args.invoiceId,
        isRead: false,
        createdAt: Date.now(),
      });
    }
  },
});

// ============================================
// STRIPE ACTIONS
// ============================================

// Create Stripe checkout session
export const createCheckoutSession = action({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    // Get identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get invoice
    const invoice = await ctx.runQuery(api.invoices.get, { id: args.invoiceId });
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status !== "pending" && invoice.status !== "overdue") {
      throw new Error("Invoice cannot be paid");
    }

    // TODO: Create Stripe checkout session when Stripe is configured
    // For now, return a placeholder indicating Stripe needs to be set up
    // When ready, configure STRIPE_SECRET_KEY in Convex environment variables
    // and implement the checkout session creation

    // Placeholder response - Stripe not yet configured
    return {
      checkoutUrl: null,
      message: "Online payment is coming soon. Please use bank transfer for now.",
    };

    // When Stripe is configured, the implementation would look like:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const session = await stripe.checkout.sessions.create({
    //   mode: "payment",
    //   payment_method_types: ["card", "fpx"],
    //   line_items: invoice.lineItems.map(item => ({
    //     price_data: {
    //       currency: invoice.currency.toLowerCase(),
    //       product_data: { name: item.description },
    //       unit_amount: item.unitPrice,
    //     },
    //     quantity: item.quantity,
    //   })),
    //   success_url: `${siteUrl}/invoices?success=true&invoice=${args.invoiceId}`,
    //   cancel_url: `${siteUrl}/invoices?cancelled=true&invoice=${args.invoiceId}`,
    //   metadata: { invoiceId: args.invoiceId },
    // });
    // return { checkoutUrl: session.url };
  },
});
