import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import {
  FileText,
  CheckSquare,
  Bell,
  Receipt,
  Upload,
  ArrowRight,
  Clock,
  User,
  TrendingUp,
  Sparkles,
} from "@/lib/icons";
import { formatDistanceToNow } from "@/lib/utils";

export function Dashboard() {
  const { user } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const syncUser = useMutation(api.users.syncUser);

  // Real data from Convex
  const documentCount = useQuery(api.documents.count);
  const pendingTaskCount = useQuery(api.tasks.countPending);
  const overdueTaskCount = useQuery(api.tasks.countOverdue);
  const unreadAnnouncementCount = useQuery(api.announcements.countUnread);
  const invoiceCounts = useQuery(api.invoices.countPending);
  const recentActivityResult = useQuery(api.activity.list, { limit: 5 });
  const recentActivity = recentActivityResult?.activities;

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
    <div className="space-y-8 lg:space-y-10">
      {/* Welcome Section */}
      <div
        className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f8f8f8] border border-black/5 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#6b6b76]" />
            <span className="text-xs font-medium text-[#6b6b76]">Dashboard</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#0f0f12] tracking-tight">
            {greeting}, <span className="italic text-[#6b6b76]">{firstName}</span>
          </h1>
          <p className="mt-2 text-[#6b6b76]">
            Here's what's happening with your account
          </p>
        </div>
        <Link
          to="/documents"
          className="group inline-flex items-center gap-2 h-11 px-5 bg-[#0f0f12] hover:bg-[#1a1a1f] text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 self-start sm:self-auto"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Document</span>
        </Link>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          {
            title: "Documents",
            value: documentCount?.toString() ?? "0",
            description: "Total documents",
            icon: FileText,
            href: "/documents",
            color: "blue" as const,
            delay: 0.1,
          },
          {
            title: "Tasks",
            value: pendingTaskCount?.toString() ?? "0",
            description: overdueTaskCount && overdueTaskCount > 0
              ? `${overdueTaskCount} overdue`
              : "Pending tasks",
            icon: CheckSquare,
            href: "/tasks",
            color: "amber" as const,
            delay: 0.15,
          },
          {
            title: "Announcements",
            value: unreadAnnouncementCount?.toString() ?? "0",
            description: "Unread updates",
            icon: Bell,
            href: "/announcements",
            color: "violet" as const,
            delay: 0.2,
          },
          {
            title: "Invoices",
            value:
              (invoiceCounts?.pending ?? 0) + (invoiceCounts?.overdue ?? 0) > 0
                ? `${(invoiceCounts?.pending ?? 0) + (invoiceCounts?.overdue ?? 0)}`
                : "0",
            description: invoiceCounts?.overdue ? `${invoiceCounts.overdue} overdue` : "Outstanding",
            icon: Receipt,
            href: "/invoices",
            color: "emerald" as const,
            delay: 0.25,
          },
        ]).map((card) => (
          <StatusCard key={card.title} {...card} />
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div
          className="bg-white rounded-2xl border border-black/5 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.02),0_8px_16px_rgba(0,0,0,0.03)] overflow-hidden opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards",
          }}
        >
          <div className="p-6 border-b border-black/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0f0f12] flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-serif text-lg text-[#0f0f12]">Quick Actions</h2>
                <p className="text-[#9d9da6] text-sm">Common tasks you can perform</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2">
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
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="bg-white rounded-2xl border border-black/5 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.02),0_8px_16px_rgba(0,0,0,0.03)] overflow-hidden opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards",
          }}
        >
          <div className="p-6 border-b border-black/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0f0f12] flex items-center justify-center">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-serif text-lg text-[#0f0f12]">Recent Activity</h2>
                <p className="text-[#9d9da6] text-sm">Your latest account activity</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            {recentActivity === undefined ? (
              <div className="flex h-48 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
                  <span className="text-[#9d9da6] text-sm">Loading...</span>
                </div>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa]">
                <div className="w-12 h-12 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-3">
                  <Clock className="h-5 w-5 text-[#6b6b76]" />
                </div>
                <p className="text-sm font-medium text-[#0f0f12]">No recent activity</p>
                <p className="text-xs text-[#9d9da6] mt-1">Your activity will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={activity._id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#f8f8f8] transition-colors"
                    style={{
                      animation: "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                      animationDelay: `${0.4 + index * 0.05}s`,
                      opacity: 0,
                    }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#f8f8f8] border border-black/5 flex items-center justify-center flex-shrink-0">
                      {activity.userAvatar ? (
                        <img
                          src={activity.userAvatar}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-[#6b6b76]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0f0f12]">
                        <span className="font-medium">{activity.userName}</span>{" "}
                        <span className="text-[#6b6b76]">{formatActivityAction(activity.action)}</span>
                        {activity.resourceName && (
                          <span className="font-medium"> "{activity.resourceName}"</span>
                        )}
                      </p>
                      <p className="text-xs text-[#9d9da6] mt-0.5">
                        {formatDistanceToNow(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Getting Started Card */}
      <div
        className="bg-[#0f0f12] rounded-2xl p-6 sm:p-8 relative overflow-hidden opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards",
        }}
      >
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl text-white mb-1">Welcome to your Client Portal</h3>
            <p className="text-white/60 text-sm max-w-md">
              Upload documents, track tasks, and stay updated with announcements from Amjad & Hazli.
            </p>
          </div>
          <Link
            to="/documents"
            className="group inline-flex items-center gap-2 h-10 px-5 bg-white hover:bg-white/90 text-[#0f0f12] rounded-xl font-medium text-sm transition-all duration-200 shrink-0"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: "blue" | "emerald" | "amber" | "violet";
  delay: number;
}

const colorConfig = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-100",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-100",
  },
  violet: {
    bg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-100",
  },
};

function StatusCard({ title, value, description, icon: Icon, href, color, delay }: StatusCardProps) {
  const colors = colorConfig[color];

  return (
    <Link
      to={href}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f0f12] focus-visible:ring-offset-2 rounded-2xl opacity-0"
      style={{
        animation: `slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards`,
      }}
    >
      <div className="bg-white rounded-2xl border border-black/5 p-5 transition-all duration-200 group-hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06)] group-hover:-translate-y-0.5 h-full">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${colors.text}`} />
          </div>
          <ArrowRight className="h-4 w-4 text-[#9d9da6] opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#9d9da6] mb-1">{title}</p>
          <p className="text-3xl font-semibold text-[#0f0f12] tabular-nums tracking-tight">{value}</p>
          <p className="text-sm text-[#6b6b76] mt-1">{description}</p>
        </div>
      </div>
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
    <Link
      to={href}
      className="group flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:bg-[#f8f8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f0f12] focus-visible:ring-offset-2"
    >
      <div className="w-10 h-10 rounded-xl bg-[#f8f8f8] border border-black/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200">
        <Icon className="h-4 w-4 text-[#0f0f12]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0f0f12]">{title}</p>
        <p className="text-xs text-[#6b6b76]">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[#9d9da6] opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
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
