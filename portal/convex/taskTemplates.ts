import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";

// ============================================
// QUERIES
// ============================================

// List all task templates
export const list = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("tax"),
        v.literal("bookkeeping"),
        v.literal("compliance"),
        v.literal("advisory"),
        v.literal("onboarding")
      )
    ),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    let templates = await ctx.db.query("taskTemplates").collect();

    if (args.category) {
      templates = templates.filter((t) => t.category === args.category);
    }

    if (args.activeOnly) {
      templates = templates.filter((t) => t.isActive);
    }

    // Sort: built-in first, then by name
    templates.sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) {
        return a.isBuiltIn ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return templates;
  },
});

// Get single template
export const get = query({
  args: { id: v.id("taskTemplates") },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);
    return await ctx.db.get(args.id);
  },
});

// List organization subscriptions to templates
export const listOrganizationSubscriptions = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const subscriptions = await ctx.db
      .query("organizationTemplates")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Enrich with template details
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        const template = await ctx.db.get(sub.templateId);
        return {
          ...sub,
          templateName: template?.name ?? "Unknown Template",
          templateCategory: template?.category,
          templateRecurrence: template?.recurrence,
        };
      })
    );

    return enrichedSubscriptions;
  },
});

// List all organizations subscribed to a template
export const listTemplateSubscribers = query({
  args: { templateId: v.id("taskTemplates") },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const subscriptions = await ctx.db
      .query("organizationTemplates")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    // Enrich with organization names
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        const org = await ctx.db.get(sub.organizationId);
        return {
          ...sub,
          organizationName: org?.name ?? "Unknown Organization",
        };
      })
    );

    return enrichedSubscriptions;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Create a new custom template
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("tax"),
      v.literal("bookkeeping"),
      v.literal("compliance"),
      v.literal("advisory"),
      v.literal("onboarding")
    ),
    recurrence: v.object({
      frequency: v.union(
        v.literal("monthly"),
        v.literal("quarterly"),
        v.literal("yearly")
      ),
      dayOfMonth: v.optional(v.number()),
      monthOfYear: v.optional(v.number()),
      quarterMonth: v.optional(v.number()),
    }),
    taskDefaults: v.object({
      title: v.string(),
      description: v.optional(v.string()),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      dueDaysAfterGeneration: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    // Validate name
    if (!args.name.trim()) {
      throw new Error("Template name is required");
    }
    if (args.name.length > 100) {
      throw new Error("Template name too long (max 100 characters)");
    }

    // Validate task title
    if (!args.taskDefaults.title.trim()) {
      throw new Error("Task title is required");
    }

    // Validate recurrence settings
    if (args.recurrence.frequency === "monthly" && args.recurrence.dayOfMonth) {
      if (args.recurrence.dayOfMonth < 1 || args.recurrence.dayOfMonth > 28) {
        throw new Error("Day of month must be between 1 and 28");
      }
    }

    if (args.recurrence.frequency === "yearly" && args.recurrence.monthOfYear) {
      if (args.recurrence.monthOfYear < 1 || args.recurrence.monthOfYear > 12) {
        throw new Error("Month must be between 1 and 12");
      }
    }

    if (args.recurrence.frequency === "quarterly" && args.recurrence.quarterMonth) {
      if (args.recurrence.quarterMonth < 1 || args.recurrence.quarterMonth > 3) {
        throw new Error("Quarter month must be between 1 and 3");
      }
    }

    const templateId = await ctx.db.insert("taskTemplates", {
      name: args.name.trim(),
      description: args.description?.trim(),
      category: args.category,
      recurrence: args.recurrence,
      taskDefaults: {
        title: args.taskDefaults.title.trim(),
        description: args.taskDefaults.description?.trim(),
        priority: args.taskDefaults.priority,
        dueDaysAfterGeneration: args.taskDefaults.dueDaysAfterGeneration,
      },
      isActive: true,
      isBuiltIn: false,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return templateId;
  },
});

// Update a template
export const update = mutation({
  args: {
    id: v.id("taskTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("tax"),
        v.literal("bookkeeping"),
        v.literal("compliance"),
        v.literal("advisory"),
        v.literal("onboarding")
      )
    ),
    recurrence: v.optional(
      v.object({
        frequency: v.union(
          v.literal("monthly"),
          v.literal("quarterly"),
          v.literal("yearly")
        ),
        dayOfMonth: v.optional(v.number()),
        monthOfYear: v.optional(v.number()),
        quarterMonth: v.optional(v.number()),
      })
    ),
    taskDefaults: v.optional(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        dueDaysAfterGeneration: v.number(),
      })
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error("Template not found");
    }

    const { id, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (typeof value === "string") {
          filteredUpdates[key] = value.trim();
        } else if (key === "taskDefaults" && typeof value === "object") {
          const taskDefaults = value as {
            title: string;
            description?: string;
            priority: string;
            dueDaysAfterGeneration: number;
          };
          filteredUpdates[key] = {
            title: taskDefaults.title.trim(),
            description: taskDefaults.description?.trim(),
            priority: taskDefaults.priority,
            dueDaysAfterGeneration: taskDefaults.dueDaysAfterGeneration,
          };
        } else {
          filteredUpdates[key] = value;
        }
      }
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);
    }
  },
});

