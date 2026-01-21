import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdminOrStaff } from "./lib/auth";

// ============================================
// QUERIES
// ============================================

// List tasks for current user's organization
export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed")
    )),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    let tasks;

    if (user.role === "admin" || user.role === "staff") {
      // Admin/staff see all tasks
      tasks = await ctx.db.query("tasks").collect();
    } else if (user.organizationId) {
      // Clients see their organization's tasks
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
    } else {
      return [];
    }

    // Filter by status if specified
    if (args.status) {
      tasks = tasks.filter((t) => t.status === args.status);
    }

    // Filter by priority if specified
    if (args.priority) {
      tasks = tasks.filter((t) => t.priority === args.priority);
    }

    // Sort: pending/in_progress first, then by due date, then by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const statusOrder = { pending: 0, in_progress: 1, completed: 2 };

    tasks.sort((a, b) => {
      // First by status
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // Then by due date (tasks with due dates first)
      if (a.dueDate && b.dueDate) {
        return a.dueDate - b.dueDate;
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      // Then by priority
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return tasks;
  },
});

// Get single task
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);

    if (!task) {
      return null;
    }

    // Check access
    if (user.role === "client") {
      if (task.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    return task;
  },
});

// Count pending tasks for dashboard
export const countPending = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    let tasks;

    if (user.role === "admin" || user.role === "staff") {
      tasks = await ctx.db.query("tasks").collect();
    } else if (user.organizationId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
    } else {
      return 0;
    }

    return tasks.filter((t) => t.status !== "completed").length;
  },
});

// Get overdue tasks count
export const countOverdue = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const now = Date.now();

    let tasks;

    if (user.role === "admin" || user.role === "staff") {
      tasks = await ctx.db.query("tasks").collect();
    } else if (user.organizationId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId!))
        .collect();
    } else {
      return 0;
    }

    return tasks.filter((t) => 
      t.status !== "completed" && 
      t.dueDate && 
      t.dueDate < now
    ).length;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Create task (admin/staff only)
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    dueDate: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);

    const taskId = await ctx.db.insert("tasks", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      status: "pending",
      priority: args.priority,
      dueDate: args.dueDate,
      assignedTo: args.assignedTo,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: args.organizationId,
      userId: user._id,
      action: "created_task",
      resourceType: "task",
      resourceId: taskId,
      resourceName: args.title,
      createdAt: Date.now(),
    });

    // Notify users in the organization about new task
    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    for (const orgUser of orgUsers) {
      await ctx.db.insert("notifications", {
        userId: orgUser._id,
        type: "new_task",
        title: "New Task Assigned",
        message: `You have a new task: "${args.title}"`,
        link: `/tasks`,
        relatedId: taskId,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return taskId;
  },
});

// Update task status
export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    // Check access
    if (user.role === "client") {
      if (task.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    const updates: {
      status: "pending" | "in_progress" | "completed";
      completedAt?: number;
      completedBy?: typeof user._id;
    } = {
      status: args.status,
    };

    if (args.status === "completed") {
      updates.completedAt = Date.now();
      updates.completedBy = user._id;
    }

    await ctx.db.patch(args.id, updates);

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: task.organizationId,
      userId: user._id,
      action: args.status === "completed" ? "completed_task" : "updated_task",
      resourceType: "task",
      resourceId: args.id,
      resourceName: task.title,
      createdAt: Date.now(),
    });

    // Notify admins when task is completed
    if (args.status === "completed") {
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff")))
        .collect();

      for (const admin of admins) {
        if (admin._id.toString() !== user._id.toString()) {
          await ctx.db.insert("notifications", {
            userId: admin._id,
            type: "task_completed",
            title: "Task Completed",
            message: `${user.name} completed "${task.title}"`,
            link: `/tasks`,
            relatedId: args.id,
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }
    }
  },
});

// Update task details (admin/staff only)
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    dueDate: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireAdminOrStaff(ctx);

    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

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

// Delete task (admin/staff only)
export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);
    const task = await ctx.db.get(args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.delete(args.id);

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: task.organizationId,
      userId: user._id,
      action: "deleted_task",
      resourceType: "task",
      resourceId: args.id,
      resourceName: task.title,
      createdAt: Date.now(),
    });
  },
});
