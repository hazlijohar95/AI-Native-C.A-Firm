import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  CheckSquare, 
  Bell, 
  Receipt, 
  Upload, 
  ArrowRight,
  Clock,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";

export function Dashboard() {
  const { user } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const syncUser = useMutation(api.users.syncUser);

  // Real data from Convex
  const documentCount = useQuery(api.documents.count);
  const pendingTaskCount = useQuery(api.tasks.countPending);
  const unreadAnnouncementCount = useQuery(api.announcements.countUnread);
  const recentActivity = useQuery(api.activity.list, { limit: 5 });

  // Sync user to database on first load (fallback if webhook hasn't fired)
  useEffect(() => {
    if (user && !currentUser) {
      syncUser().catch(() => {});
    }
  }, [user, currentUser, syncUser]);

  const firstName = user?.firstName || currentUser?.name?.split(" ")[0] || "there";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's what's happening with your account
          </p>
        </div>
        <Link to="/documents">
          <Button className="gap-2 self-start sm:self-center">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Documents"
          value={documentCount?.toString() ?? "0"}
          description="Total documents"
          icon={FileText}
          href="/documents"
          color="blue"
        />
        <StatusCard
          title="Tasks"
          value={pendingTaskCount?.toString() ?? "0"}
          description="Pending tasks"
          icon={CheckSquare}
          href="/tasks"
          color="amber"
        />
        <StatusCard
          title="Announcements"
          value={unreadAnnouncementCount?.toString() ?? "0"}
          description="Unread updates"
          icon={Bell}
          href="/announcements"
          color="purple"
        />
        <StatusCard
          title="Invoices"
          value="0"
          description="Outstanding"
          icon={Receipt}
          href="/invoices"
          color="green"
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks you can perform
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <QuickActionItem
              icon={Upload}
              title="Upload Documents"
              description="Share files securely with your accountant"
              href="/documents"
            />
            <QuickActionItem
              icon={CheckSquare}
              title="View Tasks"
              description="See what needs your attention"
              href="/tasks"
            />
            <QuickActionItem
              icon={Bell}
              title="Read Announcements"
              description="Stay updated with the latest news"
              href="/announcements"
            />
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
              Your latest account activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity === undefined ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium">No recent activity</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your activity will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
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

      {/* Getting Started */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Welcome to your Client Portal</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload documents, track tasks, and stay updated with announcements from Amjad & Hazli.
            </p>
          </div>
          <Link to="/documents">
            <Button variant="outline" className="shrink-0 gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color?: "blue" | "green" | "amber" | "purple";
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
};

function StatusCard({ title, value, description, icon: Icon, href, color = "blue" }: StatusCardProps) {
  return (
    <Link to={href}>
      <Card className="transition-shadow hover:shadow-md cursor-pointer">
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
    </Link>
  );
}

interface QuickActionItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}

function QuickActionItem({ icon: Icon, title, description, href }: QuickActionItemProps) {
  return (
    <Link to={href}>
      <button
        className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </Link>
  );
}

function formatActivityAction(action: string): string {
  const actions: Record<string, string> = {
    uploaded_document: "uploaded",
    deleted_document: "deleted",
    created_task: "created task",
    completed_task: "completed task",
    updated_task: "updated task",
    deleted_task: "deleted task",
  };
  return actions[action] || action.replace(/_/g, " ");
}
