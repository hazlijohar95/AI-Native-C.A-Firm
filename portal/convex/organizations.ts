import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, requireAdminOrStaff, requireOrgAccess } from "./lib/auth";

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

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      email: args.email,
      registrationNumber: args.registrationNumber,
      phone: args.phone,
      address: args.address,
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
    
    // Filter out undefined values and ensure type safety
    const filteredUpdates: Partial<{
      name: string;
      email: string;
      registrationNumber: string;
      phone: string;
      address: string;
    }> = {};
    
    if (updates.name !== undefined) filteredUpdates.name = updates.name;
    if (updates.email !== undefined) filteredUpdates.email = updates.email;
    if (updates.registrationNumber !== undefined) filteredUpdates.registrationNumber = updates.registrationNumber;
    if (updates.phone !== undefined) filteredUpdates.phone = updates.phone;
    if (updates.address !== undefined) filteredUpdates.address = updates.address;

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
