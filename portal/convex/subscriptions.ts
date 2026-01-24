import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireAuth, requireAdmin, requireAdminOrStaff } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

// ============================================
// QUERIES
// ============================================

/**
 * List all subscriptions for an organization
 */
export const listByOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Clients can only view their own org's subscriptions
    if (user.role === "client" && user.organizationId !== args.organizationId) {
      throw new Error("Unauthorized");
    }

    let subscriptions;
    if (args.includeInactive) {
      subscriptions = await ctx.db
        .query("clientSubscriptions")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
    } else {
      subscriptions = await ctx.db
        .query("clientSubscriptions")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "active")
        )
        .collect();
    }

    // Fetch service type details for each subscription
    const subscriptionsWithDetails = await Promise.all(
      subscriptions.map(async (sub) => {
        const serviceType = await ctx.db.get(sub.serviceTypeId);
        return {
          ...sub,
          serviceType,
        };
      })
    );

    // Sort by service type display order
    return subscriptionsWithDetails.sort((a, b) => {
      const orderA = a.serviceType?.displayOrder ?? 999;
      const orderB = b.serviceType?.displayOrder ?? 999;
      return orderA - orderB;
    });
  },
});

/**
 * List subscriptions for the current user's organization
 */
export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    if (!user.organizationId) {
      return [];
    }

    const subscriptions = await ctx.db
      .query("clientSubscriptions")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", user.organizationId!).eq("status", "active")
      )
      .collect();

    // Fetch service type details for each subscription
    const subscriptionsWithDetails = await Promise.all(
      subscriptions.map(async (sub) => {
        const serviceType = await ctx.db.get(sub.serviceTypeId);
        return {
          ...sub,
          serviceType,
        };
      })
    );

    // Sort by service type display order
    return subscriptionsWithDetails.sort((a, b) => {
      const orderA = a.serviceType?.displayOrder ?? 999;
      const orderB = b.serviceType?.displayOrder ?? 999;
      return orderA - orderB;
    });
  },
});

/**
 * Check if an organization has access to a specific service
 */
export const hasAccess = query({
  args: {
    organizationId: v.id("organizations"),
    serviceTypeId: v.id("serviceTypes"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("clientSubscriptions")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("serviceTypeId"), args.serviceTypeId))
      .first();

    return !!subscription;
  },
});

/**
 * Get subscription counts per service type (admin only)
 */
export const getSubscriptionStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminOrStaff(ctx);

    const serviceTypes = await ctx.db
      .query("serviceTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const stats = await Promise.all(
      serviceTypes.map(async (serviceType) => {
        const subscriptions = await ctx.db
          .query("clientSubscriptions")
          .withIndex("by_service", (q) => q.eq("serviceTypeId", serviceType._id))
          .collect();

        const activeCount = subscriptions.filter((s) => s.status === "active").length;
        const inactiveCount = subscriptions.filter((s) => s.status === "inactive").length;
        const pendingCount = subscriptions.filter((s) => s.status === "pending").length;

        return {
          serviceType,
          activeCount,
          inactiveCount,
          pendingCount,
          totalCount: subscriptions.length,
        };
      })
    );

    return stats.sort((a, b) => a.serviceType.displayOrder - b.serviceType.displayOrder);
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Subscribe an organization to a service (admin only)
 */