// Delete a template (only custom templates can be deleted)
export const remove = mutation({
  args: { id: v.id("taskTemplates") },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error("Template not found");
    }

    if (template.isBuiltIn) {
      throw new Error("Built-in templates cannot be deleted. You can deactivate them instead.");
    }

    // Delete all subscriptions to this template
    const subscriptions = await ctx.db
      .query("organizationTemplates")
      .withIndex("by_template", (q) => q.eq("templateId", args.id))
      .collect();

    for (const sub of subscriptions) {
      await ctx.db.delete(sub._id);
    }

    await ctx.db.delete(args.id);
  },
});

// Subscribe an organization to a template
export const subscribeOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
    templateId: v.id("taskTemplates"),
    customTitle: v.optional(v.string()),
    customDescription: v.optional(v.string()),
    assignToUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    // Validate organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Validate template exists and is active
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }
    if (!template.isActive) {
      throw new Error("Cannot subscribe to an inactive template");
    }

    // Check if already subscribed
    const existing = await ctx.db
      .query("organizationTemplates")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("templateId"), args.templateId))
      .first();

    if (existing) {
      throw new Error("Organization is already subscribed to this template");
    }

    // Calculate next generation date
    const nextGenerationAt = calculateNextGenerationDate(template.recurrence);

    const subscriptionId = await ctx.db.insert("organizationTemplates", {
      organizationId: args.organizationId,
      templateId: args.templateId,
      isActive: true,
      nextGenerationAt,
      customTitle: args.customTitle?.trim(),
      customDescription: args.customDescription?.trim(),
      assignToUserId: args.assignToUserId,
    });

    return subscriptionId;
  },
});

// Toggle template active status
export const toggleActive = mutation({
  args: {
    id: v.id("taskTemplates"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.id, { isActive: args.isActive });
  },
});

// Unsubscribe an organization from a template
export const unsubscribeOrganization = mutation({
  args: {
    subscriptionId: v.id("organizationTemplates"),
  },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    await ctx.db.delete(args.subscriptionId);
  },
});

// Update subscription settings
export const updateSubscription = mutation({
  args: {
    subscriptionId: v.id("organizationTemplates"),
    isActive: v.optional(v.boolean()),
    customTitle: v.optional(v.string()),
    customDescription: v.optional(v.string()),
    assignToUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const { subscriptionId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = typeof value === "string" ? value.trim() : value;
      }
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(subscriptionId, filteredUpdates);
    }
  },
});

// ============================================
// INTERNAL FUNCTIONS (for cron job)
// ============================================

// Generate recurring tasks - called by cron job
export const generateRecurringTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all active subscriptions due for generation
    const subscriptions = await ctx.db
      .query("organizationTemplates")
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.lte(q.field("nextGenerationAt"), now)
        )
      )
      .collect();

    let tasksGenerated = 0;

    for (const subscription of subscriptions) {
      const template = await ctx.db.get(subscription.templateId);
      if (!template || !template.isActive) continue;

      const org = await ctx.db.get(subscription.organizationId);
      if (!org) continue;

      // Create the task
      const dueDaysMs =
        (template.taskDefaults?.dueDaysAfterGeneration ?? 14) * 24 * 60 * 60 * 1000;
      const dueDate = now + dueDaysMs;

      const taskTitle = subscription.customTitle ?? template.taskDefaults.title;
      const taskDescription =
        subscription.customDescription ?? template.taskDefaults.description;

      const taskId = await ctx.db.insert("tasks", {
        organizationId: subscription.organizationId,
        title: taskTitle,
        description: taskDescription,
        status: "pending",
        priority: template.taskDefaults.priority,
        dueDate,
        assignedTo: subscription.assignToUserId,
        createdBy: template.createdBy,
        createdAt: now,
        generatedFromTemplate: subscription.templateId,
        generatedFromSubscription: subscription._id,
      });

      tasksGenerated++;

      // Notify organization users
      const orgUsers = await ctx.db
        .query("users")
        .withIndex("by_organization", (q) => q.eq("organizationId", subscription.organizationId))
        .collect();

      for (const user of orgUsers) {
        await ctx.db.insert("notifications", {
          userId: user._id,
          type: "new_task",
          title: "New Recurring Task",
          message: `New task: "${taskTitle}"`,
          link: `/tasks`,
          relatedId: taskId,
          isRead: false,
          createdAt: now,
        });
      }

      // Update subscription with next generation date
      const nextGenerationAt = calculateNextGenerationDate(template.recurrence);
      await ctx.db.patch(subscription._id, {
        lastGeneratedAt: now,
        nextGenerationAt,
      });
    }

    return { tasksGenerated };
  },
});

