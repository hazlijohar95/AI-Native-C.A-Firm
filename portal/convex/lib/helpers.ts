import type { MutationCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 30;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate and sanitize a string input
 */
export function validateString(
  value: string,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
  } = {}
): { valid: boolean; error?: string; sanitized: string } {
  const { required = true, minLength = 0, maxLength = 10000, pattern, patternMessage } = options;
  
  const trimmed = (value || "").trim();
  
  if (required && !trimmed) {
    return { valid: false, error: `${fieldName} is required`, sanitized: "" };
  }
  
  if (!required && !trimmed) {
    return { valid: true, sanitized: "" };
  }
  
  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters`, sanitized: trimmed };
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} must be at most ${maxLength} characters`, sanitized: trimmed };
  }
  
  if (pattern && !pattern.test(trimmed)) {
    return { valid: false, error: patternMessage || `${fieldName} has invalid format`, sanitized: trimmed };
  }
  
  return { valid: true, sanitized: trimmed };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string; sanitized: string } {
  const result = validateString(email, "Email", {
    required: true,
    maxLength: 320,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: "Invalid email format",
  });
  
  if (result.valid) {
    result.sanitized = result.sanitized.toLowerCase();
  }
  
  return result;
}

/**
 * Validate phone number (basic check)
 */
export function validatePhone(phone: string): { valid: boolean; error?: string; sanitized: string } {
  return validateString(phone, "Phone", {
    required: false,
    maxLength: 20,
    pattern: /^[+]?[\d\s\-().]+$/,
    patternMessage: "Invalid phone number format",
  });
}

/**
 * Validate a positive number within bounds
 */
export function validateNumber(
  value: number,
  fieldName: string,
  options: { min?: number; max?: number; allowZero?: boolean } = {}
): { valid: boolean; error?: string } {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, allowZero = false } = options;
  
  if (typeof value !== "number" || isNaN(value)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  
  if (!allowZero && value === 0) {
    return { valid: false, error: `${fieldName} cannot be zero` };
  }
  
  if (value < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }
  
  if (value > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }
  
  return { valid: true };
}

// ============================================
// RATE LIMITING (Database-backed for serverless)
// ============================================

/**
 * Check rate limit using database storage (works in serverless environment)
 * Returns the rate limit status without throwing
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  options: { maxRequests?: number; windowMs?: number } = {}
): Promise<{ allowed: boolean; remainingRequests: number; resetIn: number }> {
  const maxRequests = options.maxRequests ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
  const now = Date.now();

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  // No existing record or window expired - create new window
  if (!existing || now > existing.windowStart + windowMs) {
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    await ctx.db.insert("rateLimits", {
      key,
      count: 1,
      windowStart: now,
    });
    return {
      allowed: true,
      remainingRequests: maxRequests - 1,
      resetIn: windowMs,
    };
  }

  // Window still active - check limit
  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetIn: existing.windowStart + windowMs - now,
    };
  }

  // Increment counter
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
  return {
    allowed: true,
    remainingRequests: maxRequests - existing.count - 1,
    resetIn: existing.windowStart + windowMs - now,
  };
}

/**
 * Enforce rate limit - throws if rate limited
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  userId: string,
  action: string,
  options: { maxRequests?: number; windowMs?: number } = {}
): Promise<void> {
  const key = `${userId}:${action}`;
  const result = await checkRateLimit(ctx, key, {
    maxRequests: options.maxRequests ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS,
    windowMs: options.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
  });

  if (!result.allowed) {
    throw new Error(
      "Too many requests. Please try again in a moment."
    );
  }
}

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
 * Get the next value from an atomic counter
 * Uses database-level atomicity to prevent race conditions
 */
async function getNextCounterValue(ctx: MutationCtx, counterName: string): Promise<number> {
  const existing = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", counterName))
    .unique();

  if (existing) {
    const nextValue = existing.value + 1;
    await ctx.db.patch(existing._id, { value: nextValue });
    return nextValue;
  }

  // Counter doesn't exist, create it starting at 1
  await ctx.db.insert("counters", {
    name: counterName,
    value: 1,
  });
  return 1;
}

/**
 * Generate a unique invoice number using atomic counter
 * Format: INV-YYYY-XXXX (e.g., INV-2026-0001)
 * 
 * Uses a database counter to guarantee uniqueness even under concurrent requests.
 * Each year has its own counter that resets.
 */
export async function generateInvoiceNumber(ctx: MutationCtx): Promise<string> {
  const year = new Date().getFullYear();
  const counterName = `invoice_${year}`;
  
  // Get next number atomically from counter
  const nextNumber = await getNextCounterValue(ctx, counterName);
  
  // Format with 4-digit padding (supports up to 9999 invoices per year)
  // If more needed, padding auto-expands (e.g., 10000 becomes INV-2026-10000)
  const paddedNumber = String(nextNumber).padStart(4, "0");
  
  return `INV-${year}-${paddedNumber}`;
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
