import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

// ============================================
// QUERIES
// ============================================

// Get recent activity for current user/organization
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const limit = args.limit || 20;

    let activities;

    if (user.role === "admin" || user.role === "staff") {
      // Admin/staff see all activity
      activities = await ctx.db
        .query("activityLogs")
        .order("desc")
        .take(limit);
    } else if (user.organizationId) {
      // Clients see their organization's activity
      activities = await ctx.db
        .query("activityLogs")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .order("desc")
        .take(limit);
    } else {
      return [];
    }

    // Enrich with user info
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        const activityUser = await ctx.db.get(activity.userId);
        return {
          ...activity,
          userName: activityUser?.name || "Unknown User",
          userAvatar: activityUser?.avatarUrl,
        };
      })
    );

    return enrichedActivities;
  },
});

// Get activity for a specific organization
export const listByOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const limit = args.limit || 20;

    // Check access
    if (user.role === "client") {
      if (args.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    const activities = await ctx.db
      .query("activityLogs")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(limit);

    // Enrich with user info
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        const activityUser = await ctx.db.get(activity.userId);
        return {
          ...activity,
          userName: activityUser?.name || "Unknown User",
          userAvatar: activityUser?.avatarUrl,
        };
      })
    );

    return enrichedActivities;
  },
});
