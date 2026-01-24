/* eslint-disable react-refresh/only-export-components */
import { cn } from "@/lib/utils";
import { getServiceIcon } from "@/lib/constants";
import {
  ChevronRight,
  FolderOpen,
  LayoutGrid,
} from "@/lib/icons";
import type { Id, Doc } from "../../../convex/_generated/dataModel";

interface BreadcrumbItem {
  id: string | Id<"folders"> | Id<"serviceTypes">;
  name: string;
  type: "home" | "service" | "folder";
  icon?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem, index: number) => void;
  className?: string;
}

export function BreadcrumbNav({ items, onNavigate, className }: BreadcrumbNavProps) {
  const getIcon = (item: BreadcrumbItem) => {
    if (item.type === "home") {
      return <LayoutGrid className="h-4 w-4" />;
    }
    if (item.type === "service" && item.icon) {
      const Icon = getServiceIcon(item.icon);
      return <Icon className="h-4 w-4" />;
    }
    if (item.type === "folder") {
      return <FolderOpen className="h-4 w-4" />;
    }
    return null;
  };

  return (
    <nav
      className={cn("flex items-center gap-1 text-sm", className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={item.id} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-[#9d9da6] flex-shrink-0" />
            )}
            {isLast ? (
              <span className="flex items-center gap-1.5 px-2 py-1 text-[#0f0f12] font-medium">
                {getIcon(item)}
                <span className="truncate max-w-[150px]">{item.name}</span>
              </span>
            ) : (
              <button
                onClick={() => onNavigate(item, index)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-[#6b6b76]",
                  "hover:text-[#0f0f12] hover:bg-[#f0f0f0] transition-colors"
                )}
              >
                {getIcon(item)}
                <span className="truncate max-w-[150px]">{item.name}</span>
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Helper function to build breadcrumb items
export function buildBreadcrumbItems(options: {
  showHome?: boolean;
  serviceType?: Doc<"serviceTypes"> | null;
  folderPath?: Array<{ _id: Id<"folders">; name: string }>;
}): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];

  // Home/All Services
  if (options.showHome) {
    items.push({
      id: "all",
      name: "All Services",
      type: "home",
    });
  }

  // Service type
  if (options.serviceType) {
    items.push({
      id: options.serviceType._id,
      name: options.serviceType.name,
      type: "service",
      icon: options.serviceType.icon,
    });
  }

  // Folder path
  if (options.folderPath) {
    for (const folder of options.folderPath) {
      items.push({
        id: folder._id,
        name: folder.name,
        type: "folder",
      });
    }
  }

  return items;
}

// Compact breadcrumb for mobile
interface CompactBreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem, index: number) => void;
}

export function CompactBreadcrumb({ items, onNavigate }: CompactBreadcrumbProps) {
  if (items.length <= 1) {
    return null;
  }

  const lastItem = items[items.length - 1];
  const parentItem = items[items.length - 2];

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => onNavigate(parentItem, items.length - 2)}
        className="flex items-center gap-1 text-[#6b6b76] hover:text-[#0f0f12] transition-colors"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        <span>Back</span>
      </button>
      <span className="text-[#9d9da6]">/</span>
      <span className="font-medium text-[#0f0f12] truncate">{lastItem.name}</span>
    </div>
  );
}