// Seed built-in templates
export const seedBuiltInTemplates = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if templates already exist
    const existingTemplates = await ctx.db
      .query("taskTemplates")
      .filter((q) => q.eq(q.field("isBuiltIn"), true))
      .collect();

    if (existingTemplates.length > 0) {
      return { message: "Built-in templates already exist", count: existingTemplates.length };
    }

    // Get a system user (first admin)
    const adminUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();

    if (!adminUser) {
      throw new Error("No admin user found to create templates");
    }

    const builtInTemplates = [
      {
        name: "Monthly Bookkeeping",
        description: "Regular monthly bookkeeping document collection",
        category: "bookkeeping" as const,
        recurrence: {
          frequency: "monthly" as const,
          dayOfMonth: 1,
        },
        taskDefaults: {
          title: "Submit Monthly Bookkeeping Documents",
          description:
            "Please upload your bank statements, receipts, and invoices for the previous month.",
          priority: "medium" as const,
          dueDaysAfterGeneration: 14,
        },
      },
      {
        name: "Quarterly BAS Preparation",
        description: "Quarterly Business Activity Statement preparation",
        category: "tax" as const,
        recurrence: {
          frequency: "quarterly" as const,
          quarterMonth: 1, // First month of quarter
        },
        taskDefaults: {
          title: "Quarterly BAS Preparation",
          description:
            "Prepare documents for quarterly BAS lodgment. Please ensure all invoices and receipts are up to date.",
          priority: "high" as const,
          dueDaysAfterGeneration: 21,
        },
      },
      {
        name: "Annual Tax Return Documents",
        description: "Yearly tax return document collection",
        category: "tax" as const,
        recurrence: {
          frequency: "yearly" as const,
          monthOfYear: 7, // July (start of AU financial year)
        },
        taskDefaults: {
          title: "Annual Tax Return - Document Collection",
          description:
            "Please gather all documents needed for your annual tax return including income statements, deductions, and investment records.",
          priority: "high" as const,
          dueDaysAfterGeneration: 30,
        },
      },
      {
        name: "Year-End Financial Close",
        description: "Annual financial year-end close procedures",
        category: "compliance" as const,
        recurrence: {
          frequency: "yearly" as const,
          monthOfYear: 6, // June (end of AU financial year)
        },
        taskDefaults: {
          title: "Year-End Financial Close",
          description:
            "Review and finalize your annual accounts. Please confirm all transactions are recorded and provide any missing documentation.",
          priority: "high" as const,
          dueDaysAfterGeneration: 45,
        },
      },
      {
        name: "Quarterly Superannuation Review",
        description: "Quarterly superannuation contribution verification",
        category: "compliance" as const,
        recurrence: {
          frequency: "quarterly" as const,
          quarterMonth: 2, // Second month of quarter
        },
        taskDefaults: {
          title: "Superannuation Contribution Review",
          description:
            "Verify that superannuation contributions are up to date and correctly allocated for all employees.",
          priority: "medium" as const,
          dueDaysAfterGeneration: 14,
        },
      },
    ];

    const now = Date.now();

    for (const template of builtInTemplates) {
      await ctx.db.insert("taskTemplates", {
        ...template,
        isActive: true,
        isBuiltIn: true,
        createdBy: adminUser._id,
        createdAt: now,
      });
    }

    return { message: "Built-in templates created", count: builtInTemplates.length };
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateNextGenerationDate(recurrence: {
  frequency: "monthly" | "quarterly" | "yearly";
  dayOfMonth?: number;
  monthOfYear?: number;
  quarterMonth?: number;
}): number {
  const now = new Date();
  const result = new Date();

  switch (recurrence.frequency) {
    case "monthly": {
      // Next month on the specified day
      result.setMonth(result.getMonth() + 1);
      result.setDate(recurrence.dayOfMonth ?? 1);
      result.setHours(0, 0, 0, 0);
      break;
    }
    case "quarterly": {
      // Next quarter on the specified month within quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const nextQuarter = currentQuarter + 1;
      const quarterMonth = (recurrence.quarterMonth ?? 1) - 1; // 0-indexed
      const nextMonth = (nextQuarter % 4) * 3 + quarterMonth;
      const nextYear = nextQuarter >= 4 ? now.getFullYear() + 1 : now.getFullYear();
      result.setFullYear(nextYear);
      result.setMonth(nextMonth);
      result.setDate(recurrence.dayOfMonth ?? 1);
      result.setHours(0, 0, 0, 0);
      break;
    }
    case "yearly": {
      // Next year on the specified month
      const targetMonth = (recurrence.monthOfYear ?? 1) - 1; // 0-indexed
      if (now.getMonth() >= targetMonth) {
        result.setFullYear(now.getFullYear() + 1);
      }
      result.setMonth(targetMonth);
      result.setDate(recurrence.dayOfMonth ?? 1);
      result.setHours(0, 0, 0, 0);
      break;
    }
  }

  return result.getTime();
}
