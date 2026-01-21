import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

// ============================================
// QUERIES
// ============================================

// Get recent activity for current user/organization (with cursor pagination)
// Uses composite cursor (timestamp:id) to handle timestamp collisions
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()), // Composite cursor: "timestamp:id"
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

    // Parse composite cursor if provided
    let cursorTimestamp: number | undefined;
    let cursorId: string | undefined;
    
    if (args.cursor) {
      const parts = args.cursor.split(":");
      cursorTimestamp = parseInt(parts[0], 10);
      cursorId = parts[1];
    }

    // Apply cursor filter if provided
    let activities;
    if (cursorTimestamp !== undefined) {
      // Filter by timestamp, then exclude items with same timestamp but earlier/equal ID
      activities = await activitiesQuery
        .filter((q) => 
          q.or(
            q.lt(q.field("createdAt"), cursorTimestamp!),
            q.and(
              q.eq(q.field("createdAt"), cursorTimestamp!),
              cursorId ? q.lt(q.field("_id"), cursorId as any) : q.eq(1, 1)
            )
          )
        )
        .take(limit + 1);
    } else {
      activities = await activitiesQuery.take(limit + 1);
    }

    // Check if there are more results
    const hasMore = activities.length > limit;
    if (hasMore) {
      activities = activities.slice(0, limit);
    }

    // Get next cursor (composite: timestamp:id of last item)
    const lastItem = activities[activities.length - 1];
    const nextCursor = hasMore && lastItem
      ? `${lastItem.createdAt}:${lastItem._id}`
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
