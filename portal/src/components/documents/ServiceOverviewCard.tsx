import { cn, formatDistanceToNow, formatFileSize } from "@/lib/utils";
import { getServiceIcon, getServiceColor } from "@/lib/constants";
import {
  FolderOpen,
  ArrowRight,
  Clock,
} from "@/lib/icons";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

interface ServiceStats {
  serviceType: Doc<"serviceTypes">;
  documentCount: number;
  folderCount: number;
  totalSize: number;
  lastUploadAt: number | null;
}

interface ServiceOverviewCardProps {
  stats: ServiceStats;
  onClick: () => void;
  delay?: number;
}

export function ServiceOverviewCard({ stats, onClick, delay = 0 }: ServiceOverviewCardProps) {
  const { serviceType, documentCount, folderCount, totalSize, lastUploadAt } = stats;

  const colors = getServiceColor(serviceType.color);

  // Get icon component - render inline to avoid React Compiler static component warning
  const renderIcon = () => {
    const IconComponent = getServiceIcon(serviceType.icon);
    return <IconComponent className={cn("h-6 w-6", colors.text)} />;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full text-left rounded-2xl border p-5 transition-all duration-200",
        "hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06)]",
        "hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
        colors.border,
        "bg-gradient-to-br",
        colors.gradient,
        "opacity-0"
      )}
      style={{
        animation: `slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colors.iconBg)}>
          {renderIcon()}
        </div>
        <ArrowRight
          className={cn(
            "h-5 w-5 text-[#9d9da6] transition-transform duration-200",
            "group-hover:translate-x-1 group-hover:text-[#6b6b76]"
          )}
        />
      </div>

      {/* Service Name */}
      <h3 className="font-serif text-lg text-[#0f0f12] mb-1">{serviceType.name}</h3>

      {/* Description */}
      {serviceType.description && (
        <p className="text-sm text-[#6b6b76] line-clamp-2 mb-4">{serviceType.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-[#9d9da6]" />
          <span className="text-[#3A3A3A] font-medium">{documentCount}</span>
          <span className="text-[#9d9da6]">docs</span>
        </div>

        {folderCount > 0 && (
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-[#9d9da6]" />
            <span className="text-[#3A3A3A] font-medium">{folderCount}</span>
            <span className="text-[#9d9da6]">folders</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between text-xs text-[#9d9da6]">
        {lastUploadAt ? (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Last upload {formatDistanceToNow(lastUploadAt)}</span>
          </div>
        ) : (
          <span>No documents yet</span>
        )}

        {totalSize > 0 && <span className="font-['DM_Mono']">{formatFileSize(totalSize)}</span>}
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </button>
  );
}

// Grid container for service cards
interface ServiceOverviewGridProps {
  stats: ServiceStats[];
  onSelectService: (serviceId: Id<"serviceTypes">) => void;
  className?: string;
}

export function ServiceOverviewGrid({ stats, onSelectService, className }: ServiceOverviewGridProps) {
  if (stats.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          "rounded-2xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa]"
        )}
      >
        <div className="w-14 h-14 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-4">
          <FolderOpen className="h-6 w-6 text-[#6b6b76]" />
        </div>
        <p className="text-base font-medium text-[#0f0f12]">No services available</p>
        <p className="text-sm text-[#9d9da6] mt-1">
          Contact your administrator to set up services for your organization
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {stats.map((stat, index) => (
        <ServiceOverviewCard
          key={stat.serviceType._id}
          stats={stat}
          onClick={() => onSelectService(stat.serviceType._id)}
          delay={0.1 + index * 0.05}
        />
      ))}
    </div>
  );
}
