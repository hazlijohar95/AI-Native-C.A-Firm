import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authKit } from "./auth";
import { requireAuth, requireAdmin, requireAdminOrStaff, getCurrentUserOrNull } from "./lib/auth";

// Get current authenticated user from WorkOS AuthKit component
export const getAuthUser = query({
  args: {},
  handler: async (ctx) => {
    return await authKit.getAuthUser(ctx);
  },
});

// Get current user from our custom users table
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserOrNull(ctx);
  },
});

// Get user by WorkOS ID (admin/staff only, or self)
export const getByWorkosId = query({
  args: { workosId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Allow users to look up themselves
    if (identity.subject === args.workosId) {
      return await ctx.db
        .query("users")
        .withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
        .unique();
    }

    // Otherwise require admin/staff
    await requireAdminOrStaff(ctx);
    
    return await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
      .unique();
  },
});

// Manual user sync (fallback if webhook fails)
export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
      .unique();

    if (existingUser) {
      // Update last login
      await ctx.db.patch(existingUser._id, {
        lastLoginAt: Date.now(),
      });
      return existingUser._id;
    }

    // Create new user if webhook hasn't fired yet
    const userId = await ctx.db.insert("users", {
      workosId: identity.subject,
      email: identity.email || "",
      name: identity.name || identity.email || "User",
      avatarUrl: identity.pictureUrl || undefined,
      role: "client",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });

    return userId;
  },
});

// Update user role (admin only)
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("client"), v.literal("staff")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

// Assign user to organization (admin only)
export const assignToOrganization = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Verify organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    await ctx.db.patch(args.userId, { organizationId: args.organizationId });
  },
});

// Remove user from organization (admin only)
export const removeFromOrganization = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, { organizationId: undefined });
  },
});

// List all users (admin/staff only)
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminOrStaff(ctx);
    return await ctx.db.query("users").collect();
  },
});

// Get users by organization (admin/staff, or own org for clients)
export const listByOrganization = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    
    // Clients can only see users in their own organization
    if (user.role === "client" && user.organizationId?.toString() !== args.organizationId.toString()) {
      throw new Error("Access denied");
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // For clients, filter out deactivated users
    if (user.role === "client") {
      return users.filter(u => u.isActive !== false);
    }

    return users;
  },
});

// Deactivate user (admin only) - soft delete
export const deactivate = mutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAdmin(ctx);
    
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Prevent deactivating yourself
    if (user._id.toString() === currentUser._id.toString()) {
      throw new Error("Cannot deactivate your own account");
    }

    // Prevent deactivating another admin
    if (user.role === "admin") {
      throw new Error("Cannot deactivate admin users");
    }

    // Check if already deactivated
    if (user.isActive === false) {
      throw new Error("User is already deactivated");
    }

    await ctx.db.patch(args.userId, {
      isActive: false,
      deactivatedAt: Date.now(),
      deactivatedBy: currentUser._id,
      deactivationReason: args.reason?.trim() || undefined,
    });
  },
});

// Reactivate user (admin only)
export const reactivate = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if already active
    if (user.isActive !== false) {
      throw new Error("User is already active");
    }

    await ctx.db.patch(args.userId, {
      isActive: true,
      deactivatedAt: undefined,
      deactivatedBy: undefined,
      deactivationReason: undefined,
    });
  },
});

// List active users only (admin/staff)
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminOrStaff(ctx);
    const users = await ctx.db.query("users").collect();
    // Filter active users (isActive undefined or true means active)
    return users.filter(u => u.isActive !== false);
  },
});
