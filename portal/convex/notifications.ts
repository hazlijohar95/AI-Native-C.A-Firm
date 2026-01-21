import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

// ============================================
// QUERIES
// ============================================

// List notifications for current user
export const list = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const limit = args.limit || 50;

    let notifications;

    if (args.unreadOnly) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_unread", (q) =>
          q.eq("userId", user._id).eq("isRead", false)
        )
        .take(limit);
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(limit);
    }

    // Sort by createdAt descending
    return notifications.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Count unread notifications
export const countUnread = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Mark single notification as read
export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const notification = await ctx.db.get(args.id);

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Verify ownership
    if (notification.userId.toString() !== user._id.toString()) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.id, { isRead: true });
  },
});

// Mark all notifications as read
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return unread.length;
  },
});

// Delete old notifications (internal - called by cron or admin)
export const deleteOld = internalMutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.olderThanDays || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Only delete read notifications older than cutoff
    const oldNotifications = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.and(q.eq(q.field("isRead"), true), q.lt(q.field("createdAt"), cutoff))
      )
      .collect();

    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
    }

    return oldNotifications.length;
  },
});

// ============================================
// INTERNAL: Create notification (called from other Convex functions only)
// ============================================

export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("new_document"),
      v.literal("new_task"),
      v.literal("task_due"),
      v.literal("task_completed"),
      v.literal("new_announcement"),
      v.literal("invoice_due"),
      v.literal("payment_received"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      link: args.link,
      relatedId: args.relatedId,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});
