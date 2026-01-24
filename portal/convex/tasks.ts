import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
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

    // Validate organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Validate title
    if (!args.title.trim()) {
      throw new Error("Task title is required");
    }
    if (args.title.length > 200) {
      throw new Error("Task title too long");
    }

    // Validate assignee if provided
    if (args.assignedTo) {
      const assignee = await ctx.db.get(args.assignedTo);
      if (!assignee) {
        throw new Error("Assigned user not found");
      }
      // Validate user belongs to org (for clients)
      if (assignee.role === "client" && 
          assignee.organizationId?.toString() !== args.organizationId.toString()) {
        throw new Error("Cannot assign task to user outside organization");
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      organizationId: args.organizationId,
      title: args.title.trim(),
      description: args.description?.trim(),
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
      resourceName: args.title.trim(),
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
        message: `You have a new task: "${args.title.trim()}"`,
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

    // Validate title if provided
    if (args.title !== undefined) {
      if (!args.title.trim()) {
        throw new Error("Task title is required");
      }
      if (args.title.length > 200) {
        throw new Error("Task title too long");
      }
    }

    // Validate assignee if provided
    if (args.assignedTo) {
      const assignee = await ctx.db.get(args.assignedTo);
      if (!assignee) {
        throw new Error("Assigned user not found");
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

// ============================================
// TASK COMMENTS
// ============================================

// List comments for a task
export const listComments = query({
  args: {
    taskId: v.id("tasks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    // Check access
    if (user.role === "client") {
      if (task.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Default limit to 100 comments to prevent unbounded queries
    const limit = args.limit ?? 100;

    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    // Filter out deleted comments and sort by created date
    const activeComments = comments
      .filter((c) => !c.isDeleted)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-limit); // Take the most recent N comments

    // Get user info for each comment
    const commentsWithUsers = await Promise.all(
      activeComments.map(async (comment) => {
        const commentUser = await ctx.db.get(comment.userId);
        return {
          ...comment,
          userName: commentUser?.name ?? "Unknown User",
          userRole: commentUser?.role ?? "client",
        };
      })
    );

    return commentsWithUsers;
  },
});

// Count comments for a task
export const countComments = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task) {
      return 0;
    }

    // Check access
    if (user.role === "client") {
      if (task.organizationId.toString() !== user.organizationId?.toString()) {
        return 0;
      }
    }

    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return comments.filter((c) => !c.isDeleted).length;
  },
});

// Add comment to task
export const addComment = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    // Check access
    if (user.role === "client") {
      if (task.organizationId.toString() !== user.organizationId?.toString()) {
        throw new Error("Access denied");
      }
    }

    // Validate content
    if (!args.content.trim()) {
      throw new Error("Comment cannot be empty");
    }
    if (args.content.length > 2000) {
      throw new Error("Comment too long (max 2000 characters)");
    }

    const commentId = await ctx.db.insert("taskComments", {
      taskId: args.taskId,
      userId: user._id,
      content: args.content.trim(),
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: task.organizationId,
      userId: user._id,
      action: "commented_task",
      resourceType: "task",
      resourceId: args.taskId,
      resourceName: task.title,
      createdAt: Date.now(),
    });

    // Notify relevant users
    // If client comments, notify admins/staff
    // If admin/staff comments, notify the client assigned to the task
    if (user.role === "client") {
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff")))
        .collect();

      for (const admin of admins) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          type: "new_task",
          title: "New Comment on Task",
          message: `${user.name} commented on "${task.title}"`,
          link: `/tasks`,
          relatedId: args.taskId,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    } else {
      // Notify org users
      const orgUsers = await ctx.db
        .query("users")
        .withIndex("by_organization", (q) => q.eq("organizationId", task.organizationId))
        .collect();

      for (const orgUser of orgUsers) {
        if (orgUser._id.toString() !== user._id.toString()) {
          await ctx.db.insert("notifications", {
            userId: orgUser._id,
            type: "new_task",
            title: "New Comment on Task",
            message: `${user.name} commented on "${task.title}"`,
            link: `/tasks`,
            relatedId: args.taskId,
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }
    }

    return commentId;
  },
});

// Edit comment
export const editComment = mutation({
  args: {
    commentId: v.id("taskComments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const comment = await ctx.db.get(args.commentId);

    if (!comment) {
      throw new Error("Comment not found");
    }

    // Only the comment author can edit
    if (comment.userId.toString() !== user._id.toString()) {
      throw new Error("You can only edit your own comments");
    }

    // Validate content
    if (!args.content.trim()) {
      throw new Error("Comment cannot be empty");
    }
    if (args.content.length > 2000) {
      throw new Error("Comment too long (max 2000 characters)");
    }

    await ctx.db.patch(args.commentId, {
      content: args.content.trim(),
      editedAt: Date.now(),
    });
  },
});

// Delete comment (soft delete)
export const deleteComment = mutation({
  args: { commentId: v.id("taskComments") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const comment = await ctx.db.get(args.commentId);

    if (!comment) {
      throw new Error("Comment not found");
    }

    // Only the comment author or admin/staff can delete
    const isAuthor = comment.userId.toString() === user._id.toString();
    const isAdmin = user.role === "admin" || user.role === "staff";

    if (!isAuthor && !isAdmin) {
      throw new Error("You can only delete your own comments");
    }

    await ctx.db.patch(args.commentId, {
      isDeleted: true,
    });
  },
});

// ============================================
// CLIENT TASK REQUESTS
// ============================================

// Create a help request (client only)
export const createRequest = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Only clients can create requests
    if (user.role !== "client") {
      throw new Error("Only clients can submit help requests");
    }

    if (!user.organizationId) {
      throw new Error("You must be part of an organization to submit requests");
    }

    // Validate title
    if (!args.title.trim()) {
      throw new Error("Request title is required");
    }
    if (args.title.length > 200) {
      throw new Error("Request title too long (max 200 characters)");
    }

    const taskId = await ctx.db.insert("tasks", {
      organizationId: user.organizationId,
      title: args.title.trim(),
      description: args.description?.trim(),
      status: "pending",
      priority: "medium", // Default priority for requests
      createdBy: user._id,
      createdAt: Date.now(),
      // Client request fields
      isClientRequest: true,
      requestStatus: "pending_approval",
      requestedBy: user._id,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: user.organizationId,
      userId: user._id,
      action: "submitted_request",
      resourceType: "task",
      resourceId: taskId,
      resourceName: args.title.trim(),
      createdAt: Date.now(),
    });

    // Notify admins/staff about the new request
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff")))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        type: "task_request",
        title: "New Help Request",
        message: `${user.name} submitted a help request: "${args.title.trim()}"`,
        link: `/admin/tasks`,
        relatedId: taskId,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return taskId;
  },
});

