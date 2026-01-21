import { query } from "./_generated/server";
import { requireAdminOrStaff } from "./lib/auth";

// ============================================
// ADMIN DASHBOARD QUERIES
// ============================================

// Get dashboard statistics for admin overview
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminOrStaff(ctx);
    const now = Date.now();

    // Fetch all data in parallel for efficiency
    const [
      organizations,
      users,
      documents,
      tasks,
      invoices,
      announcements,
      activityLogs,
    ] = await Promise.all([
      ctx.db.query("organizations").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("documents").collect(),
      ctx.db.query("tasks").collect(),
      ctx.db.query("invoices").collect(),
      ctx.db.query("announcements").collect(),
      ctx.db.query("activityLogs").order("desc").take(10),
    ]);

    // Calculate organization stats
    const totalOrganizations = organizations.length;

    // Calculate user stats
    const totalUsers = users.length;
    const clientUsers = users.filter((u) => u.role === "client").length;
    const staffUsers = users.filter((u) => u.role === "staff" || u.role === "admin").length;

    // Calculate document stats
    const totalDocuments = documents.filter((d) => !d.isDeleted).length;

    // Calculate task stats
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter((t) => t.status === "pending").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const overdueTasks = tasks.filter(
      (t) => t.status !== "completed" && t.dueDate && t.dueDate < now
    ).length;

    // Calculate invoice stats
    const activeInvoices = invoices.filter(
      (inv) => inv.status !== "draft" && inv.status !== "cancelled"
    );
    const pendingInvoices = activeInvoices.filter(
      (inv) => inv.status === "pending" || inv.status === "overdue"
    );
    const paidInvoices = activeInvoices.filter((inv) => inv.status === "paid");
    const overdueInvoices = pendingInvoices.filter((inv) => inv.dueDate < now);

    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const outstandingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate announcement stats
    const activeAnnouncements = announcements.filter(
      (a) => a.publishedAt <= now && (!a.expiresAt || a.expiresAt > now)
    ).length;

    // Enrich recent activity with user names
    const userIds = [...new Set(activityLogs.map((a) => a.userId))];
    const activityUsers = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      activityUsers.filter(Boolean).map((u) => [u!._id.toString(), u!])
    );

    const recentActivity = activityLogs.map((activity) => {
      const activityUser = userMap.get(activity.userId.toString());
      return {
        ...activity,
        userName: activityUser?.name || "Unknown User",
        userAvatar: activityUser?.avatarUrl,
      };
    });

    return {
      organizations: {
        total: totalOrganizations,
      },
      users: {
        total: totalUsers,
        clients: clientUsers,
        staff: staffUsers,
      },
      documents: {
        total: totalDocuments,
      },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        overdue: overdueTasks,
      },
      invoices: {
        total: activeInvoices.length,
        pending: pendingInvoices.length - overdueInvoices.length,
        overdue: overdueInvoices.length,
        paid: paidInvoices.length,
        totalRevenue,
        outstandingAmount,
      },
      announcements: {
        active: activeAnnouncements,
        total: announcements.length,
      },
      recentActivity,
    };
  },
});

// List all invoices for admin (with organization names)
export const listAllInvoices = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminOrStaff(ctx);
    const now = Date.now();

    const invoices = await ctx.db.query("invoices").collect();

    // Fetch all organizations
    const orgIds = [...new Set(invoices.map((inv) => inv.organizationId))];
    const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
    const orgMap = new Map(
      orgs.filter(Boolean).map((org) => [org!._id.toString(), org!])
    );

    // Sort by issued date descending
    invoices.sort((a, b) => b.issuedDate - a.issuedDate);

    return invoices.map((inv) => ({
      ...inv,
      displayStatus: inv.status === "pending" && inv.dueDate < now ? "overdue" : inv.status,
      organizationName: orgMap.get(inv.organizationId.toString())?.name || "Unknown",
    }));
  },
});

// List all signature requests for admin
export const listAllSignatureRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminOrStaff(ctx);

    const requests = await ctx.db.query("signatureRequests").collect();

    // Fetch organizations and documents
    const orgIds = [...new Set(requests.map((r) => r.organizationId))];
    const docIds = [...new Set(requests.map((r) => r.documentId))];

    const [orgs, docs] = await Promise.all([
      Promise.all(orgIds.map((id) => ctx.db.get(id))),
      Promise.all(docIds.map((id) => ctx.db.get(id))),
    ]);

    const orgMap = new Map(
      orgs.filter(Boolean).map((org) => [org!._id.toString(), org!])
    );
    const docMap = new Map(
      docs.filter(Boolean).map((doc) => [doc!._id.toString(), doc!])
    );

    // Sort by requested date descending
    requests.sort((a, b) => b.requestedAt - a.requestedAt);

    return requests.map((req) => ({
      ...req,
      organizationName: orgMap.get(req.organizationId.toString())?.name || "Unknown",
      documentName: docMap.get(req.documentId.toString())?.name || "Unknown",
    }));
  },
});
