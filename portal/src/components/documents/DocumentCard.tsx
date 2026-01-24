import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn, formatDistanceToNow, formatFileSize } from "@/lib/utils";
import {
  getServiceIcon,
  getServiceColor,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/constants";
import {
  FileText,
  File,
  FileSpreadsheet,
  FileImage,
  Download,
  Trash2,
  Eye,
  MoreHorizontal,
  Tag,
  Clock,
  History,
  FolderOpen,
} from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Doc } from "../../../convex/_generated/dataModel";

function getFileIcon(type: string) {
  if (type.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" aria-hidden="true" />;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet className="h-8 w-8 text-green-600" aria-hidden="true" />;
  if (type.includes("image")) return <FileImage className="h-8 w-8 text-blue-500" aria-hidden="true" />;
  return <File className="h-8 w-8 text-gray-500" aria-hidden="true" />;
}


interface DocumentCardProps {
  document: Doc<"documents"> & {
    tags?: string[];
    serviceType?: Doc<"serviceTypes"> | null;
  };
  onDelete?: () => void;
  onPreview?: () => void;
  onViewVersions?: () => void;
  onMoveToFolder?: () => void;
  showServiceBadge?: boolean;
  delay?: number;
}

export function DocumentCard({
  document,
  onDelete,
  onPreview,
  onViewVersions,
  onMoveToFolder,
  showServiceBadge = false,
  delay = 0,
}: DocumentCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const generateDownloadUrl = useAction(api.documents.generateDownloadUrl);
  const logAccess = useMutation(api.documents.logAccess);

  const handleDownload = async () => {
    if (!document.convexStorageId) {
      toast.error("This document is not available for download");
      return;
    }

    setIsDownloading(true);
    try {
      const result = await generateDownloadUrl({ documentId: document._id });
      if (result.downloadUrl) {
        // Log the download
        await logAccess({ documentId: document._id, action: "download" });

        // Create a temporary link and trigger download
        const link = window.document.createElement("a");
        link.href = result.downloadUrl;
        link.download = result.filename || document.name;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        toast.success("Download started");
      } else {
        toast.error("Failed to generate download URL");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download document");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (onPreview) {
      // Log the preview
      try {
        await logAccess({ documentId: document._id, action: "preview" });
      } catch {
        // Ignore log errors
      }
      onPreview();
    }
  };

  const canDownload = !!document.convexStorageId;
  const canPreview = document.type.includes("pdf") || document.type.includes("image");
  const categoryColor = getCategoryColor(document.category);
  const serviceType = document.serviceType;
  const serviceColor = serviceType ? getServiceColor(serviceType.color) : null;

  // Render service icon inline to avoid React Compiler static component warning
  const renderServiceIcon = () => {
    if (!serviceType) return null;
    const IconComponent = getServiceIcon(serviceType.icon);
    return <IconComponent className="h-3 w-3" />;
  };

  return (
    <div
      className={cn(
        "group bg-white rounded-2xl border border-black/5 p-5 transition-all duration-200",
        "hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06)]",
        "hover:-translate-y-0.5 opacity-0"
      )}
      style={{
        animation: `slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards`,
      }}
    >
      <div className="flex items-start gap-4">
        {/* File Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f8f8f8] border border-black/5 flex-shrink-0">
          {getFileIcon(document.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* File Name */}
          <h3 className="truncate font-medium text-[#0f0f12] text-sm" title={document.name}>
            {document.name}
          </h3>

          {/* Description */}
          {document.description && (
            <p className="text-xs text-[#6b6b76] mt-1 line-clamp-1">{document.description}</p>
          )}

          {/* Badges */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Service Badge */}
            {showServiceBadge && serviceType && serviceColor && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                  serviceColor.bg,
                  serviceColor.text
                )}
              >
                {renderServiceIcon()}
                {serviceType.name}
              </span>
            )}

            {/* Category Badge */}
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide",
                categoryColor.bg,
                categoryColor.text
              )}
            >
              {getCategoryLabel(document.category)}
            </span>

            {/* File Size */}
            <span className="text-[11px] text-[#9d9da6] font-['DM_Mono']">
              {formatFileSize(document.size)}
            </span>

            {/* Version Badge */}
            {document.currentVersion && document.currentVersion > 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium">
                <History className="h-3 w-3" />v{document.currentVersion}
              </span>
            )}
          </div>

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {document.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f0f0f0] text-[#6b6b76] text-[10px]"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
              {document.tags.length > 3 && (
                <span className="text-[10px] text-[#9d9da6]">+{document.tags.length - 3} more</span>
              )}
            </div>
          )}

          {/* Fiscal Info */}
          {(document.fiscalYear || document.fiscalPeriod) && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-[#9d9da6]">
              {document.fiscalYear && <span>FY {document.fiscalYear}</span>}
              {document.fiscalPeriod && <span>{document.fiscalPeriod}</span>}
            </div>
          )}

          {/* Upload Time */}
          <p className="mt-2 text-xs text-[#9d9da6] flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Uploaded {formatDistanceToNow(document.uploadedAt)}
          </p>
        </div>

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-lg flex items-center justify-center text-[#9d9da6] hover:text-[#6b6b76] hover:bg-[#f8f8f8] transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canPreview && onPreview && (
              <DropdownMenuItem onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleDownload} disabled={!canDownload || isDownloading}>
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download"}
            </DropdownMenuItem>
            {onViewVersions && document.currentVersion && document.currentVersion > 1 && (
              <DropdownMenuItem onClick={onViewVersions}>
                <History className="h-4 w-4 mr-2" />
                Version History
              </DropdownMenuItem>
            )}
            {onMoveToFolder && (
              <DropdownMenuItem onClick={onMoveToFolder}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        {canPreview && onPreview && (
          <button
            onClick={handlePreview}
            className="flex-1 h-9 px-4 rounded-lg border border-[#EBEBEB] text-sm font-medium text-[#3A3A3A] bg-white hover:bg-[#f8f8f8] transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Preview
          </button>
        )}
        <button
          onClick={handleDownload}
          disabled={!canDownload || isDownloading}
          title={!canDownload ? "File not available" : undefined}
          className={cn(
            "h-9 px-4 rounded-lg border border-[#EBEBEB] text-sm font-medium text-[#3A3A3A] bg-white",
            "hover:bg-[#f8f8f8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
            "flex items-center justify-center gap-2",
            !canPreview || !onPreview ? "flex-1" : ""
          )}
        >
          {isDownloading ? (
            <div className="w-4 h-4 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isDownloading ? "Downloading..." : "Download"}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            aria-label={`Delete ${document.name}`}
            className="h-9 w-9 rounded-lg border border-[#EBEBEB] text-[#ef4444] bg-white hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
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

// Document list/grid component
interface DocumentListProps {
  documents: Array<Doc<"documents"> & { tags?: string[]; serviceType?: Doc<"serviceTypes"> | null }>;
  onDelete?: (doc: Doc<"documents">) => void;
  onPreview?: (doc: Doc<"documents">) => void;
  showServiceBadge?: boolean;
  emptyMessage?: string;
}

export function DocumentList({
  documents,
  onDelete,
  onPreview,
  showServiceBadge = false,
  emptyMessage = "No documents found",
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa]">
        <div className="w-14 h-14 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-4">
          <FolderOpen className="h-6 w-6 text-[#6b6b76]" />
        </div>
        <p className="text-base font-medium text-[#0f0f12]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc, index) => (
        <DocumentCard
          key={doc._id}
          document={doc}
          onDelete={onDelete ? () => onDelete(doc) : undefined}
          onPreview={onPreview ? () => onPreview(doc) : undefined}
          showServiceBadge={showServiceBadge}
          delay={0.1 + index * 0.03}
        />
      ))}
    </div>
  );
}
