import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  File,
  FileSpreadsheet,
  FileImage,
  FolderOpen,
  X,
  CheckCircle2,
  AlertCircle,
  Tag,
} from "@/lib/icons";
import { cn, formatFileSize } from "@/lib/utils";
import { categoryOptions, type DocumentCategory } from "@/lib/constants";
import { toast } from "sonner";
import type { Id, Doc } from "../../../convex/_generated/dataModel";

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

// Generate fiscal years (current year and 5 previous years)
function getFiscalYears() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => String(currentYear - i));
}

export interface UploadDocumentDialogProps {
  organizationId?: Id<"organizations">;
  serviceTypes: Doc<"serviceTypes">[];
  defaultServiceTypeId?: Id<"serviceTypes">;
  defaultFolderId?: Id<"folders"> | null;
  onClose: () => void;
  fulfillRequestId?: Id<"documentRequests"> | null;
  onFulfillComplete?: () => void;
}

export function UploadDocumentDialog({
  organizationId,
  serviceTypes,
  defaultServiceTypeId,
  defaultFolderId,
  onClose,
  fulfillRequestId,
  onFulfillComplete,
}: UploadDocumentDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [serviceTypeId, setServiceTypeId] = useState<Id<"serviceTypes"> | "">("");
  const [folderId, setFolderId] = useState<Id<"folders"> | null>(defaultFolderId ?? null);
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [description, setDescription] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [fiscalPeriod, setFiscalPeriod] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
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

  // Query folders for the selected service
  const availableFolders = useQuery(
    api.folders.list,
    organizationId && serviceTypeId
      ? { organizationId, serviceTypeId: serviceTypeId as Id<"serviceTypes"> }
      : "skip"
  );

  // Set defaults when component mounts or props change
  useEffect(() => {
    if (defaultServiceTypeId) {
      setServiceTypeId(defaultServiceTypeId);
    }
  }, [defaultServiceTypeId]);

  // Set default folder
  useEffect(() => {
    if (defaultFolderId !== undefined) {
      setFolderId(defaultFolderId);
    }
  }, [defaultFolderId]);

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

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

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
        serviceTypeId: serviceTypeId || undefined,
        folderId: folderId || undefined,
        description: description || undefined,
        fiscalYear: fiscalYear || undefined,
        fiscalPeriod: fiscalPeriod || undefined,
        tags: tags.length > 0 ? tags : undefined,
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
        setDescription("");
        setFiscalYear("");
        setFiscalPeriod("");
        setTags([]);
        setFolderId(null);
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

  const fiscalYears = getFiscalYears();
  const fiscalPeriods = [
    { value: "Q1", label: "Q1 (Jan-Mar)" },
    { value: "Q2", label: "Q2 (Apr-Jun)" },
    { value: "Q3", label: "Q3 (Jul-Sep)" },
    { value: "Q4", label: "Q4 (Oct-Dec)" },
    { value: "Annual", label: "Annual" },
  ];

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
        {/* Service Type Selection */}
        {serviceTypes.length > 0 && !fulfillRequestId && (
          <div className="grid gap-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select value={serviceTypeId as string} onValueChange={(v) => {
              setServiceTypeId(v as Id<"serviceTypes">);
              // Reset folder when service changes
              setFolderId(null);
            }}>
              <SelectTrigger id="serviceType">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((service) => (
                  <SelectItem key={service._id} value={service._id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Organize your document by service type
            </p>
          </div>
        )}

        {/* Folder Selection (only shown when a service is selected) */}
        {serviceTypeId && availableFolders && availableFolders.length > 0 && !fulfillRequestId && (
          <div className="grid gap-2">
            <Label htmlFor="folder">Folder (optional)</Label>
            <Select
              value={folderId || "none"}
              onValueChange={(v) => setFolderId(v === "none" ? null : v as Id<"folders">)}
            >
              <SelectTrigger id="folder">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    No folder (root level)
                  </span>
                </SelectItem>
                {availableFolders.map((folder) => (
                  <SelectItem key={folder._id} value={folder._id}>
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      {folder.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optionally organize this document into a folder
            </p>
          </div>
        )}

        {/* Drop Zone */}
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer relative",
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
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
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleInputChange}
            accept={ALLOWED_TYPES.join(",")}
            disabled={isUploading}
          />
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
        {!fulfillRequestId && (
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.filter(c => c.value !== "all").map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Description */}
        <div className="grid gap-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Add a description for this document..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Fiscal Year and Period */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fiscalYear">Fiscal Year</Label>
            <Select value={fiscalYear} onValueChange={setFiscalYear}>
              <SelectTrigger id="fiscalYear">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {fiscalYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fiscalPeriod">Period</Label>
            <Select value={fiscalPeriod} onValueChange={setFiscalPeriod}>
              <SelectTrigger id="fiscalPeriod">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {fiscalPeriods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags */}
        <div className="grid gap-2">
          <Label htmlFor="tags">Tags (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="tags"
              placeholder="Add a tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={handleAddTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#f0f0f0] text-[#6b6b76] text-xs"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
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
