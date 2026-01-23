import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDialog } from "@/hooks";
import { useMutationWithToast } from "@/hooks";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Filter,
  File,
  FileSpreadsheet,
  FileImage,
  FolderOpen,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  ArrowRight,
  AlertTriangle,
  Check,
} from "@/lib/icons";
import { formatDistanceToNow, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";

// Document category type
type DocumentCategory = "tax_return" | "financial_statement" | "invoice" | "agreement" | "receipt" | "other";

const categories = [
  { value: "all", label: "All Documents" },
  { value: "tax_return", label: "Tax Returns" },
  { value: "financial_statement", label: "Financial Statements" },
  { value: "invoice", label: "Invoices" },
  { value: "agreement", label: "Agreements" },
  { value: "receipt", label: "Receipts" },
  { value: "other", label: "Other" },
];

const categoryColors: Record<string, { bg: string; text: string }> = {
  tax_return: { bg: "bg-blue-50", text: "text-blue-700" },
  financial_statement: { bg: "bg-emerald-50", text: "text-emerald-700" },
  invoice: { bg: "bg-amber-50", text: "text-amber-700" },
  agreement: { bg: "bg-violet-50", text: "text-violet-700" },
  receipt: { bg: "bg-gray-100", text: "text-gray-700" },
  other: { bg: "bg-gray-100", text: "text-gray-700" },
};

const requestStatusConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    bg: "bg-amber-50",
    text: "text-amber-700",
    label: "Pending Upload"
  },
  uploaded: {
    icon: <Clock className="h-3.5 w-3.5" />,
    bg: "bg-blue-50",
    text: "text-blue-700",
    label: "Under Review"
  },
  reviewed: {
    icon: <Check className="h-3.5 w-3.5" />,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    label: "Approved"
  },
  rejected: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    bg: "bg-red-50",
    text: "text-red-700",
    label: "Re-upload Required"
  },
};

// Max file size: 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
];

