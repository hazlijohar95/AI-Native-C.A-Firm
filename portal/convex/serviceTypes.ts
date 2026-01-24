import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

// Default service types for seeding
export const DEFAULT_SERVICE_TYPES = [
  {
    code: "accounting",
    name: "Accounting",
    description: "Financial accounting, bookkeeping, and reporting services",
    icon: "Calculator",
    color: "blue",
    displayOrder: 1,
  },
  {
    code: "taxation",
    name: "Taxation",
    description: "Tax compliance, planning, and advisory services",
    icon: "Receipt",
    color: "emerald",
    displayOrder: 2,
  },
  {
    code: "advisory",
    name: "Advisory",
    description: "Business advisory and consulting services",
    icon: "Lightbulb",
    color: "violet",
    displayOrder: 3,
  },
  {
    code: "cosec",
    name: "Company Secretary",
    description: "Corporate secretarial and compliance services",
    icon: "Building2",
    color: "amber",
    displayOrder: 4,
  },
  {
    code: "payroll",
    name: "Payroll",
    description: "Payroll processing and HR administration",
    icon: "Users",
    color: "cyan",
    displayOrder: 5,
  },
  {
    code: "other",
    name: "Other",
    description: "Other professional services",
    icon: "FileText",
    color: "gray",
    displayOrder: 99,
  },
];

// ============================================
// QUERIES
// ============================================

/**
 * List all active service types
 */
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // No auth required - service types are public info
    const includeInactive = args.includeInactive ?? false;

    if (includeInactive) {
      // For admin - return all
      return await ctx.db
        .query("serviceTypes")
        .order("asc")
        .collect()
        .then((types) => types.sort((a, b) => a.displayOrder - b.displayOrder));
    }

    // Return only active service types, sorted by displayOrder
    return await ctx.db
      .query("serviceTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()
      .then((types) => types.sort((a, b) => a.displayOrder - b.displayOrder));
  },
});

/**
 * Get a service type by its code
 */
export const getByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("serviceTypes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

/**
 * Get a service type by ID
 */
export const get = query({
  args: {
    id: v.id("serviceTypes"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new service type (admin only)
 */
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.string(),
    color: v.string(),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    // Check if code already exists
    const existing = await ctx.db
      .query("serviceTypes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toLowerCase()))
      .first();

    if (existing) {
      throw new Error(`Service type with code "${args.code}" already exists`);
    }

    // Get max displayOrder if not provided
    let displayOrder = args.displayOrder;
    if (displayOrder === undefined) {
      const allTypes = await ctx.db.query("serviceTypes").collect();
      displayOrder = allTypes.length > 0
        ? Math.max(...allTypes.map((t) => t.displayOrder)) + 1
        : 1;
    }

    const serviceTypeId = await ctx.db.insert("serviceTypes", {
      code: args.code.toLowerCase(),
      name: args.name,
      description: args.description,
      icon: args.icon,
      color: args.color,
      displayOrder,
      isActive: true,
      createdAt: Date.now(),
      createdBy: user._id,
    });

    return serviceTypeId;
  },
});

/**
 * Update a service type (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("serviceTypes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const serviceType = await ctx.db.get(args.id);
    if (!serviceType) {
      throw new Error("Service type not found");
    }

    const updates: Partial<typeof serviceType> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.color !== undefined) updates.color = args.color;
    if (args.displayOrder !== undefined) updates.displayOrder = args.displayOrder;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Toggle active status of a service type (admin only)
 */
export const toggleActive = mutation({
  args: {
    id: v.id("serviceTypes"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const serviceType = await ctx.db.get(args.id);
    if (!serviceType) {
      throw new Error("Service type not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !serviceType.isActive,
    });

    return { isActive: !serviceType.isActive };
  },
});

/**
 * Delete a service type (admin only)
 * Only allowed if no documents or subscriptions reference it
 */
export const remove = mutation({
  args: {
    id: v.id("serviceTypes"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const serviceType = await ctx.db.get(args.id);
    if (!serviceType) {
      throw new Error("Service type not found");
    }

    // Check if any documents reference this service type
    const anyDocument = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("serviceTypeId"), args.id))
      .first();

    if (anyDocument) {
      throw new Error(
        "Cannot delete service type that has associated documents. Please reassign or delete those documents first."
      );
    }

    // Check if any subscriptions reference this service type
    const anySubscription = await ctx.db
      .query("clientSubscriptions")
      .withIndex("by_service", (q) => q.eq("serviceTypeId", args.id))
      .first();

    if (anySubscription) {
      throw new Error(
        "Cannot delete service type that has active subscriptions. Please remove subscriptions first."
      );
    }

    await ctx.db.delete(args.id);
    return { deleted: true };
  },
});

// ============================================
// INTERNAL MUTATIONS (for seeding)
// ============================================

/**
 * Seed default service types (called from a migration or setup script)
 */
export const seedDefaults = internalMutation({
  args: {
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existingTypes = await ctx.db.query("serviceTypes").collect();
    const existingCodes = new Set(existingTypes.map((t) => t.code));

    const created: string[] = [];

    for (const serviceType of DEFAULT_SERVICE_TYPES) {
      if (!existingCodes.has(serviceType.code)) {
        await ctx.db.insert("serviceTypes", {
          ...serviceType,
          isActive: true,
          createdAt: Date.now(),
          createdBy: args.createdBy,
        });
        created.push(serviceType.code);
      }
    }

    return { created, skipped: DEFAULT_SERVICE_TYPES.length - created.length };
  },
});

/**
 * Public mutation to seed defaults (admin only)
 */
export const seedDefaultServiceTypes = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);

    const existingTypes = await ctx.db.query("serviceTypes").collect();
    const existingCodes = new Set(existingTypes.map((t) => t.code));

    const created: string[] = [];

    for (const serviceType of DEFAULT_SERVICE_TYPES) {
      if (!existingCodes.has(serviceType.code)) {
        await ctx.db.insert("serviceTypes", {
          ...serviceType,
          isActive: true,
          createdAt: Date.now(),
          createdBy: user._id,
        });
        created.push(serviceType.code);
      }
    }

    return {
      created,
      skipped: DEFAULT_SERVICE_TYPES.length - created.length,
      message: created.length > 0
        ? `Created ${created.length} service types: ${created.join(", ")}`
        : "All default service types already exist",
    };
  },
});
