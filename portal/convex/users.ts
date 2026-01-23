import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { authKit } from "./auth";
import { requireAuth, requireAdmin, requireAdminOrStaff, getCurrentUserOrNull } from "./lib/auth";
import { enforceRateLimit, logActivity } from "./lib/helpers";

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
    const admin = await requireAdmin(ctx);
    
    // Rate limit: max 10 role changes per minute
    await enforceRateLimit(ctx, admin._id.toString(), "updateRole", {
      maxRequests: 10,
      windowMs: 60000,
    });

    // Get the user being updated
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const previousRole = user.role;
    
    // Update role
    await ctx.db.patch(args.userId, { role: args.role });

    // Log the role change for audit
    await logActivity(ctx, {
      userId: admin._id,
      action: "changed_user_role",
      resourceType: "user",
      resourceId: args.userId,
      resourceName: user.name,
      metadata: { previousRole, newRole: args.role },
    });
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

// Update own profile (any authenticated user)
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) {
      const trimmedName = args.name.trim();
      if (!trimmedName) {
        throw new Error("Name is required");
      }
      if (trimmedName.length > 100) {
        throw new Error("Name is too long (max 100 characters)");
      }
      updates.name = trimmedName;
    }

    if (args.phone !== undefined) {
      const trimmedPhone = args.phone.trim();
      if (trimmedPhone && trimmedPhone.length > 20) {
        throw new Error("Phone number is too long (max 20 characters)");
      }
      updates.phone = trimmedPhone || undefined;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }

    return await ctx.db.get(user._id);
  },
});

// Mark onboarding as complete
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      onboardingCompletedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// EMAIL PREFERENCES
// ============================================

// Get email preferences for a user (internal - used by email system)
export const getEmailPreferences = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Parse the userId to get the Convex ID
    const users = await ctx.db.query("users").collect();
    const user = users.find(u => u._id.toString() === args.userId);

    if (!user) {
      return null;
    }

    // Return preferences with defaults (all enabled by default)
    return {
      documentRequests: user.emailPreferences?.documentRequests ?? true,
      taskAssignments: user.emailPreferences?.taskAssignments ?? true,
      taskComments: user.emailPreferences?.taskComments ?? true,
      invoices: user.emailPreferences?.invoices ?? true,
      signatures: user.emailPreferences?.signatures ?? true,
      announcements: user.emailPreferences?.announcements ?? true,
    };
  },
});

// Get current user's email preferences
export const getMyEmailPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    // Return preferences with defaults (all enabled by default)
    return {
      documentRequests: user.emailPreferences?.documentRequests ?? true,
      taskAssignments: user.emailPreferences?.taskAssignments ?? true,
      taskComments: user.emailPreferences?.taskComments ?? true,
      invoices: user.emailPreferences?.invoices ?? true,
      signatures: user.emailPreferences?.signatures ?? true,
      announcements: user.emailPreferences?.announcements ?? true,
    };
  },
});

// Update email preferences
export const updateEmailPreferences = mutation({
  args: {
    documentRequests: v.optional(v.boolean()),
    taskAssignments: v.optional(v.boolean()),
    taskComments: v.optional(v.boolean()),
    invoices: v.optional(v.boolean()),
    signatures: v.optional(v.boolean()),
    announcements: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Merge with existing preferences
    const currentPrefs = user.emailPreferences || {};
    const newPrefs = {
      documentRequests: args.documentRequests ?? currentPrefs.documentRequests ?? true,
      taskAssignments: args.taskAssignments ?? currentPrefs.taskAssignments ?? true,
      taskComments: args.taskComments ?? currentPrefs.taskComments ?? true,
      invoices: args.invoices ?? currentPrefs.invoices ?? true,
      signatures: args.signatures ?? currentPrefs.signatures ?? true,
      announcements: args.announcements ?? currentPrefs.announcements ?? true,
    };

    await ctx.db.patch(user._id, {
      emailPreferences: newPrefs,
    });

    return newPrefs;
  },
});
