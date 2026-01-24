import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";

// Valid announcement types
const announcementTypes = v.union(
  v.literal("general"),
  v.literal("tax_deadline"),
  v.literal("regulatory"),
  v.literal("firm_news"),
  v.literal("maintenance"),
  v.literal("tip")
);

// ============================================
// QUERIES
// ============================================

// List announcements visible to current user
export const list = query({
  args: {
    type: v.optional(announcementTypes),
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
    if (user.role === "client") {
      if (!user.organizationId) {
        // Clients without org can only see general announcements with no targeting
        announcements = announcements.filter((a) => 
          !a.targetOrganizations || a.targetOrganizations.length === 0
        );
      } else {
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
    if (user.role === "client") {
      if (announcement.targetOrganizations && announcement.targetOrganizations.length > 0) {
        if (!user.organizationId) {
          throw new Error("Access denied");
        }
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
    if (user.role === "client") {
      if (!user.organizationId) {
        announcements = announcements.filter((a) => 
          !a.targetOrganizations || a.targetOrganizations.length === 0
        );
      } else {
        announcements = announcements.filter((a) => {
          if (!a.targetOrganizations || a.targetOrganizations.length === 0) {
            return true;
          }
          return a.targetOrganizations.some(
            (orgId) => orgId.toString() === user.organizationId?.toString()
          );
        });
      }
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
    type: announcementTypes,
    targetOrganizations: v.optional(v.array(v.id("organizations"))),
    publishedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    // Validate inputs
    if (!args.title.trim()) {
      throw new Error("Title is required");
    }
    if (args.title.length > 200) {
      throw new Error("Title too long");
    }
    if (!args.content.trim()) {
      throw new Error("Content is required");
    }

    // Validate target organizations exist
    if (args.targetOrganizations && args.targetOrganizations.length > 0) {
      for (const orgId of args.targetOrganizations) {
        const org = await ctx.db.get(orgId);
        if (!org) {
          throw new Error(`Organization ${orgId} not found`);
        }
      }
    }

    const announcementId = await ctx.db.insert("announcements", {
      title: args.title.trim(),
      content: args.content.trim(),
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
        message: args.title.trim(),
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

    // Verify announcement exists
    const announcement = await ctx.db.get(args.id);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    // Verify access for clients
    if (user.role === "client") {
      if (announcement.targetOrganizations && announcement.targetOrganizations.length > 0) {
        if (!user.organizationId) {
          throw new Error("Access denied");
        }
        const hasAccess = announcement.targetOrganizations.some(
          (orgId) => orgId.toString() === user.organizationId?.toString()
        );
        if (!hasAccess) {
          throw new Error("Access denied");
        }
      }
    }

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
    type: v.optional(announcementTypes),
    targetOrganizations: v.optional(v.array(v.id("organizations"))),
    publishedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const announcement = await ctx.db.get(args.id);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    // Validate title if provided
    if (args.title !== undefined) {
      if (!args.title.trim()) {
        throw new Error("Title is required");
      }
      if (args.title.length > 200) {
        throw new Error("Title too long");
      }
    }

    const { id, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = typeof value === "string" ? value.trim() : value;
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

    const announcement = await ctx.db.get(args.id);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

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

// ============================================
// INTERNAL FUNCTIONS (for cron job)
// ============================================

// Publish scheduled announcements - called by cron job
export const publishScheduled = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all announcements that are scheduled but not yet "published" (publishedAt > now when created)
    // Since publishedAt is always set, we look for announcements where:
    // - createdAt < publishedAt (was scheduled for future)
    // - publishedAt <= now (now ready to publish)
    // - No notifications have been sent yet (we track this by checking if notifications exist)

    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_published")
      .collect();

    let publishedCount = 0;

    for (const announcement of announcements) {
      // Check if this was a scheduled announcement that just became active
      // We identify scheduled announcements as those where createdAt < publishedAt
      // and publishedAt is within the last hour (to avoid re-processing old ones)
      const wasScheduled = announcement.createdAt < announcement.publishedAt;
      const justPublished = announcement.publishedAt <= now &&
                           announcement.publishedAt > (now - 60 * 60 * 1000); // Within last hour

      if (!wasScheduled || !justPublished) continue;

      // Check if notifications were already sent (by checking if any exist)
      const existingNotifications = await ctx.db
        .query("notifications")
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "new_announcement"),
            q.eq(q.field("relatedId"), announcement._id)
          )
        )
        .first();

      if (existingNotifications) continue; // Already sent notifications

      // Send notifications now
      let targetUsers;
      if (announcement.targetOrganizations && announcement.targetOrganizations.length > 0) {
        const allUsers = await ctx.db.query("users").collect();
        targetUsers = allUsers.filter((u) =>
          u.organizationId &&
          announcement.targetOrganizations!.some(
            (orgId) => orgId.toString() === u.organizationId?.toString()
          )
        );
      } else {
        targetUsers = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("role"), "client"))
          .collect();
      }

      for (const targetUser of targetUsers) {
        await ctx.db.insert("notifications", {
          userId: targetUser._id,
          type: "new_announcement",
          title: "New Announcement",
          message: announcement.title,
          link: `/announcements`,
          relatedId: announcement._id,
          isRead: false,
          createdAt: now,
        });
      }

      publishedCount++;
    }

    return { publishedCount };
  },
});
