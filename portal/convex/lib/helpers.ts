import type { MutationCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";

/**
 * Log an activity to the activity logs
 */
export async function logActivity(
  ctx: MutationCtx,
  params: {
    organizationId?: Id<"organizations">;
    userId: Id<"users">;
    action: string;
    resourceType: string;
    resourceId?: Id<any>;
    resourceName?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await ctx.db.insert("activityLogs", {
    organizationId: params.organizationId,
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId?.toString(),
    resourceName: params.resourceName,
    metadata: params.metadata,
    createdAt: Date.now(),
  });
}

/**
 * Send notification to all users in an organization
 */
export async function notifyOrgUsers(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  notification: {
    type: Doc<"notifications">["type"];
    title: string;
    message: string;
    link?: string;
    relatedId?: Id<any>;
  },
  excludeUserId?: Id<"users">
) {
  const orgUsers = await ctx.db
    .query("users")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();

  for (const user of orgUsers) {
    if (excludeUserId && user._id.toString() === excludeUserId.toString()) {
      continue;
    }
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      relatedId: notification.relatedId?.toString(),
      isRead: false,
      createdAt: Date.now(),
    });
  }
}

/**
 * Send notification to all admin and staff users
 */
export async function notifyAdmins(
  ctx: MutationCtx,
  notification: {
    type: Doc<"notifications">["type"];
    title: string;
    message: string;
    link?: string;
    relatedId?: Id<any>;
  },
  excludeUserId?: Id<"users">
) {
  const admins = await ctx.db
    .query("users")
    .filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff")))
    .collect();

  for (const admin of admins) {
    if (excludeUserId && admin._id.toString() === excludeUserId.toString()) {
      continue;
    }
    await ctx.db.insert("notifications", {
      userId: admin._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      relatedId: notification.relatedId?.toString(),
      isRead: false,
      createdAt: Date.now(),
    });
  }
}

/**
 * Generate a unique invoice number using the year and a sequential counter
 * Uses index query with filter to minimize race condition window
 */
export async function generateInvoiceNumber(ctx: MutationCtx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  // Get all invoices for this year using index
  const yearInvoices = await ctx.db
    .query("invoices")
    .withIndex("by_invoice_number")
    .filter((q) => q.gte(q.field("invoiceNumber"), prefix))
    .collect();
  
  // Find the highest number
  let maxNumber = 0;
  for (const inv of yearInvoices) {
    const match = inv.invoiceNumber.match(/INV-\d{4}-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  
  // Generate next number with padding
  const nextNumber = maxNumber + 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Validate line items and ensure amounts match calculations
 */
export function validateLineItems(
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>
): { valid: boolean; error?: string; totalAmount: number } {
  if (lineItems.length === 0) {
    return { valid: false, error: "At least one line item is required", totalAmount: 0 };
  }

  let totalAmount = 0;

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    
    // Validate description
    if (!item.description || !item.description.trim()) {
      return { valid: false, error: `Line item ${i + 1}: Description is required`, totalAmount: 0 };
    }
    if (item.description.length > 500) {
      return { valid: false, error: `Line item ${i + 1}: Description too long`, totalAmount: 0 };
    }

    // Validate quantity
    if (item.quantity <= 0) {
      return { valid: false, error: `Line item ${i + 1}: Quantity must be positive`, totalAmount: 0 };
    }
    if (item.quantity > 1000000) {
      return { valid: false, error: `Line item ${i + 1}: Quantity too large`, totalAmount: 0 };
    }

    // Validate unit price (in cents)
    if (item.unitPrice < 0) {
      return { valid: false, error: `Line item ${i + 1}: Unit price cannot be negative`, totalAmount: 0 };
    }
    if (item.unitPrice > 100000000) { // 1M in cents = RM10,000
      return { valid: false, error: `Line item ${i + 1}: Unit price too large`, totalAmount: 0 };
    }

    // Validate amount matches calculation (allow small float tolerance)
    const expectedAmount = Math.round(item.quantity * item.unitPrice);
    if (Math.abs(item.amount - expectedAmount) > 1) {
      return { 
        valid: false, 
        error: `Line item ${i + 1}: Amount mismatch (expected ${expectedAmount}, got ${item.amount})`, 
        totalAmount: 0 
      };
    }

    totalAmount += item.amount;
  }

  // Validate total doesn't overflow
  if (!Number.isSafeInteger(totalAmount) || totalAmount > Number.MAX_SAFE_INTEGER) {
    return { valid: false, error: "Total amount exceeds safe limits", totalAmount: 0 };
  }

  return { valid: true, totalAmount };
}

/**
 * Validate signature data based on type
 */
export function validateSignatureData(
  signatureType: "draw" | "type" | "upload",
  signatureData: string
): { valid: boolean; error?: string } {
  if (!signatureData) {
    return { valid: false, error: "Signature data is required" };
  }

  if (signatureType === "draw" || signatureType === "upload") {
    // Validate base64 image format
    if (!signatureData.startsWith("data:image/")) {
      return { valid: false, error: "Invalid signature image format" };
    }
    
    // Check for valid base64 data URL pattern
    const base64Pattern = /^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;
    if (!base64Pattern.test(signatureData)) {
      return { valid: false, error: "Invalid signature image encoding" };
    }

    // Limit size (500KB max for base64 string ~ 375KB actual image)
    if (signatureData.length > 500 * 1024) {
      return { valid: false, error: "Signature image too large (max 500KB)" };
    }
  } else if (signatureType === "type") {
    // Typed signature validation
    if (signatureData.length > 200) {
      return { valid: false, error: "Typed signature too long (max 200 characters)" };
    }
    if (signatureData.trim().length < 2) {
      return { valid: false, error: "Typed signature too short" };
    }
  }

  return { valid: true };
}

/**
 * Validate payment amount
 */
export async function validatePaymentAmount(
  ctx: MutationCtx,
  invoiceId: Id<"invoices">,
  paymentAmount: number,
  invoiceAmount: number
): Promise<{ valid: boolean; error?: string }> {
  // Check positive amount
  if (paymentAmount <= 0) {
    return { valid: false, error: "Payment amount must be positive" };
  }

  // Check doesn't exceed invoice
  if (paymentAmount > invoiceAmount) {
    return { valid: false, error: "Payment amount exceeds invoice total" };
  }

  // Check existing payments
  const existingPayments = await ctx.db
    .query("payments")
    .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
    .filter((q) => q.eq(q.field("status"), "completed"))
    .collect();

  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  
  if (totalPaid + paymentAmount > invoiceAmount) {
    return { 
      valid: false, 
      error: `Payment would exceed invoice amount. Already paid: RM${(totalPaid / 100).toFixed(2)}, Invoice: RM${(invoiceAmount / 100).toFixed(2)}` 
    };
  }

  return { valid: true };
}
