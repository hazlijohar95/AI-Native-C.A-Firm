import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { 
  Building2, 
  Users, 
  FileText, 
  CheckSquare, 
  Receipt, 
  Megaphone,
  Clock,
  User,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow, formatCurrency } from "@/lib/utils";

export function AdminDashboard() {
  const stats = useQuery(api.admin.getDashboardStats);

  if (stats === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Overview of portal activity and metrics
        </p>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Organizations"
          value={stats.organizations.total.toString()}
          description="Active clients"
          icon={Building2}
          href="/admin/organizations"
          color="blue"
        />
        <StatCard
          title="Users"
          value={stats.users.total.toString()}
          description={`${stats.users.clients} clients, ${stats.users.staff} staff`}
          icon={Users}
          href="/admin/users"
          color="purple"
        />
        <StatCard
          title="Documents"
          value={stats.documents.total.toString()}
          description="Total files"
          icon={FileText}
          color="green"
        />
        <StatCard
          title="Announcements"
          value={stats.announcements.active.toString()}
          description={`${stats.announcements.total} total`}
          icon={Megaphone}
          href="/admin/announcements"
          color="amber"
        />
      </div>

      {/* Financial Stats */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Financial Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.invoices.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.invoices.paid} paid invoices
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding
              </CardTitle>
              <Receipt className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(stats.invoices.outstandingAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.invoices.pending} pending invoices
              </p>
            </CardContent>
          </Card>

          <Card className={stats.invoices.overdue > 0 ? "border-red-200 bg-red-50/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue Invoices
              </CardTitle>
              <AlertCircle className={`h-4 w-4 ${stats.invoices.overdue > 0 ? "text-red-600" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.invoices.overdue > 0 ? "text-red-600" : ""}`}>
                {stats.invoices.overdue}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Link to="/admin/invoices">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invoices
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.invoices.total}</div>
                <p className="text-xs text-muted-foreground">
                  View all invoices
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Task Stats & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Task Overview
            </CardTitle>
            <CardDescription>
              Current task status across all clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Tasks</span>
                <span className="font-semibold">{stats.tasks.total}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="flex h-full">
                  <div 
                    className="bg-green-500" 
                    style={{ width: `${stats.tasks.total > 0 ? (stats.tasks.completed / stats.tasks.total) * 100 : 0}%` }}
                  />
                  <div 
                    className="bg-blue-500" 
                    style={{ width: `${stats.tasks.total > 0 ? (stats.tasks.inProgress / stats.tasks.total) * 100 : 0}%` }}
                  />
                  <div 
                    className="bg-amber-500" 
                    style={{ width: `${stats.tasks.total > 0 ? (stats.tasks.pending / stats.tasks.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Completed ({stats.tasks.completed})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm">In Progress ({stats.tasks.inProgress})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-sm">Pending ({stats.tasks.pending})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${stats.tasks.overdue > 0 ? "bg-red-500" : "bg-muted"}`} />
                  <span className={`text-sm ${stats.tasks.overdue > 0 ? "text-red-600 font-medium" : ""}`}>
                    Overdue ({stats.tasks.overdue})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest activity across all clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={activity._id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {activity.userAvatar ? (
                        <img
                          src={activity.userAvatar}
                          alt={activity.userName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.userName}</span>{" "}
                        {formatActivityAction(activity.action)}
                        {activity.resourceName && (
                          <span className="font-medium"> "{activity.resourceName}"</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  color?: "blue" | "green" | "amber" | "purple";
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
};

function StatCard({ title, value, description, icon: Icon, href, color = "blue" }: StatCardProps) {
  const content = (
    <Card className={href ? "transition-shadow hover:shadow-md cursor-pointer" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

function formatActivityAction(action: string): string {
  const actions: Record<string, string> = {
    uploaded_document: "uploaded",
    deleted_document: "deleted",
    created_task: "created task",
    completed_task: "completed task",
    updated_task: "updated task",
    deleted_task: "deleted task",
    created_draft_invoice: "created draft invoice",
    issued_invoice: "issued invoice",
    updated_draft_invoice: "updated invoice",
    cancelled_invoice: "cancelled invoice",
    recorded_payment: "recorded payment for",
    signed_document: "signed",
    declined_signature: "declined signature for",
  };
  return actions[action] || action.replace(/_/g, " ");
}
