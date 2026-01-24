import { query, mutation, action, internalMutation } from "./_generated/server";
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

// Get financial summary for dashboard
export const getFinancialSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const now = Date.now();

    // Get date boundaries
    const today = new Date(now);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime();
    const lastMonthEnd = currentMonthStart - 1;
    const yearStart = new Date(today.getFullYear(), 0, 1).getTime();

    // Aging buckets (in days)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

    let invoices;
    let payments;

    if (user.role === "admin" || user.role === "staff") {
      invoices = await ctx.db.query("invoices").collect();
      payments = await ctx.db.query("payments").collect();
    } else if (user.organizationId) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
      payments = await ctx.db
        .query("payments")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
      // Exclude drafts for clients
      invoices = invoices.filter((inv) => inv.status !== "draft");
    } else {
      return {
        currentMonth: { invoiced: 0, paid: 0 },
        lastMonth: { invoiced: 0, paid: 0 },
        ytd: { invoiced: 0, paid: 0 },
        outstanding: {
          total: 0,
          aging: { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyPlus: 0 },
        },
        avgDaysToPayment: 0,
        monthlyTrend: [],
      };
    }

    // Calculate totals
    // Current month invoiced
    const currentMonthInvoiced = invoices
      .filter((inv) => inv.issuedDate >= currentMonthStart && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Current month paid
    const currentMonthPaid = payments
      .filter((p) => p.paidAt >= currentMonthStart && p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    // Last month invoiced
    const lastMonthInvoiced = invoices
      .filter((inv) => inv.issuedDate >= lastMonthStart && inv.issuedDate <= lastMonthEnd && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + inv.amount, 0);

    // Last month paid
    const lastMonthPaid = payments
      .filter((p) => p.paidAt >= lastMonthStart && p.paidAt <= lastMonthEnd && p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    // YTD invoiced
    const ytdInvoiced = invoices
      .filter((inv) => inv.issuedDate >= yearStart && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + inv.amount, 0);

    // YTD paid
    const ytdPaid = payments
      .filter((p) => p.paidAt >= yearStart && p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    // Outstanding invoices with aging
    const outstandingInvoices = invoices.filter(
      (inv) => inv.status === "pending" || inv.status === "overdue"
    );

    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    // Aging buckets based on due date
    const aging = {
      current: 0,      // Not yet due
      thirtyDays: 0,   // 1-30 days overdue
      sixtyDays: 0,    // 31-60 days overdue
      ninetyPlus: 0,   // 90+ days overdue
    };

    for (const inv of outstandingInvoices) {
      if (inv.dueDate >= now) {
        aging.current += inv.amount;
      } else if (inv.dueDate >= thirtyDaysAgo) {
        aging.thirtyDays += inv.amount;
      } else if (inv.dueDate >= sixtyDaysAgo) {
        aging.sixtyDays += inv.amount;
      } else {
        aging.ninetyPlus += inv.amount;
      }
    }

    // Average days to payment for paid invoices
    const paidInvoices = invoices.filter((inv) => inv.status === "paid" && inv.paidAt);
    let avgDaysToPayment = 0;
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        const daysToPay = Math.floor((inv.paidAt! - inv.issuedDate) / (24 * 60 * 60 * 1000));
        return sum + Math.max(0, daysToPay);
      }, 0);
      avgDaysToPayment = Math.round(totalDays / paidInvoices.length);
    }

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = monthDate.getTime();
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).getTime() - 1;

      const monthInvoiced = invoices
        .filter((inv) => inv.issuedDate >= monthStart && inv.issuedDate <= monthEnd && inv.status !== "cancelled")
        .reduce((sum, inv) => sum + inv.amount, 0);

      const monthPaid = payments
        .filter((p) => p.paidAt >= monthStart && p.paidAt <= monthEnd && p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0);

      monthlyTrend.push({
        month: monthDate.toLocaleString("default", { month: "short" }),
        year: monthDate.getFullYear(),
        invoiced: monthInvoiced,
        paid: monthPaid,
      });
    }

    return {
      currentMonth: { invoiced: currentMonthInvoiced, paid: currentMonthPaid },
      lastMonth: { invoiced: lastMonthInvoiced, paid: lastMonthPaid },
      ytd: { invoiced: ytdInvoiced, paid: ytdPaid },
      outstanding: {
        total: totalOutstanding,
        aging,
      },
      avgDaysToPayment,
      monthlyTrend,
    };
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
    await enforceRateLimit(ctx, user._id.toString(), "recordPayment", {
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

// Create checkout session for online payment
export const createCheckoutSession = action({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    checkoutUrl: string | null;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const invoice = await ctx.runQuery(api.invoices.get, { id: args.invoiceId });
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status !== "pending" && invoice.displayStatus !== "overdue") {
      throw new Error("Invoice cannot be paid online");
    }

    // Check if Stripe is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return {
        success: false,
        message: "Online payment is coming soon. Please use bank transfer for now.",
        checkoutUrl: null,
      };
    }

    // Create Stripe checkout session
    try {
      const portalUrl = process.env.PORTAL_URL || "https://portal.amjadhazli.com";

      // Build line items for Stripe
      const lineItems = invoice.lineItems.map((item: {
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
      }) => ({
        price_data: {
          currency: invoice.currency.toLowerCase(),
          product_data: {
            name: item.description,
          },
          unit_amount: item.unitPrice, // Already in cents
        },
        quantity: item.quantity,
      }));

      // Create checkout session via Stripe API
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "mode": "payment",
          "success_url": `${portalUrl}/invoices?payment=success&invoice=${invoice.invoiceNumber}`,
          "cancel_url": `${portalUrl}/invoices?payment=cancelled&invoice=${invoice.invoiceNumber}`,
          "client_reference_id": args.invoiceId.toString(),
          "customer_email": identity.email || "",
          "metadata[invoice_id]": args.invoiceId.toString(),
          "metadata[invoice_number]": invoice.invoiceNumber,
          ...lineItems.reduce((acc: Record<string, string>, item: {
            price_data: {
              currency: string;
              product_data: { name: string };
              unit_amount: number;
            };
            quantity: number;
          }, index: number) => {
            acc[`line_items[${index}][price_data][currency]`] = item.price_data.currency;
            acc[`line_items[${index}][price_data][product_data][name]`] = item.price_data.product_data.name;
            acc[`line_items[${index}][price_data][unit_amount]`] = item.price_data.unit_amount.toString();
            acc[`line_items[${index}][quantity]`] = item.quantity.toString();
            return acc;
          }, {} as Record<string, string>),
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Stripe API error:", errorText);
        return {
          success: false,
          message: "Failed to create payment session. Please try again or use bank transfer.",
          checkoutUrl: null,
        };
      }

      const session = await response.json();

      // Store the session ID on the invoice
      await ctx.runMutation(internal.invoices.updateStripeSession, {
        invoiceId: args.invoiceId,
        sessionId: session.id,
      });

      return {
        success: true,
        checkoutUrl: session.url,
      };
    } catch (error) {
      console.error("Stripe checkout error:", error);
      return {
        success: false,
        message: "Failed to initiate payment. Please try again or use bank transfer.",
        checkoutUrl: null,
      };
    }
  },
});

