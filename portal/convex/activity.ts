import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

// ============================================
// QUERIES
// ============================================

// Get recent activity for current user/organization (with cursor pagination)
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // timestamp cursor for pagination
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const limit = Math.min(args.limit || 20, 100); // Cap at 100

    let activitiesQuery;

    if (user.role === "admin" || user.role === "staff") {
      // Admin/staff see all activity
      activitiesQuery = ctx.db
        .query("activityLogs")
        .order("desc");
    } else if (user.organizationId) {
      // Clients see their organization's activity
      activitiesQuery = ctx.db
        .query("activityLogs")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .order("desc");
    } else {
      return { activities: [], nextCursor: null, hasMore: false };
    }

    // Apply cursor filter if provided
    let activities;
    if (args.cursor) {
      activities = await activitiesQuery
        .filter((q) => q.lt(q.field("createdAt"), args.cursor!))
        .take(limit + 1); // Fetch one extra to check if there are more
    } else {
      activities = await activitiesQuery.take(limit + 1);
    }

    // Check if there are more results
    const hasMore = activities.length > limit;
    if (hasMore) {
      activities = activities.slice(0, limit);
    }

    // Get next cursor (timestamp of last item)
    const nextCursor = hasMore && activities.length > 0 
      ? activities[activities.length - 1].createdAt 
      : null;

    // Batch fetch all unique users to avoid N+1 queries
    const userIds = [...new Set(activities.map((a) => a.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users.filter(Boolean).map((u) => [u!._id.toString(), u!])
    );

    // Enrich with user info using the map
    const enrichedActivities = activities.map((activity) => {
      const activityUser = userMap.get(activity.userId.toString());
      return {
        ...activity,
        userName: activityUser?.name || "Unknown User",
        userAvatar: activityUser?.avatarUrl,
      };
    });

    return {
      activities: enrichedActivities,
      nextCursor,
      hasMore,
    };
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

    // Batch fetch all unique users to avoid N+1 queries
    const userIds = [...new Set(activities.map((a) => a.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users.filter(Boolean).map((u) => [u!._id.toString(), u!])
    );

    // Enrich with user info using the map
    const enrichedActivities = activities.map((activity) => {
      const activityUser = userMap.get(activity.userId.toString());
      return {
        ...activity,
        userName: activityUser?.name || "Unknown User",
        userAvatar: activityUser?.avatarUrl,
      };
    });

    return enrichedActivities;
  },
});
