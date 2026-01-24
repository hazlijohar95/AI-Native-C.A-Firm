import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Megaphone,
  AlertTriangle,
  Pin,
  Check,
  Sparkles,
  Building2,
  Settings,
  Lightbulb,
  Scale,
  Filter,
} from "@/lib/icons";
import { cn, formatDistanceToNow } from "@/lib/utils";

// Updated type configuration matching the expanded announcement types
const typeConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; iconBg: string; label: string }> = {
  general: {
    icon: <Megaphone className="h-4 w-4 text-blue-600" />,
    bg: "bg-blue-50",
    text: "text-blue-700",
    iconBg: "bg-blue-100",
    label: "General",
  },
  tax_deadline: {
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
    bg: "bg-red-50",
    text: "text-red-700",
    iconBg: "bg-red-100",
    label: "Tax Deadline",
  },
  regulatory: {
    icon: <Scale className="h-4 w-4 text-amber-600" />,
    bg: "bg-amber-50",
    text: "text-amber-700",
    iconBg: "bg-amber-100",
    label: "Regulatory",
  },
  firm_news: {
    icon: <Building2 className="h-4 w-4 text-purple-600" />,
    bg: "bg-purple-50",
    text: "text-purple-700",
    iconBg: "bg-purple-100",
    label: "Firm News",
  },
  maintenance: {
    icon: <Settings className="h-4 w-4 text-gray-600" />,
    bg: "bg-gray-100",
    text: "text-gray-700",
    iconBg: "bg-gray-200",
    label: "Maintenance",
  },
  tip: {
    icon: <Lightbulb className="h-4 w-4 text-green-600" />,
    bg: "bg-green-50",
    text: "text-green-700",
    iconBg: "bg-green-100",
    label: "Tip",
  },
};

export function Announcements() {
  const announcements = useQuery(api.announcements.list, {});
  const markRead = useMutation(api.announcements.markRead);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const handleMarkRead = async (id: string) => {
    await markRead({ id: id as any });
  };

  // Filter announcements by type
  const filteredAnnouncements = announcements?.filter(
    (a) => typeFilter === "all" || a.type === typeFilter
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div
        className="opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f8f8f8] border border-black/5 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#6b6b76]" />
              <span className="text-xs font-medium text-[#6b6b76]">Updates</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#0f0f12] tracking-tight">
              Announcements
            </h1>
            <p className="mt-2 text-[#6b6b76]">
              Important updates from Amjad & Hazli
            </p>
          </div>
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#9d9da6]" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] h-10 bg-white border-[#EBEBEB] rounded-lg text-sm">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(typeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {config.icon}
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      {announcements === undefined ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
            <span className="text-[#9d9da6] text-sm">Loading announcements...</span>
          </div>
        </div>
      ) : filteredAnnouncements?.length === 0 ? (
        <div
          className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa] opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
          }}
        >
          <div className="w-14 h-14 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-4">
            <Bell className="h-6 w-6 text-[#6b6b76]" />
          </div>
          <p className="text-base font-medium text-[#0f0f12]">
            {typeFilter !== "all" ? "No matching announcements" : "No announcements"}
          </p>
          <p className="text-sm text-[#9d9da6] mt-1">
            {typeFilter !== "all" ? "Try selecting a different type" : "Check back later for updates"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements?.map((announcement, index) => {
            const config = typeConfig[announcement.type] || typeConfig.general;
            return (
              <div
                key={announcement._id}
                className={cn(
                  "group bg-white rounded-2xl border border-black/5 overflow-hidden transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06)] opacity-0",
                  !announcement.isRead && "border-l-4 border-l-[#253FF6]",
                  announcement.isPinned && "ring-1 ring-amber-200"
                )}
                style={{
                  animation: `slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + index * 0.05}s forwards`,
                }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.iconBg)}>
                        {config.icon}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif text-lg text-[#0f0f12]">
                            {announcement.title}
                          </h3>
                          {announcement.isPinned && (
                            <Pin className="h-4 w-4 text-amber-500" />
                          )}
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", config.bg, config.text)}>
                            {config.label}
                          </span>
                          {!announcement.isRead && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#253FF6] text-white text-[10px] font-medium uppercase tracking-wide">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#9d9da6] font-['DM_Mono']">
                          Posted {formatDistanceToNow(announcement.publishedAt)}
                        </p>
                      </div>
                    </div>

                    {!announcement.isRead && (
                      <button
                        onClick={() => handleMarkRead(announcement._id)}
                        className="h-8 px-3 rounded-lg text-xs font-medium text-[#6b6b76] hover:text-[#0f0f12] hover:bg-[#f8f8f8] transition-colors flex items-center gap-1.5"
                      >
                        <Check className="h-3 w-3" />
                        Mark as read
                      </button>
                    )}
                  </div>

                  <div className="mt-4 ml-14">
                    <div className="text-sm text-[#6b6b76] leading-relaxed">
                      {announcement.content.split("\n").map((paragraph, i) => (
                        <p key={i} className="mb-2 last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    {announcement.expiresAt && (
                      <p className="mt-4 text-xs text-[#9d9da6] font-['DM_Mono']">
                        Expires {formatDistanceToNow(announcement.expiresAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