// Internal mutation to update Stripe session ID
export const updateStripeSession = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.invoiceId, {
      stripeCheckoutSessionId: args.sessionId,
    });
  },
});

// Internal mutation to record Stripe payment
export const recordStripePayment = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    paymentIntentId: v.string(),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Check if already paid
    if (invoice.status === "paid") {
      return; // Already processed
    }

    const now = Date.now();

    // Insert payment record
    await ctx.db.insert("payments", {
      invoiceId: args.invoiceId,
      organizationId: invoice.organizationId,
      amount: args.amount,
      currency: args.currency,
      method: "stripe",
      status: "completed",
      stripePaymentIntentId: args.paymentIntentId,
      paidAt: now,
      createdAt: now,
    });

    // Update invoice status
    await ctx.db.patch(args.invoiceId, {
      status: "paid",
      paidAt: now,
      stripePaymentIntentId: args.paymentIntentId,
    });

    // Get a system user for logging (or use the first admin)
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .take(1);
    
    const systemUserId = admins[0]?._id;

    if (systemUserId) {
      // Log activity
      await ctx.db.insert("activityLogs", {
        organizationId: invoice.organizationId,
        userId: systemUserId,
        action: "recorded_payment",
        resourceType: "invoice",
        resourceId: args.invoiceId.toString(),
        resourceName: invoice.invoiceNumber,
        metadata: { method: "stripe", paymentIntentId: args.paymentIntentId },
        createdAt: now,
      });
    }

    // Notify organization users
    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", invoice.organizationId))
      .collect();

    for (const user of orgUsers) {
      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "payment_received",
        title: "Payment Received",
        message: `Payment received for invoice ${invoice.invoiceNumber}. Thank you!`,
        link: `/invoices`,
        relatedId: args.invoiceId.toString(),
        isRead: false,
        createdAt: now,
      });
    }
  },
});

