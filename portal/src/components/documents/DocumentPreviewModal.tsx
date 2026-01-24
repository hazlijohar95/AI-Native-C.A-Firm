/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn, formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Loader2,
  ExternalLink,
  Eye,
} from "@/lib/icons";
import type { Id } from "../../../convex/_generated/dataModel";

interface DocumentPreviewModalProps {
  documentId: Id<"documents"> | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

// File type helpers
function getFileCategory(type: string): "pdf" | "image" | "spreadsheet" | "text" | "other" {
  if (type.includes("pdf")) return "pdf";
  if (type.includes("image")) return "image";
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv")) return "spreadsheet";
  if (type.includes("text") || type.includes("plain")) return "text";
  return "other";
}

function getFileIcon(type: string) {
  const category = getFileCategory(type);
  switch (category) {
    case "pdf":
      return <FileText className="h-12 w-12 text-red-500" />;
    case "spreadsheet":
      return <FileSpreadsheet className="h-12 w-12 text-green-600" />;
    case "image":
      return <FileImage className="h-12 w-12 text-blue-500" />;
    default:
      return <File className="h-12 w-12 text-gray-500" />;
  }
}


export function DocumentPreviewModal({
  documentId,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: DocumentPreviewModalProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch document details
  const doc = useQuery(
    api.documents.get,
    documentId ? { id: documentId } : "skip"
  );

  // Get download URL
  const downloadUrl = useQuery(
    api.documents.getDownloadUrl,
    documentId ? { id: documentId } : "skip"
  );

  // Log access for preview
  const logAccess = useMutation(api.documents.logAccess);

  // Log preview access when document loads
  useEffect(() => {
    if (doc && documentId && isOpen) {
      logAccess({ documentId, action: "preview" }).catch(console.error);
    }
  }, [doc, documentId, isOpen, logAccess]);

  // Reset view state when document changes
  // This is an intentional pattern to reset UI state when switching documents
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setZoom(100);
    setRotation(0);
    setImageError(false);
    setIsLoading(true);
  }, [documentId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrevious && onPrevious) onPrevious();
          break;
        case "ArrowRight":
          if (hasNext && onNext) onNext();
          break;
        case "+":
        case "=":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom((z) => Math.min(z + 25, 300));
          }
          break;
        case "-":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom((z) => Math.max(z - 25, 25));
          }
          break;
        case "0":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(100);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasNext, hasPrevious, onNext, onPrevious, onClose]);

  const handleDownload = useCallback(async () => {
    if (!downloadUrl || !doc) return;

    try {
      // Log download action
      if (documentId) {
        await logAccess({ documentId, action: "download" });
      }

      // Open download URL
      window.open(downloadUrl, "_blank");
    } catch (error) {
      console.error("Download error:", error);
    }
  }, [downloadUrl, doc, documentId, logAccess]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  if (!doc) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl h-[85vh] flex items-center justify-center">
          <DialogTitle className="sr-only">Loading document</DialogTitle>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#9d9da6]" />
            <span className="text-sm text-[#6b6b76]">Loading document...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const fileCategory = getFileCategory(doc.type);
  const canPreview = fileCategory === "pdf" || fileCategory === "image";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden",
          "bg-white dark:bg-[#0f0f12] border-[#EBEBEB]"
        )}
      >
        <DialogTitle className="sr-only">{doc.name}</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EBEBEB] bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">{getFileIcon(doc.type)}</div>
            <div className="min-w-0">
              <h2 className="font-medium text-[#0f0f12] truncate">{doc.name}</h2>
              <p className="text-xs text-[#9d9da6]">
                {formatFileSize(doc.size)} &bull; {doc.type.split("/").pop()?.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls (for images) */}
            {fileCategory === "image" && !imageError && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 25}
                  className="h-8 w-8"
                  title="Zoom out (Ctrl+-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-[#6b6b76] min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 300}
                  className="h-8 w-8"
                  title="Zoom in (Ctrl++)"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRotate}
                  className="h-8 w-8"
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-[#EBEBEB]" />
              </>
            )}

            {/* Download button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-hidden relative bg-[#f5f5f5]">
          {/* Navigation arrows */}
          {hasPrevious && (
            <button
              onClick={onPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-[#EBEBEB] shadow-sm flex items-center justify-center hover:bg-white transition-colors"
              title="Previous (Left arrow)"
            >
              <ChevronLeft className="h-5 w-5 text-[#6b6b76]" />
            </button>
          )}

          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-[#EBEBEB] shadow-sm flex items-center justify-center hover:bg-white transition-colors"
              title="Next (Right arrow)"
            >
              <ChevronRight className="h-5 w-5 text-[#6b6b76]" />
            </button>
          )}

          {/* Content based on file type */}
          {fileCategory === "pdf" && downloadUrl && (
            <div className="h-full w-full">
              <iframe
                src={`${downloadUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full border-0"
                title={doc.name}
                onLoad={() => setIsLoading(false)}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f5]">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#9d9da6]" />
                    <span className="text-sm text-[#6b6b76]">Loading PDF...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {fileCategory === "image" && downloadUrl && !imageError && (
            <div className="h-full w-full overflow-auto flex items-center justify-center p-8">
              <img
                src={downloadUrl}
                alt={doc.name}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setImageError(true);
                  setIsLoading(false);
                }}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f5]">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#9d9da6]" />
                    <span className="text-sm text-[#6b6b76]">Loading image...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Unsupported preview or error */}
          {(!canPreview || imageError) && (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#e5e5e7] flex items-center justify-center mb-6">
                {getFileIcon(doc.type)}
              </div>
              <h3 className="font-medium text-[#0f0f12] mb-2">
                {imageError ? "Unable to load preview" : "Preview not available"}
              </h3>
              <p className="text-sm text-[#6b6b76] mb-6 max-w-md">
                {imageError
                  ? "There was an error loading this image. You can download the file to view it."
                  : `Preview is not available for ${doc.type.split("/").pop()?.toUpperCase()} files. Download the file to view its contents.`}
              </p>
              <div className="flex gap-3">
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download File
                </Button>
                {downloadUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(downloadUrl, "_blank")}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with document info */}
        <div className="px-4 py-3 border-t border-[#EBEBEB] bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-[#6b6b76]">
            <div className="flex items-center gap-4">
              <span>
                Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
              </span>
              {doc.category && (
                <span className="px-2 py-0.5 rounded bg-[#f0f0f0] text-[#3A3A3A] uppercase tracking-wide text-[10px] font-medium">
                  {doc.category.replace("_", " ")}
                </span>
              )}
              {doc.fiscalYear && (
                <span>FY {doc.fiscalYear}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>Press Esc to close, Arrow keys to navigate</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage preview state
export function useDocumentPreview() {
  const [previewId, setPreviewId] = useState<Id<"documents"> | null>(null);
  const [documentList, setDocumentList] = useState<Id<"documents">[]>([]);

  const openPreview = useCallback((
    documentId: Id<"documents">,
    allDocuments?: Id<"documents">[]
  ) => {
    setPreviewId(documentId);
    if (allDocuments) {
      setDocumentList(allDocuments);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewId(null);
  }, []);

  const currentIndex = previewId ? documentList.indexOf(previewId) : -1;

  const goToNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < documentList.length - 1) {
      setPreviewId(documentList[currentIndex + 1]);
    }
  }, [currentIndex, documentList]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setPreviewId(documentList[currentIndex - 1]);
    }
  }, [currentIndex, documentList]);

  return {
    previewId,
    isOpen: previewId !== null,
    openPreview,
    closePreview,
    goToNext,
    goToPrevious,
    hasNext: currentIndex >= 0 && currentIndex < documentList.length - 1,
    hasPrevious: currentIndex > 0,
  };
}
