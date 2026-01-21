import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";

// ============================================
// QUERIES
// ============================================

// List announcements visible to current user
export const list = query({
  args: {
    type: v.optional(v.union(
      v.literal("general"),
      v.literal("tax_update"),
      v.literal("deadline"),
      v.literal("news")
    )),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const now = Date.now();

    // Get all announcements
    let announcements = await ctx.db
      .query("announcements")
      .withIndex("by_published")
      .collect();

    // Filter to only published (publishedAt <= now)
    announcements = announcements.filter((a) => a.publishedAt <= now);

    // Filter out expired
    announcements = announcements.filter((a) => !a.expiresAt || a.expiresAt > now);

    // Filter by organization access
    if (user.role === "client" && user.organizationId) {
      announcements = announcements.filter((a) => {
        // If no target orgs, it's visible to all
        if (!a.targetOrganizations || a.targetOrganizations.length === 0) {
          return true;
        }
        // Otherwise check if user's org is in the list
        return a.targetOrganizations.some(
          (orgId) => orgId.toString() === user.organizationId?.toString()
        );
      });
    }

    // Filter by type if specified
    if (args.type) {
      announcements = announcements.filter((a) => a.type === args.type);
    }

    // Get read status for each announcement
    const reads = await ctx.db
      .query("announcementReads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const readIds = new Set(reads.map((r) => r.announcementId.toString()));

    // Add isRead flag and sort
    const announcementsWithReadStatus = announcements.map((a) => ({
      ...a,
      isRead: readIds.has(a._id.toString()),
    }));

    // Sort: pinned first, then by publishedAt descending
    announcementsWithReadStatus.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.publishedAt - a.publishedAt;
    });

    return announcementsWithReadStatus;
  },
});

// Get single announcement
export const get = query({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const announcement = await ctx.db.get(args.id);

    if (!announcement) {
      return null;
    }

    // Check access for clients
    if (user.role === "client" && user.organizationId) {
      if (announcement.targetOrganizations && announcement.targetOrganizations.length > 0) {
        const hasAccess = announcement.targetOrganizations.some(
          (orgId) => orgId.toString() === user.organizationId?.toString()
        );
        if (!hasAccess) {
          throw new Error("Access denied");
        }
      }
    }

    // Check if read
    const read = await ctx.db
      .query("announcementReads")
      .withIndex("by_user_announcement", (q) =>
        q.eq("userId", user._id).eq("announcementId", args.id)
      )
      .unique();

    return {
      ...announcement,
      isRead: !!read,
    };
  },
});

// Count unread announcements
export const countUnread = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const now = Date.now();

    // Get all visible announcements
    let announcements = await ctx.db
      .query("announcements")
      .withIndex("by_published")
      .collect();

    // Filter to only published and not expired
    announcements = announcements.filter((a) => 
      a.publishedAt <= now && (!a.expiresAt || a.expiresAt > now)
    );

    // Filter by organization access for clients
    if (user.role === "client" && user.organizationId) {
      announcements = announcements.filter((a) => {
        if (!a.targetOrganizations || a.targetOrganizations.length === 0) {
          return true;
        }
        return a.targetOrganizations.some(
          (orgId) => orgId.toString() === user.organizationId?.toString()
        );
      });
    }

    // Get reads
    const reads = await ctx.db
      .query("announcementReads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const readIds = new Set(reads.map((r) => r.announcementId.toString()));

    // Count unread
    return announcements.filter((a) => !readIds.has(a._id.toString())).length;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Create announcement (admin/staff only)
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("general"),
      v.literal("tax_update"),
      v.literal("deadline"),
      v.literal("news")
    ),
    targetOrganizations: v.optional(v.array(v.id("organizations"))),
    publishedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    const announcementId = await ctx.db.insert("announcements", {
      title: args.title,
      content: args.content,
      type: args.type,
      targetOrganizations: args.targetOrganizations,
      publishedAt: args.publishedAt || Date.now(),
      expiresAt: args.expiresAt,
      isPinned: args.isPinned || false,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // Create notifications for target users
    let targetUsers;
    if (args.targetOrganizations && args.targetOrganizations.length > 0) {
      // Get users from specific organizations
      const allUsers = await ctx.db.query("users").collect();
      targetUsers = allUsers.filter((u) =>
        u.organizationId &&
        args.targetOrganizations!.some((orgId) => orgId.toString() === u.organizationId?.toString())
      );
    } else {
      // All clients
      targetUsers = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "client"))
        .collect();
    }

    // Create notifications
    for (const targetUser of targetUsers) {
      await ctx.db.insert("notifications", {
        userId: targetUser._id,
        type: "new_announcement",
        title: "New Announcement",
        message: args.title,
        link: `/announcements`,
        relatedId: announcementId,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return announcementId;
  },
});

// Mark announcement as read
export const markRead = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Check if already read
    const existing = await ctx.db
      .query("announcementReads")
      .withIndex("by_user_announcement", (q) =>
        q.eq("userId", user._id).eq("announcementId", args.id)
      )
      .unique();

    if (existing) {
      return; // Already read
    }

    await ctx.db.insert("announcementReads", {
      announcementId: args.id,
      userId: user._id,
      readAt: Date.now(),
    });
  },
});

// Update announcement (admin/staff only)
export const update = mutation({
  args: {
    id: v.id("announcements"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("general"),
      v.literal("tax_update"),
      v.literal("deadline"),
      v.literal("news")
    )),
    targetOrganizations: v.optional(v.array(v.id("organizations"))),
    publishedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const { id, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);
    }
  },
});

// Delete announcement (admin/staff only)
export const remove = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    // Delete all reads for this announcement
    const reads = await ctx.db
      .query("announcementReads")
      .withIndex("by_announcement", (q) => q.eq("announcementId", args.id))
      .collect();

    for (const read of reads) {
      await ctx.db.delete(read._id);
    }

    // Delete the announcement
    await ctx.db.delete(args.id);
  },
});
