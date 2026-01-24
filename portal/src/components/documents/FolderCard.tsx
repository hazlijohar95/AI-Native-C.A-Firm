import { cn } from "@/lib/utils";
import {
  FolderOpen,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowRight,
} from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Id, Doc } from "../../../convex/_generated/dataModel";

// Color mapping for folders
const folderColors: Record<string, { bg: string; iconBg: string; text: string; border: string }> = {
  blue: {
    bg: "bg-blue-50/50",
    iconBg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-100",
  },
  emerald: {
    bg: "bg-emerald-50/50",
    iconBg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-100",
  },
  violet: {
    bg: "bg-violet-50/50",
    iconBg: "bg-violet-100",
    text: "text-violet-700",
    border: "border-violet-100",
  },
  amber: {
    bg: "bg-amber-50/50",
    iconBg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-100",
  },
  cyan: {
    bg: "bg-cyan-50/50",
    iconBg: "bg-cyan-100",
    text: "text-cyan-700",
    border: "border-cyan-100",
  },
  gray: {
    bg: "bg-gray-50/50",
    iconBg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
  },
};

interface FolderWithCount extends Doc<"folders"> {
  documentCount: number;
}

interface FolderCardProps {
  folder: FolderWithCount;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  delay?: number;
}

export function FolderCard({
  folder,
  onClick,
  onEdit,
  onDelete,
  delay = 0,
}: FolderCardProps) {
  const colors = folderColors[folder.color || "gray"] || folderColors.gray;

  return (
    <div
      className={cn(
        "group relative rounded-xl border transition-all duration-200",
        "hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06)]",
        "hover:-translate-y-0.5",
        colors.border,
        colors.bg,
        "opacity-0"
      )}
      style={{
        animation: `slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards`,
      }}
    >
      {/* Click area */}
      <button
        onClick={onClick}
        className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f0f12] rounded-xl"
      >
        <div className="flex items-start justify-between mb-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors.iconBg)}>
            <FolderOpen className={cn("h-5 w-5", colors.text)} />
          </div>
          <ArrowRight
            className={cn(
              "h-4 w-4 text-[#9d9da6] transition-transform duration-200",
              "group-hover:translate-x-1 group-hover:text-[#6b6b76]"
            )}
          />
        </div>

        <h3 className="font-medium text-[#0f0f12] text-sm line-clamp-1 mb-1">
          {folder.name}
        </h3>

        {folder.description && (
          <p className="text-xs text-[#6b6b76] line-clamp-2 mb-2">
            {folder.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-[#9d9da6]">
          <FileText className="h-3.5 w-3.5" />
          <span>
            {folder.documentCount} {folder.documentCount === 1 ? "document" : "documents"}
          </span>
        </div>
      </button>

      {/* Actions menu */}
      {(onEdit || onDelete) && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/80 backdrop-blur-sm border border-black/5 hover:bg-white transition-colors"
              >
                <MoreHorizontal className="h-4 w-4 text-[#6b6b76]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Rename Folder
                </DropdownMenuItem>
              )}
              {onEdit && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Folder
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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

// Grid container for folder cards
interface FolderGridProps {
  folders: FolderWithCount[];
  onFolderClick: (folderId: Id<"folders">) => void;
  onEdit?: (folder: FolderWithCount) => void;
  onDelete?: (folder: FolderWithCount) => void;
  className?: string;
}

export function FolderGrid({
  folders,
  onFolderClick,
  onEdit,
  onDelete,
  className,
}: FolderGridProps) {
  if (folders.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4", className)}>
      {folders.map((folder, index) => (
        <FolderCard
          key={folder._id}
          folder={folder}
          onClick={() => onFolderClick(folder._id)}
          onEdit={onEdit ? () => onEdit(folder) : undefined}
          onDelete={onDelete ? () => onDelete(folder) : undefined}
          delay={0.05 + index * 0.03}
        />
      ))}
    </div>
  );
}

// Empty state when no folders exist
export function EmptyFolderState({
  onCreateFolder,
  serviceName,
}: {
  onCreateFolder?: () => void;
  serviceName?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 text-center",
        "rounded-xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa]"
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-3">
        <FolderOpen className="h-5 w-5 text-[#6b6b76]" />
      </div>
      <p className="text-sm font-medium text-[#0f0f12]">No folders yet</p>
      <p className="text-xs text-[#9d9da6] mt-1 mb-3 max-w-xs">
        {serviceName
          ? `Create folders to organize your ${serviceName} documents`
          : "Create folders to organize your documents"}
      </p>
      {onCreateFolder && (
        <button
          onClick={onCreateFolder}
          className="text-xs font-medium text-[#0f0f12] hover:underline"
        >
          + Create Folder
        </button>
      )}
    </div>
  );
}
