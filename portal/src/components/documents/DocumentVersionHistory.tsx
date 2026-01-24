/* eslint-disable react-refresh/only-export-components */
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn, formatDistanceToNow } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  History,
  Download,
  Upload,
  User,
  Clock,
  FileText,
  AlertCircle,
  X,
  CheckCircle2,
} from "@/lib/icons";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

interface DocumentVersionHistoryProps {
  documentId: Id<"documents">;
  documentName: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DocumentVersionHistory({
  documentId,
  documentName,
  isOpen,
  onClose,
}: DocumentVersionHistoryProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Fetch version history
  const versions = useQuery(
    api.documents.getVersionHistory,
    isOpen ? { documentId } : "skip"
  );

  const isLoading = versions === undefined;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-serif flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </SheetTitle>
            <SheetDescription className="truncate">{documentName}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Upload New Version Button */}
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload New Version
            </Button>

            {/* Version List */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#0f0f12]">
                {isLoading ? "Loading..." : `${versions?.length || 0} version${(versions?.length || 0) !== 1 ? "s" : ""}`}
              </h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="sm" />
                </div>
              ) : versions && versions.length > 0 ? (
                <div className="space-y-2">
                  {versions.map((version, index) => (
                    <VersionItem
                      key={version._id}
                      version={version}
                      isCurrent={index === 0}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-3">
                    <History className="h-5 w-5 text-[#6b6b76]" />
                  </div>
                  <p className="text-sm text-[#6b6b76]">No version history available</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Upload New Version Dialog */}
      <UploadVersionDialog
        documentId={documentId}
        documentName={documentName}
        currentVersion={versions?.[0]?.version ?? 1}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={() => {
          setUploadDialogOpen(false);
          toast.success("New version uploaded successfully");
        }}
      />
    </>
  );
}

// Version Item Component
interface VersionItemProps {
  version: {
    _id: Id<"documentVersions">;
    version: number;
    size: number;
    uploadedAt: number;
    uploaderName: string;
    changeNote?: string;
    storageKey: string;
    convexStorageId?: string;
  };
  isCurrent: boolean;
}

function VersionItem({ version, isCurrent }: VersionItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Get download URL for this version
  const downloadUrl = useQuery(
    api.documents.getVersionDownloadUrl,
    { versionId: version._id }
  );

  const handleDownload = async () => {
    if (!version.convexStorageId) {
      toast.error("This version is not available for download");
      return;
    }

    if (!downloadUrl) {
      toast.error("Download URL not available");
      return;
    }

    setIsDownloading(true);
    try {
      // Open the download URL in a new tab
      window.open(downloadUrl, "_blank");
      toast.success(`Downloading version ${version.version}`);
    } catch (error) {
      toast.error("Failed to download version");
      console.error("Download error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-colors",
        isCurrent
          ? "bg-[#0f0f12] text-white border-[#0f0f12]"
          : "bg-white border-[#EBEBEB] hover:border-[#d5d5d5]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium",
                isCurrent ? "text-white" : "text-[#0f0f12]"
              )}
            >
              Version {version.version}
            </span>
            {isCurrent && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/20 text-white">
                Current
              </span>
            )}
          </div>

          <div
            className={cn(
              "flex items-center gap-3 mt-1 text-xs",
              isCurrent ? "text-white/70" : "text-[#6b6b76]"
            )}
          >
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {version.uploaderName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(version.uploadedAt)}
            </span>
            <span>{formatFileSize(version.size)}</span>
          </div>

          {version.changeNote && (
            <p
              className={cn(
                "mt-2 text-xs line-clamp-2",
                isCurrent ? "text-white/80" : "text-[#3A3A3A]"
              )}
            >
              "{version.changeNote}"
            </p>
          )}
        </div>

        <Button
          variant={isCurrent ? "secondary" : "outline"}
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading || !version.convexStorageId}
          className={cn(
            "h-8 gap-1.5 flex-shrink-0",
            isCurrent && "bg-white/20 hover:bg-white/30 text-white border-0"
          )}
        >
          <Download className="h-3.5 w-3.5" />
          {isDownloading ? "..." : "Download"}
        </Button>
      </div>
    </div>
  );
}

// Upload New Version Dialog
interface UploadVersionDialogProps {
  documentId: Id<"documents">;
  documentName: string;
  currentVersion: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Max file size: 25MB (same as document upload)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function UploadVersionDialog({
  documentId,
  documentName,
  currentVersion,
  open,
  onOpenChange,
  onSuccess,
}: UploadVersionDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "creating" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useAction(api.documents.generateUploadUrl);
  const uploadNewVersion = useMutation(api.documents.uploadNewVersion);
  const document = useQuery(api.documents.get, { id: documentId });

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`,
      };
    }
    return { valid: true };
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.error || "Invalid file");
        setSelectedFile(null);
        return;
      }
      setErrorMessage("");
      setSelectedFile(file);
    },
    [validateFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !document?.organizationId) return;

    setIsUploading(true);
    setUploadProgress("uploading");
    setErrorMessage("");

    try {
      // Step 1: Get upload URL
      const { uploadUrl, storageKey } = await generateUploadUrl({
        filename: selectedFile.name,
        contentType: selectedFile.type,
        organizationId: document.organizationId.toString(),
        fileSize: selectedFile.size,
      });

      // Step 2: Upload file
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await uploadResult.json();

      // Step 3: Create new version record
      setUploadProgress("creating");
      await uploadNewVersion({
        documentId,
        storageKey,
        convexStorageId: storageId,
        size: selectedFile.size,
        changeNote: changeNote.trim() || undefined,
      });

      setUploadProgress("done");
      setTimeout(() => {
        setSelectedFile(null);
        setChangeNote("");
        setUploadProgress("idle");
        onSuccess();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Upload New Version</DialogTitle>
          <DialogDescription>
            Upload version {currentVersion + 1} of "{documentName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drop Zone */}
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
              isDragging && "border-primary bg-primary/5",
              selectedFile && "border-green-500 bg-green-50",
              errorMessage && "border-destructive bg-destructive/5",
              !isDragging && !selectedFile && !errorMessage && "border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <div className="flex items-center gap-3 w-full">
                <FileText className="h-8 w-8 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Drop your file here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleInputChange}
              disabled={isUploading}
            />
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </div>
          )}

          {/* Change Note */}
          <div className="space-y-2">
            <Label htmlFor="changeNote">Change note (optional)</Label>
            <Input
              id="changeNote"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="What changed in this version?"
              disabled={isUploading}
            />
          </div>

          {/* Progress */}
          {uploadProgress !== "idle" && uploadProgress !== "error" && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {uploadProgress === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Spinner size="sm" />
              )}
              <span className="text-sm">
                {uploadProgress === "uploading" && "Uploading file..."}
                {uploadProgress === "creating" && "Creating version record..."}
                {uploadProgress === "done" && "Version uploaded!"}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
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
                Upload Version
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage version history state
export function useVersionHistory() {
  const [state, setState] = useState<{
    documentId: Id<"documents"> | null;
    documentName: string;
    isOpen: boolean;
  }>({
    documentId: null,
    documentName: "",
    isOpen: false,
  });

  const openVersionHistory = useCallback((documentId: Id<"documents">, documentName: string) => {
    setState({ documentId, documentName, isOpen: true });
  }, []);

  const closeVersionHistory = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    ...state,
    openVersionHistory,
    closeVersionHistory,
  };
}