// Approve a client request (admin/staff only)
export const approveRequest = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()), // Allow editing title on approval
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    dueDate: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);
    const task = await ctx.db.get(args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.isClientRequest || task.requestStatus !== "pending_approval") {
      throw new Error("This task is not a pending request");
    }

    // Build updates
    const updates: Record<string, unknown> = {
      requestStatus: "approved",
      approvedBy: user._id,
      approvedAt: Date.now(),
    };

    if (args.title) updates.title = args.title.trim();
    if (args.description !== undefined) updates.description = args.description?.trim();
    if (args.priority) updates.priority = args.priority;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.assignedTo !== undefined) updates.assignedTo = args.assignedTo;

    await ctx.db.patch(args.id, updates);

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: task.organizationId,
      userId: user._id,
      action: "approved_request",
      resourceType: "task",
      resourceId: args.id,
      resourceName: args.title?.trim() ?? task.title,
      createdAt: Date.now(),
    });

    // Notify the client who submitted the request
    if (task.requestedBy) {
      await ctx.db.insert("notifications", {
        userId: task.requestedBy,
        type: "task_request_approved",
        title: "Request Approved",
        message: `Your help request "${task.title}" has been approved`,
        link: `/tasks`,
        relatedId: args.id,
        isRead: false,
        createdAt: Date.now(),
      });
    }
  },
});