// ============================================
// INVOICE REMINDERS
// ============================================

// Helper to format currency for emails
function formatCurrencyForEmail(amount: number, currency: string = "MYR"): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

// Process invoice reminders (called by cron job)
export const processInvoiceReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const threeDaysMs = 3 * oneDayMs;
    const sevenDaysMs = 7 * oneDayMs;

    // Get all pending invoices (not paid, not cancelled, not draft)
    const pendingInvoices = await ctx.db
      .query("invoices")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "paid"),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "draft")
        )
      )
      .collect();

    let remindersSent = 0;

    for (const invoice of pendingInvoices) {
      const dueDate = invoice.dueDate;
      const daysUntilDue = Math.floor((dueDate - now) / oneDayMs);
      const daysOverdue = Math.floor((now - dueDate) / oneDayMs);

      // Get organization users for notifications
      const orgUsers = await ctx.db
        .query("users")
        .withIndex("by_organization", (q) => q.eq("organizationId", invoice.organizationId))
        .collect();

      // Initialize reminders tracking if needed
      const remindersSentTracking = invoice.remindersSent || {
        beforeDue: undefined,
        oneDayOverdue: undefined,
        weeklyOverdue: [],
      };

      let shouldUpdate = false;

      // 1. Send "due soon" reminder 3 days before due date
      if (daysUntilDue <= 3 && daysUntilDue > 0 && !remindersSentTracking.beforeDue) {
        for (const user of orgUsers) {
          await ctx.scheduler.runAfter(0, internal.emails.sendInvoiceDueSoonEmail, {
            recipientId: user._id.toString(),
            recipientEmail: user.email,
            recipientName: user.name,
            invoiceNumber: invoice.invoiceNumber,
            amount: formatCurrencyForEmail(invoice.amount, invoice.currency),
            dueDate: invoice.dueDate,
          });
        }
        remindersSentTracking.beforeDue = now;
        shouldUpdate = true;
        remindersSent++;
        console.log(`Sent due soon reminder for invoice ${invoice.invoiceNumber}`);
      }

      // 2. Send first overdue reminder 1 day after due date
      if (daysOverdue >= 1 && !remindersSentTracking.oneDayOverdue) {
        for (const user of orgUsers) {
          await ctx.scheduler.runAfter(0, internal.emails.sendInvoiceOverdueEmail, {
            recipientId: user._id.toString(),
            recipientEmail: user.email,
            recipientName: user.name,
            invoiceNumber: invoice.invoiceNumber,
            amount: formatCurrencyForEmail(invoice.amount, invoice.currency),
            dueDate: invoice.dueDate,
            daysOverdue: daysOverdue,
          });
        }
        remindersSentTracking.oneDayOverdue = now;
        shouldUpdate = true;
        remindersSent++;
        console.log(`Sent 1-day overdue reminder for invoice ${invoice.invoiceNumber}`);
      }

      // 3. Send weekly overdue reminders (after first overdue reminder)
      if (daysOverdue >= 7 && remindersSentTracking.oneDayOverdue) {
        const weeklyReminders = remindersSentTracking.weeklyOverdue || [];
        const lastWeeklyReminder = weeklyReminders.length > 0
          ? weeklyReminders[weeklyReminders.length - 1]
          : remindersSentTracking.oneDayOverdue;

        // Check if 7 days have passed since last weekly reminder
        const daysSinceLastReminder = Math.floor((now - lastWeeklyReminder) / oneDayMs);

        if (daysSinceLastReminder >= 7) {
          for (const user of orgUsers) {
            await ctx.scheduler.runAfter(0, internal.emails.sendInvoiceOverdueEmail, {
              recipientId: user._id.toString(),
              recipientEmail: user.email,
              recipientName: user.name,
              invoiceNumber: invoice.invoiceNumber,
              amount: formatCurrencyForEmail(invoice.amount, invoice.currency),
              dueDate: invoice.dueDate,
              daysOverdue: daysOverdue,
            });
          }
          weeklyReminders.push(now);
          remindersSentTracking.weeklyOverdue = weeklyReminders;
          shouldUpdate = true;
          remindersSent++;
          console.log(`Sent weekly overdue reminder for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`);
        }
      }

      // Update invoice with reminder tracking
      if (shouldUpdate) {
        await ctx.db.patch(invoice._id, {
          remindersSent: remindersSentTracking,
        });
      }
    }

    console.log(`Invoice reminder processing complete. Sent ${remindersSent} reminders.`);
    return { processed: pendingInvoices.length, remindersSent };
  },
});
