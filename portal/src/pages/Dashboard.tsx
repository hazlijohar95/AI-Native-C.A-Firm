import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
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
  TrendingUp
} from "lucide-react";

export function Dashboard() {
  const { user } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const syncUser = useMutation(api.users.syncUser);

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
        <Button className="gap-2 self-start sm:self-center">
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Documents"
          value="0"
          description="Awaiting review"
          icon={FileText}
          trend="+0 this month"
          color="blue"
        />
        <StatusCard
          title="Tasks"
          value="0"
          description="Pending action"
          icon={CheckSquare}
          trend="All caught up"
          color="green"
        />
        <StatusCard
          title="Announcements"
          value="0"
          description="Unread updates"
          icon={Bell}
          trend="Nothing new"
          color="amber"
        />
        <StatusCard
          title="Outstanding"
          value="RM 0"
          description="Invoices due"
          icon={Receipt}
          trend="All paid"
          color="emerald"
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
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
              disabled
            />
            <QuickActionItem
              icon={CheckSquare}
              title="View Tasks"
              description="See what needs your attention"
              disabled
            />
            <QuickActionItem
              icon={Receipt}
              title="Pay Invoice"
              description="View and pay outstanding invoices"
              disabled
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
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium">No recent activity</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your activity will appear here once you start using the portal
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Welcome to your Client Portal</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We're rolling out new features in Phase 2. Soon you'll be able to upload documents, 
              track tasks, and pay invoices directly from here.
            </p>
          </div>
          <Button variant="outline" className="shrink-0 gap-2" disabled>
            Learn More
            <ArrowRight className="h-4 w-4" />
          </Button>
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
  trend?: string;
  color?: "blue" | "green" | "amber" | "emerald";
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

function StatusCard({ title, value, description, icon: Icon, trend, color = "blue" }: StatusCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <p className="mt-2 text-xs text-muted-foreground/70">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  disabled?: boolean;
}

function QuickActionItem({ icon: Icon, title, description, disabled }: QuickActionItemProps) {
  return (
    <button
      disabled={disabled}
      className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
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
  );
}