function getFileIcon(type: string) {
  if (type.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" aria-hidden="true" />;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet className="h-8 w-8 text-green-600" aria-hidden="true" />;
  if (type.includes("image")) return <FileImage className="h-8 w-8 text-blue-500" aria-hidden="true" />;
  return <File className="h-8 w-8 text-gray-500" aria-hidden="true" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function Documents() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fulfillRequestId, setFulfillRequestId] = useState<Id<"documentRequests"> | null>(null);

  // Use dialog hook for delete confirmation
  const deleteDialog = useDialog<{ id: Id<"documents">; name: string }>();

  const documents = useQuery(api.documents.list, {
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });
  const currentUser = useQuery(api.users.getCurrentUser);

  // Document requests for clients
  const documentRequests = useQuery(api.documents.listRequests, {});
  const pendingRequests = documentRequests?.filter(r => r.status === "pending" || r.status === "rejected") ?? [];
  const hasRequests = pendingRequests.length > 0;

  const deleteDocumentMutation = useMutation(api.documents.remove);
  const { execute: deleteDocument, isLoading: isDeleting } = useMutationWithToast(
    (args: { id: Id<"documents"> }) => deleteDocumentMutation(args),
    {
      successMessage: "Document deleted",
      onSuccess: () => deleteDialog.close(),
    }
  );

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.data) return;
    await deleteDocument({ id: deleteDialog.data.id });
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div
        className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f8f8f8] border border-black/5 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#6b6b76]" />
            <span className="text-xs font-medium text-[#6b6b76]">Documents</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#0f0f12] tracking-tight">
            Your <span className="italic text-[#6b6b76]">Documents</span>
          </h1>
          <p className="mt-2 text-[#6b6b76]">
            View and manage your uploaded files
          </p>
        </div>

        <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) setFulfillRequestId(null);
        }}>
          <DialogTrigger asChild>
            <button className="group inline-flex items-center gap-2 h-11 px-5 bg-[#0f0f12] hover:bg-[#1a1a1f] text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 self-start sm:self-auto">
              <Upload className="h-4 w-4" />
              <span>Upload Document</span>
            </button>
          </DialogTrigger>
          <UploadDocumentDialog
            organizationId={currentUser?.organizationId}
            onClose={() => {
              setUploadDialogOpen(false);
              setFulfillRequestId(null);
            }}
            fulfillRequestId={fulfillRequestId}
            onFulfillComplete={() => setFulfillRequestId(null)}
          />
        </Dialog>
      </div>

      {/* Filters */}
      <div
        className="flex items-center gap-3 opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
        }}
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#9d9da6]" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-10 bg-white border-[#EBEBEB] rounded-lg text-sm">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Document Requests Section (for clients) */}
      {currentUser?.role === "client" && hasRequests && (
        <div
          className="opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards",
          }}
        >
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-serif text-lg text-[#0f0f12]">Documents Requested</h2>
                <p className="text-sm text-[#6b6b76]">
                  {pendingRequests.length} document{pendingRequests.length !== 1 ? "s" : ""} awaiting your upload
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <DocumentRequestCard
                  key={request._id}
                  request={request}
                  onFulfill={() => {
                    setFulfillRequestId(request._id);
                    setUploadDialogOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document List */}
      {documents === undefined ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
            <span className="text-[#9d9da6] text-sm">Loading documents...</span>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div
          className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa] opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards",
          }}
        >
          <div className="w-14 h-14 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-4">
            <FolderOpen className="h-6 w-6 text-[#6b6b76]" />
          </div>
          <p className="text-base font-medium text-[#0f0f12]">No documents yet</p>
          <p className="text-sm text-[#9d9da6] mt-1 mb-4">
            {categoryFilter !== "all"
              ? "No documents found in this category"
              : "Upload your first document to get started"}
          </p>
          <button
            onClick={() => setUploadDialogOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-5 bg-[#0f0f12] hover:bg-[#1a1a1f] text-white rounded-xl font-medium text-sm transition-all duration-200"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc, index) => (
            <DocumentCard
              key={doc._id}
              doc={doc}
              onDelete={() => deleteDialog.open({ id: doc._id, name: doc.name })}
              delay={0.15 + index * 0.03}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={deleteDialog.setIsOpen}>
        <AlertDialogContent className="bg-white border border-[#EBEBEB] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-[#0f0f12]">Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6b6b76]">
              Are you sure you want to delete "{deleteDialog.data?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel disabled={isDeleting} className="h-10 px-5 rounded-lg border-[#EBEBEB] text-[#3A3A3A] hover:bg-[#f8f8f8]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="h-10 px-5 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Deleting...</span>
                </div>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Document Card with download functionality
interface DocumentCardProps {
  doc: {
    _id: Id<"documents">;
    name: string;
    type: string;
    size: number;
    category: string;
    uploadedAt: number;
    convexStorageId?: string;
  };
  onDelete: () => void;
  delay?: number;
}

function DocumentCard({ doc, onDelete, delay = 0 }: DocumentCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const generateDownloadUrl = useAction(api.documents.generateDownloadUrl);

  const handleDownload = async () => {
    if (!doc.convexStorageId) {
      toast.error("This document is not available for download");
      return;
    }

    setIsDownloading(true);
    try {
      const result = await generateDownloadUrl({ documentId: doc._id });
      if (result.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = result.downloadUrl;
        link.download = result.filename || doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

  const canDownload = !!doc.convexStorageId;
  const colors = categoryColors[doc.category] || categoryColors.other;

  return (
    <div
      className="group bg-white rounded-2xl border border-black/5 p-5 transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 opacity-0"
      style={{
        animation: `slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards`,
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f8f8f8] border border-black/5 flex-shrink-0">
          {getFileIcon(doc.type)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-medium text-[#0f0f12] text-sm" title={doc.name}>
            {doc.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", colors.bg, colors.text)}>
              {categories.find((c) => c.value === doc.category)?.label || doc.category}
            </span>
            <span className="text-[11px] text-[#9d9da6] font-['DM_Mono']">
              {formatFileSize(doc.size)}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#9d9da6]">
            Uploaded {formatDistanceToNow(doc.uploadedAt)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleDownload}
          disabled={!canDownload || isDownloading}
          title={!canDownload ? "File not available" : undefined}
          className="flex-1 h-9 px-4 rounded-lg border border-[#EBEBEB] text-sm font-medium text-[#3A3A3A] bg-white hover:bg-[#f8f8f8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isDownloading ? (
            <div className="w-4 h-4 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isDownloading ? "Downloading..." : "Download"}
        </button>
        <button
          onClick={onDelete}
          aria-label={`Delete ${doc.name}`}
          className="h-9 w-9 rounded-lg border border-[#EBEBEB] text-[#ef4444] bg-white hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// Document Request Card for clients
interface DocumentRequestCardProps {
  request: {
    _id: Id<"documentRequests">;
    title: string;
    description?: string;
    category: string;
    dueDate?: number;
    status: string;
    reviewNote?: string;
  };
  onFulfill: () => void;
}

function DocumentRequestCard({ request, onFulfill }: DocumentRequestCardProps) {
  const config = requestStatusConfig[request.status] || requestStatusConfig.pending;
  const categoryColor = categoryColors[request.category] || categoryColors.other;
  const isOverdue = request.dueDate && request.dueDate < Date.now() && request.status === "pending";

  return (
    <div className="bg-white rounded-xl border border-black/5 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-[#0f0f12] text-sm">{request.title}</h3>
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium", config.bg, config.text)}>
            {config.icon}
            {config.label}
          </span>
        </div>

        {request.description && (
          <p className="text-xs text-[#6b6b76] mt-1 line-clamp-2">{request.description}</p>
        )}

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", categoryColor.bg, categoryColor.text)}>
            {categories.find((c) => c.value === request.category)?.label || request.category}
          </span>
          {request.dueDate && (
            <span className={cn("text-[11px] font-['DM_Mono']", isOverdue ? "text-red-600" : "text-[#9d9da6]")}>
              {isOverdue ? "Overdue: " : "Due: "}
              {new Date(request.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {request.status === "rejected" && request.reviewNote && (
          <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
            <p className="text-xs text-red-700">
              <strong>Feedback:</strong> {request.reviewNote}
            </p>
          </div>
        )}
      </div>

      {(request.status === "pending" || request.status === "rejected") && (
        <button
          onClick={onFulfill}
          className="inline-flex items-center gap-2 h-9 px-4 bg-[#0f0f12] hover:bg-[#1a1a1f] text-white rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// Upload Document Dialog
interface UploadDocumentDialogProps {
  organizationId?: Id<"organizations">;
  onClose: () => void;
  fulfillRequestId?: Id<"documentRequests"> | null;
  onFulfillComplete?: () => void;
}

function UploadDocumentDialog({ organizationId, onClose, fulfillRequestId, onFulfillComplete }: UploadDocumentDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "creating" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useAction(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const fulfillRequest = useMutation(api.documents.fulfillRequest);

  // If fulfilling a request, get the request details
  const request = useQuery(
    api.documents.getRequest,
    fulfillRequestId ? { id: fulfillRequestId } : "skip"
  );

  // Auto-set category from request when fulfilling a document request
  useEffect(() => {
    if (request?.category) {
      setCategory(request.category as DocumentCategory);
    }
  }, [request]);

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: "File type not allowed. Supported: PDF, Word, Excel, CSV, images, and text files."
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
      };
    }
    return { valid: true };
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid file");
      setSelectedFile(null);
      return;
    }
    setErrorMessage("");
    setSelectedFile(file);
  }, [validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile || !organizationId) return;

    setIsUploading(true);
    setUploadProgress("uploading");
    setErrorMessage("");

    try {
      // Step 1: Get upload URL
      const { uploadUrl, storageKey } = await generateUploadUrl({
        filename: selectedFile.name,
        contentType: selectedFile.type,
        organizationId: organizationId.toString(),
        fileSize: selectedFile.size,
      });

      // Step 2: Upload file to Convex storage
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload file");
      }

      // Get the storage ID from the response
      const { storageId } = await uploadResult.json();

      // Step 3: Create document record
      setUploadProgress("creating");
      const docId = await createDocument({
        organizationId,
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        storageKey,
        convexStorageId: storageId,
        category: fulfillRequestId && request?.category ? request.category as DocumentCategory : category,
      });

      // Step 4: If fulfilling a request, link the document
      if (fulfillRequestId && docId) {
        await fulfillRequest({
          requestId: fulfillRequestId,
          documentId: docId,
        });
        onFulfillComplete?.();
      }

      setUploadProgress("done");
      toast.success(fulfillRequestId ? "Document uploaded and submitted for review" : "Document uploaded successfully");

      // Reset and close after short delay
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress("idle");
        onClose();
      }, 1000);
    } catch (error) {
      setUploadProgress("error");
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setErrorMessage("");
    setUploadProgress("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Check if user has an organization
  if (!organizationId) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Unable to upload documents
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            You need to be assigned to an organization to upload documents.
            Please contact your administrator.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{fulfillRequestId ? "Upload Requested Document" : "Upload Document"}</DialogTitle>
        <DialogDescription>
          {fulfillRequestId && request ? (
            <span>Uploading: <strong>{request.title}</strong></span>
          ) : (
            "Upload a document to your organization's storage"
          )}
        </DialogDescription>
      </DialogHeader>

      {/* Request details banner */}
      {fulfillRequestId && request && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 -mt-2">
          <p className="text-xs text-blue-700 font-medium mb-1">Requested Document</p>
          {request.description && (
            <p className="text-xs text-blue-600">{request.description}</p>
          )}
          {request.dueDate && (
            <p className="text-xs text-blue-600 mt-1">
              Due: {new Date(request.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 py-4">
        {/* Drop Zone */}
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
            isDragging && "border-primary bg-primary/5",
            selectedFile && "border-green-500 bg-green-50",
            errorMessage && "border-destructive bg-destructive/5",
            !isDragging && !selectedFile && !errorMessage && "border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="flex items-center gap-3 w-full">
              <div className="flex-shrink-0">
                {getFileIcon(selectedFile.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                disabled={isUploading}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                Drag & drop your file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleInputChange}
                accept={ALLOWED_TYPES.join(",")}
                disabled={isUploading}
              />
            </>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {errorMessage}
          </div>
        )}

        {/* File type info */}
        <p className="text-xs text-muted-foreground">
          Supported: PDF, Word, Excel, CSV, images (JPEG, PNG, GIF, WebP), text files. Max {formatFileSize(MAX_FILE_SIZE)}.
        </p>

        {/* Category Selection */}
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.filter(c => c.value !== "all").map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload Progress */}
        {uploadProgress !== "idle" && uploadProgress !== "error" && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {uploadProgress === "done" ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Spinner size="sm" />
            )}
            <span className="text-sm">
              {uploadProgress === "uploading" && "Uploading file..."}
              {uploadProgress === "creating" && "Creating document record..."}
              {uploadProgress === "done" && "Upload complete!"}
            </span>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || uploadProgress === "done"}
        >
          {isUploading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
