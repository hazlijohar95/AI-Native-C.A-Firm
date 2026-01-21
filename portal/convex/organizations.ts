import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, requireAdminOrStaff, requireOrgAccess } from "./lib/auth";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Invalid email format");
  }
}

// Get organization by ID (with proper access control)
export const get = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    // Verify user has access to this organization
    await requireOrgAccess(ctx, args.id.toString());
    
    return await ctx.db.get(args.id);
  },
});

// List all organizations (admin/staff only)
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminOrStaff(ctx);
    return await ctx.db.query("organizations").collect();
  },
});

// Create organization (admin only)
export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    registrationNumber: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAdmin(ctx);

    // Validate inputs
    if (!args.name.trim()) {
      throw new Error("Organization name is required");
    }
    if (args.name.length > 200) {
      throw new Error("Organization name too long (max 200 characters)");
    }
    validateEmail(args.email);

    const orgId = await ctx.db.insert("organizations", {
      name: args.name.trim(),
      email: args.email.toLowerCase().trim(),
      registrationNumber: args.registrationNumber?.trim(),
      phone: args.phone?.trim(),
      address: args.address?.trim(),
      createdAt: Date.now(),
      createdBy: currentUser._id,
    });

    return orgId;
  },
});

// Update organization (admin only)
export const update = mutation({
  args: {
    id: v.id("organizations"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...updates } = args;
    
    // Validate email if provided
    if (updates.email !== undefined) {
      validateEmail(updates.email);
    }

    // Validate name if provided
    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        throw new Error("Organization name is required");
      }
      if (updates.name.length > 200) {
        throw new Error("Organization name too long (max 200 characters)");
      }
    }
    
    // Filter out undefined values and ensure type safety
    const filteredUpdates: Partial<{
      name: string;
      email: string;
      registrationNumber: string;
      phone: string;
      address: string;
    }> = {};
    
    if (updates.name !== undefined) filteredUpdates.name = updates.name.trim();
    if (updates.email !== undefined) filteredUpdates.email = updates.email.toLowerCase().trim();
    if (updates.registrationNumber !== undefined) filteredUpdates.registrationNumber = updates.registrationNumber.trim();
    if (updates.phone !== undefined) filteredUpdates.phone = updates.phone.trim();
    if (updates.address !== undefined) filteredUpdates.address = updates.address.trim();

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);
    }
  },
});

// Get organization for current user (clients only see their own)
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    
    if (!user.organizationId) {
      return null;
    }
    
    return await ctx.db.get(user.organizationId);
  },
});

// Delete organization (admin only)
// Only allows deletion if no users, documents, tasks, invoices, or signature requests are linked
export const remove = mutation({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const org = await ctx.db.get(args.id);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check for assigned users
    const users = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .take(1);
    if (users.length > 0) {
      throw new Error("Cannot delete organization with assigned users. Please reassign or remove users first.");
    }

    // Check for documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .take(1);
    if (documents.length > 0) {
      throw new Error("Cannot delete organization with documents. Please delete documents first.");
    }

    // Check for tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .take(1);
    if (tasks.length > 0) {
      throw new Error("Cannot delete organization with tasks. Please delete tasks first.");
    }

    // Check for invoices
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .take(1);
    if (invoices.length > 0) {
      throw new Error("Cannot delete organization with invoices. Please cancel or delete invoices first.");
    }

    // Check for signature requests
    const signatureRequests = await ctx.db
      .query("signatureRequests")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .take(1);
    if (signatureRequests.length > 0) {
      throw new Error("Cannot delete organization with signature requests.");
    }

    // Safe to delete
    await ctx.db.delete(args.id);
  },
});