// Reject a client request (admin/staff only)
export const rejectRequest = mutation({
  args: {
    id: v.id("tasks"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminOrStaff(ctx);
    const task = await ctx.db.get(args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.isClientRequest || task.requestStatus !== "pending_approval") {
      throw new Error("This task is not a pending request");
    }

    await ctx.db.patch(args.id, {
      requestStatus: "rejected",
      rejectionReason: args.reason?.trim(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: task.organizationId,
      userId: user._id,
      action: "rejected_request",
      resourceType: "task",
      resourceId: args.id,
      resourceName: task.title,
      createdAt: Date.now(),
    });

    // Notify the client who submitted the request
    if (task.requestedBy) {
      await ctx.db.insert("notifications", {
        userId: task.requestedBy,
        type: "task_request_rejected",
        title: "Request Declined",
        message: args.reason
          ? `Your help request "${task.title}" was declined: ${args.reason}`
          : `Your help request "${task.title}" was declined`,
        link: `/tasks`,
        relatedId: args.id,
        isRead: false,
        createdAt: Date.now(),
      });
    }
  },
});

// Cancel a pending request (client who submitted it)
export const cancelRequest = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const task = await ctx.db.get(args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.isClientRequest || task.requestStatus !== "pending_approval") {
      throw new Error("This task is not a pending request");
    }

    // Only the requester can cancel
    if (task.requestedBy?.toString() !== user._id.toString()) {
      throw new Error("You can only cancel your own requests");
    }

    // Delete the task entirely since it was never approved
    await ctx.db.delete(args.id);

    // Log activity
    await ctx.db.insert("activityLogs", {
      organizationId: task.organizationId,
      userId: user._id,
      action: "cancelled_request",
      resourceType: "task",
      resourceId: args.id,
      resourceName: task.title,
      createdAt: Date.now(),
    });
  },
});

// Count pending requests (for admin badge)
export const countPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    // Only admins/staff see request counts
    if (user.role !== "admin" && user.role !== "staff") {
      return 0;
    }

    const pendingRequests = await ctx.db
      .query("tasks")
      .filter((q) =>
        q.and(
          q.eq(q.field("isClientRequest"), true),
          q.eq(q.field("requestStatus"), "pending_approval")
        )
      )
      .collect();

    return pendingRequests.length;
  },
});

// ============================================
// TASK REMINDERS (Internal Functions for Cron)
// ============================================

const DAY_MS = 24 * 60 * 60 * 1000;

// Process task reminders - called by cron job
export const processReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all incomplete tasks with due dates
    const tasks = await ctx.db
      .query("tasks")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("dueDate"), undefined)
        )
      )
      .collect();

    let remindersProcessed = 0;
    let escalationsProcessed = 0;

    for (const task of tasks) {
      if (!task.dueDate) continue;

      // Skip client requests that aren't approved yet
      if (task.isClientRequest && task.requestStatus !== "approved") continue;

      const daysUntilDue = Math.floor((task.dueDate - now) / DAY_MS);
      const daysOverdue = Math.floor((now - task.dueDate) / DAY_MS);
      const remindersSent = task.remindersSent ?? {};

      let shouldUpdate = false;
      const updates: Record<string, unknown> = {};
      const newRemindersSent = { ...remindersSent };

      // 7 days before
      if (daysUntilDue === 7 && !remindersSent.sevenDays) {
        newRemindersSent.sevenDays = now;
        await sendTaskReminder(ctx, task, "7 days");
        shouldUpdate = true;
        remindersProcessed++;
      }

      // 3 days before
      if (daysUntilDue === 3 && !remindersSent.threeDays) {
        newRemindersSent.threeDays = now;
        await sendTaskReminder(ctx, task, "3 days");
        shouldUpdate = true;
        remindersProcessed++;
      }

      // 1 day before
      if (daysUntilDue === 1 && !remindersSent.oneDay) {
        newRemindersSent.oneDay = now;
        await sendTaskReminder(ctx, task, "1 day");
        shouldUpdate = true;
        remindersProcessed++;
      }

      // On due date
      if (daysUntilDue === 0 && !remindersSent.onDue) {
        newRemindersSent.onDue = now;
        await sendTaskReminder(ctx, task, "today");
        shouldUpdate = true;
        remindersProcessed++;
      }

      // Overdue handling
      if (daysOverdue > 0 && daysOverdue <= 7) {
        // Send daily overdue reminders for first 7 days
        const overdueReminders = remindersSent.overdue ?? [];
        const todayStart = new Date(now).setHours(0, 0, 0, 0);
        const alreadySentToday = overdueReminders.some(
          (ts) => new Date(ts).setHours(0, 0, 0, 0) === todayStart
        );

        if (!alreadySentToday) {
          newRemindersSent.overdue = [...overdueReminders, now];
          await sendOverdueReminder(ctx, task, daysOverdue);
          shouldUpdate = true;
          remindersProcessed++;
        }
      }

      // Escalate after 7 days overdue
      if (daysOverdue >= 7 && !task.escalatedAt) {
        await escalateTask(ctx, task);
        updates.escalatedAt = now;
        shouldUpdate = true;
        escalationsProcessed++;
      }

      if (shouldUpdate) {
        updates.remindersSent = newRemindersSent;
        await ctx.db.patch(task._id, updates);
      }
    }

    return { remindersProcessed, escalationsProcessed };
  },
});