export const subscribe = mutation({
  args: {
    organizationId: v.id("organizations"),
    serviceTypeId: v.id("serviceTypes"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    // Verify organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Verify service type exists and is active
    const serviceType = await ctx.db.get(args.serviceTypeId);
    if (!serviceType) {
      throw new Error("Service type not found");
    }
    if (!serviceType.isActive) {
      throw new Error("Service type is not active");
    }

    // Check if subscription already exists
    const existing = await ctx.db
      .query("clientSubscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("serviceTypeId"), args.serviceTypeId))
      .first();

    if (existing) {
      // If inactive, reactivate it
      if (existing.status === "inactive") {
        await ctx.db.patch(existing._id, {
          status: "active",
          startDate: args.startDate ?? Date.now(),
          endDate: args.endDate,
        });
        return existing._id;
      }
      throw new Error("Subscription already exists");
    }

    // Create new subscription
    const subscriptionId = await ctx.db.insert("clientSubscriptions", {
      organizationId: args.organizationId,
      serviceTypeId: args.serviceTypeId,
      status: "active",
      startDate: args.startDate ?? Date.now(),
      endDate: args.endDate,
      createdAt: Date.now(),
      createdBy: user._id,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: "subscribed_to_service",
      resourceType: "subscription",
      resourceId: subscriptionId,
      resourceName: serviceType.name,
      createdAt: Date.now(),
    });

    return subscriptionId;
  },
});

/**
 * Unsubscribe an organization from a service (admin only)
 */
export const unsubscribe = mutation({
  args: {
    organizationId: v.id("organizations"),
    serviceTypeId: v.id("serviceTypes"),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    const subscription = await ctx.db
      .query("clientSubscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("serviceTypeId"), args.serviceTypeId))
      .first();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Soft delete - set to inactive
    await ctx.db.patch(subscription._id, {
      status: "inactive",
      endDate: Date.now(),
    });

    // Get service type for logging
    const serviceType = await ctx.db.get(args.serviceTypeId);

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: "unsubscribed_from_service",
      resourceType: "subscription",
      resourceId: subscription._id,
      resourceName: serviceType?.name ?? "Unknown service",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update subscription status (admin only)
 */
export const updateStatus = mutation({
  args: {
    id: v.id("clientSubscriptions"),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending")
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const subscription = await ctx.db.get(args.id);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "inactive" ? { endDate: Date.now() } : {}),
    });

    return { success: true };
  },
});

/**
 * Bulk subscribe an organization to multiple services (admin only)
 */
export const bulkSubscribe = mutation({
  args: {
    organizationId: v.id("organizations"),
    serviceTypeIds: v.array(v.id("serviceTypes")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    // Verify organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const results: { serviceTypeId: Id<"serviceTypes">; status: string }[] = [];

    for (const serviceTypeId of args.serviceTypeIds) {
      const serviceType = await ctx.db.get(serviceTypeId);
      if (!serviceType || !serviceType.isActive) {
        results.push({ serviceTypeId, status: "skipped_inactive" });
        continue;
      }

      // Check if subscription already exists
      const existing = await ctx.db
        .query("clientSubscriptions")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("serviceTypeId"), serviceTypeId))
        .first();

      if (existing) {
        if (existing.status === "inactive") {
          await ctx.db.patch(existing._id, {
            status: "active",
            startDate: Date.now(),
          });
          results.push({ serviceTypeId, status: "reactivated" });
        } else {
          results.push({ serviceTypeId, status: "already_exists" });
        }
      } else {
        await ctx.db.insert("clientSubscriptions", {
          organizationId: args.organizationId,
          serviceTypeId,
          status: "active",
          startDate: Date.now(),
          createdAt: Date.now(),
          createdBy: user._id,
        });
        results.push({ serviceTypeId, status: "created" });
      }
    }

    return results;
  },
});

/**
 * Subscribe an organization to all active services (admin only)
 * Useful for new organizations
 */
export const subscribeToAll = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    // Verify organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Get all active service types
    const serviceTypes = await ctx.db
      .query("serviceTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    let created = 0;
    let skipped = 0;

    for (const serviceType of serviceTypes) {
      // Check if subscription already exists
      const existing = await ctx.db
        .query("clientSubscriptions")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("serviceTypeId"), serviceType._id))
        .first();

      if (existing) {
        if (existing.status === "inactive") {
          await ctx.db.patch(existing._id, {
            status: "active",
            startDate: Date.now(),
          });
          created++;
        } else {
          skipped++;
        }
      } else {
        await ctx.db.insert("clientSubscriptions", {
          organizationId: args.organizationId,
          serviceTypeId: serviceType._id,
          status: "active",
          startDate: Date.now(),
          createdAt: Date.now(),
          createdBy: user._id,
        });
        created++;
      }
    }

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: "subscribed_to_all_services",
      resourceType: "subscription",
      resourceName: `${created} services`,
      createdAt: Date.now(),
    });

    return {
      created,
      skipped,
      total: serviceTypes.length,
      message: `Subscribed to ${created} services (${skipped} already existed)`,
    };
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Auto-subscribe new organization to all services (called from organization creation)
 */
export const autoSubscribeNewOrg = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all active service types
    const serviceTypes = await ctx.db
      .query("serviceTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const serviceType of serviceTypes) {
      await ctx.db.insert("clientSubscriptions", {
        organizationId: args.organizationId,
        serviceTypeId: serviceType._id,
        status: "active",
        startDate: Date.now(),
        createdAt: Date.now(),
        createdBy: args.createdBy,
      });
    }

    return { subscribed: serviceTypes.length };
  },
});