// Helper: Send task reminder notification
async function sendTaskReminder(
  ctx: { db: { get: (id: unknown) => Promise<unknown>; insert: (table: string, data: unknown) => Promise<unknown>; query: (table: string) => { withIndex: (name: string, fn: (q: unknown) => unknown) => { collect: () => Promise<unknown[]> } } } },
  task: { _id: unknown; title: string; organizationId: unknown; assignedTo?: unknown },
  timing: string
) {
  // Get users to notify (assigned user or all org users)
  let usersToNotify: Array<{ _id: unknown; name: string }> = [];

  if (task.assignedTo) {
    const assignee = await ctx.db.get(task.assignedTo);
    if (assignee) {
      usersToNotify = [assignee as { _id: unknown; name: string }];
    }
  } else {
    usersToNotify = await ctx.db
      .query("users")
      .withIndex("by_organization", (q: { eq: (field: string, value: unknown) => unknown }) =>
        q.eq("organizationId", task.organizationId)
      )
      .collect() as Array<{ _id: unknown; name: string }>;
  }

  for (const user of usersToNotify) {
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "task_reminder",
      title: "Task Reminder",
      message: `"${task.title}" is due in ${timing}`,
      link: `/tasks`,
      relatedId: task._id,
      isRead: false,
      createdAt: Date.now(),
    });
  }
}

// Helper: Send overdue reminder notification
async function sendOverdueReminder(
  ctx: { db: { get: (id: unknown) => Promise<unknown>; insert: (table: string, data: unknown) => Promise<unknown>; query: (table: string) => { withIndex: (name: string, fn: (q: unknown) => unknown) => { collect: () => Promise<unknown[]> } } } },
  task: { _id: unknown; title: string; organizationId: unknown; assignedTo?: unknown },
  daysOverdue: number
) {
  // Get users to notify
  let usersToNotify: Array<{ _id: unknown }> = [];

  if (task.assignedTo) {
    const assignee = await ctx.db.get(task.assignedTo);
    if (assignee) {
      usersToNotify = [assignee as { _id: unknown }];
    }
  } else {
    usersToNotify = await ctx.db
      .query("users")
      .withIndex("by_organization", (q: { eq: (field: string, value: unknown) => unknown }) =>
        q.eq("organizationId", task.organizationId)
      )
      .collect() as Array<{ _id: unknown }>;
  }

  const dayText = daysOverdue === 1 ? "1 day" : `${daysOverdue} days`;

  for (const user of usersToNotify) {
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "task_overdue",
      title: "Task Overdue",
      message: `"${task.title}" is ${dayText} overdue`,
      link: `/tasks`,
      relatedId: task._id,
      isRead: false,
      createdAt: Date.now(),
    });
  }
}

// Helper: Escalate task to staff
async function escalateTask(
  ctx: { db: { get: (id: unknown) => Promise<unknown>; insert: (table: string, data: unknown) => Promise<unknown>; query: (table: string) => { filter: (fn: (q: unknown) => unknown) => { collect: () => Promise<unknown[]> }; withIndex: (name: string, fn: (q: unknown) => unknown) => { collect: () => Promise<unknown[]> } } } },
  task: { _id: unknown; title: string; organizationId: unknown }
) {
  // Get all admins/staff to notify
  const admins = await ctx.db
    .query("users")
    .filter((q: { or: (...args: unknown[]) => unknown; eq: (a: unknown, b: unknown) => unknown; field: (name: string) => unknown }) =>
      q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff"))
    )
    .collect() as Array<{ _id: unknown }>;

  // Get organization name for context
  const org = await ctx.db.get(task.organizationId) as { name: string } | null;
  const orgName = org?.name ?? "Unknown Organization";

  for (const admin of admins) {
    await ctx.db.insert("notifications", {
      userId: admin._id,
      type: "task_escalated",
      title: "Task Escalated",
      message: `"${task.title}" for ${orgName} is 7+ days overdue and needs attention`,
      link: `/admin/tasks`,
      relatedId: task._id,
      isRead: false,
      createdAt: Date.now(),
    });
  }
}
