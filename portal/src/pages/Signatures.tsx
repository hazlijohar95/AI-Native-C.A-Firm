import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  PenTool,
  FileSignature,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  Eraser,
  Type,
  FileText,
  Sparkles,
  ScrollText,
  Eye,
  Loader2,
  Download,
  Upload,
  ImageIcon,
  Users,
} from "@/lib/icons";
import { cn, formatDistanceToNow } from "@/lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

// Status types
type SignatureStatus = "pending" | "signed" | "declined" | "expired";
type StatusFilter = SignatureStatus | "all";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Requests" },
  { value: "pending", label: "Pending" },
  { value: "signed", label: "Signed" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
];

const statusConfig: Record<string, {
  icon: React.ReactNode;
  bg: string;
  text: string;
  label: string;
}> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    bg: "bg-amber-50",
    text: "text-amber-700",
    label: "Pending",
  },
  signed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    label: "Signed",
  },
  declined: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    bg: "bg-red-50",
    text: "text-red-700",
    label: "Declined",
  },
  expired: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: "Expired",
  },
};

// Simple signature canvas component
function SignatureCanvas({
  onSave,
  onClear,
}: {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Set drawing style
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onClear();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border-2 border-dashed bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-40 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clearCanvas}
          className="h-9 px-3 rounded-lg border border-[#EBEBEB] text-sm font-medium text-[#3A3A3A] bg-white hover:bg-[#f8f8f8] transition-colors flex items-center gap-1.5"
        >
          <Eraser className="h-3 w-3" />
          Clear
        </button>
        <button
          type="button"
          onClick={saveSignature}
          disabled={!hasDrawn}
          className="h-9 px-3 rounded-lg bg-[#0f0f12] hover:bg-[#1a1a1f] disabled:bg-[#e5e5e7] disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <CheckCircle2 className="h-3 w-3" />
          Use Signature
        </button>
      </div>
    </div>
  );
}

// Document Preview Step Component
type DialogStep = "preview" | "sign";

function DocumentPreview({
  url,
  filename,
  mimeType,
  onReviewComplete,
  isLoading,
}: {
  url: string | null;
  filename: string;
  mimeType: string;
  onReviewComplete: () => void;
  isLoading: boolean;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    if (!previewRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = previewRef.current;
    const progress = Math.min(100, (scrollTop / (scrollHeight - clientHeight)) * 100);
    setScrollProgress(progress);

    // Consider "scrolled to bottom" when 90% or more scrolled
    if (progress >= 90) {
      setHasScrolledToBottom(true);
    }
  }, []);

  const isPdf = mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  const isImage = mimeType.startsWith("image/");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#6b6b76]" />
        <p className="text-sm text-[#6b6b76]">Loading document preview...</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-center">
        <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <p className="text-sm text-[#6b6b76]">Unable to load document preview.</p>
        <p className="text-xs text-[#9d9da6]">You can still proceed to sign if you have reviewed the document separately.</p>
        <button
          onClick={onReviewComplete}
          className="mt-2 h-9 px-4 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
        >
          Continue Without Preview
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-[#6b6b76]" />
          <span className="text-sm font-medium text-[#0f0f12]">Document Preview</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[#253FF6] hover:underline"
        >
          <Download className="h-3 w-3" />
          Open in new tab
        </a>
      </div>

      {/* Preview Container */}
      <div
        ref={previewRef}
        onScroll={handleScroll}
        className="relative h-80 overflow-auto rounded-lg border border-[#EBEBEB] bg-[#fafafa]"
      >
        {isPdf ? (
          <iframe
            src={`${url}#toolbar=0&navpanes=0`}
            className="w-full h-full min-h-[600px]"
            title={`Preview of ${filename}`}
          />
        ) : isImage ? (
          <img
            src={url}
            alt={`Preview of ${filename}`}
            className="w-full h-auto object-contain"
            onLoad={() => setHasScrolledToBottom(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <FileText className="h-12 w-12 text-[#9d9da6]" />
            <p className="text-sm text-[#6b6b76]">{filename}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-4 rounded-lg bg-[#0f0f12] text-white text-sm font-medium hover:bg-[#1a1a1f] transition-colors flex items-center gap-2"
            >
              <Download className="h-3.5 w-3.5" />
              Download to View
            </a>
          </div>
        )}
      </div>

      {/* Scroll Progress (for PDFs) */}
      {isPdf && !hasScrolledToBottom && (
        <div className="space-y-2">
          <div className="h-1.5 bg-[#e5e5e7] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#253FF6] transition-all duration-150"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
          <p className="text-xs text-[#9d9da6] text-center">
            Please scroll through the document to review it before signing
          </p>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end gap-3">
        {hasScrolledToBottom || !isPdf ? (
          <button
            onClick={onReviewComplete}
            className="h-10 px-5 rounded-lg bg-[#0f0f12] hover:bg-[#1a1a1f] text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            I've Reviewed the Document
          </button>
        ) : (
          <button
            disabled
            className="h-10 px-5 rounded-lg bg-[#e5e5e7] text-[#9d9da6] text-sm font-medium cursor-not-allowed flex items-center gap-2"
          >
            <ScrollText className="h-4 w-4" />
            Scroll to Review Document
          </button>
        )}
      </div>
    </div>
  );
}

export function Signatures() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Id<"signatureRequests"> | null>(null);
  const [signatureType, setSignatureType] = useState<"draw" | "type" | "upload">("draw");
  const [typedSignature, setTypedSignature] = useState("");
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [legalName, setLegalName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Document preview state
  const [dialogStep, setDialogStep] = useState<DialogStep>("preview");
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);
  const [documentFilename, setDocumentFilename] = useState("");
  const [documentMimeType, setDocumentMimeType] = useState("application/pdf");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [hasReviewedDocument, setHasReviewedDocument] = useState(false);

  const requests = useQuery(api.signatures.list, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const pendingCount = useQuery(api.signatures.countPending, {});

  const selectedRequestData = useQuery(
    api.signatures.get,
    selectedRequest ? { id: selectedRequest } : "skip"
  );

  // Multi-party signature queries
  const selectedRequestSigners = useQuery(
    api.signatures.getSigners,
    selectedRequest ? { requestId: selectedRequest } : "skip"
  );

  const canUserSignResult = useQuery(
    api.signatures.canUserSign,
    selectedRequest ? { requestId: selectedRequest } : "skip"
  );

  const signAction = useAction(api.signatures.sign);
  const declineMutation = useMutation(api.signatures.decline);
  const getDocumentPreview = useAction(api.signatures.getDocumentPreview);
  const recordPreview = useMutation(api.signatures.recordDocumentPreview);

  const handleSignClick = async (requestId: Id<"signatureRequests">) => {
    setSelectedRequest(requestId);
    setSignDialogOpen(true);
    // Reset all form state
    setSignatureType("draw");
    setTypedSignature("");
    setDrawnSignature(null);
    setUploadedSignature(null);
    setUploadedFileName("");
    setLegalName("");
    setAgreedToTerms(false);
    // Reset preview state
    setDialogStep("preview");
    setDocumentPreviewUrl(null);
    setDocumentFilename("");
    setDocumentMimeType("application/pdf");
    setHasReviewedDocument(false);

    // Load document preview
    setIsLoadingPreview(true);
    try {
      const preview = await getDocumentPreview({ requestId });
      setDocumentPreviewUrl(preview.url);
      setDocumentFilename(preview.filename);
      setDocumentMimeType(preview.mimeType);
    } catch (error) {
      console.error("Failed to load document preview:", error);
      // Allow continuing without preview
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleReviewComplete = async () => {
    setHasReviewedDocument(true);
    setDialogStep("sign");

    // Record that user previewed the document (for audit trail)
    if (selectedRequest) {
      try {
        await recordPreview({ requestId: selectedRequest });
      } catch (error) {
        console.error("Failed to record document preview:", error);
      }
    }
  };

  const handleDeclineClick = (requestId: Id<"signatureRequests">) => {
    setSelectedRequest(requestId);
    setDeclineDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast.error("Image too large (max 500KB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedSignature(dataUrl);
      setUploadedFileName(file.name);
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  const handleSign = async () => {
    if (!selectedRequest) return;

    let signatureData: string | null = null;
    if (signatureType === "draw") {
      signatureData = drawnSignature;
    } else if (signatureType === "type") {
      signatureData = typedSignature;
    } else if (signatureType === "upload") {
      signatureData = uploadedSignature;
    }

    if (!signatureData) {
      toast.error("Please provide a signature");
      return;
    }
    if (!legalName.trim()) {
      toast.error("Please enter your legal name");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the terms");
      return;
    }

    setIsSigning(true);
    try {
      // Fetch client IP address for audit trail
      let ipAddress: string | undefined;
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip;
        }
      } catch {
        // IP fetch is best-effort; continue without it
        console.warn("Could not fetch IP address for signature audit trail");
      }

      await signAction({
        requestId: selectedRequest,
        signatureType,
        signatureData,
        legalName: legalName.trim(),
        agreedToTerms,
        userAgent: navigator.userAgent,
        ipAddress,
      });
      toast.success("Document signed successfully");
      setSignDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Failed to sign document", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsSigning(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;

    try {
      await declineMutation({ requestId: selectedRequest });
      toast.success("Signature request declined");
      setDeclineDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      toast.error("Failed to decline", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between motion-safe-slide-up">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f8f8f8] border border-black/5 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#6b6b76]" />
            <span className="text-xs font-medium text-[#6b6b76]">E-Signatures</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#0f0f12] tracking-tight">
            Signature <span className="italic text-[#6b6b76]">Requests</span>
          </h1>
          <p className="mt-2 text-[#6b6b76]">
            Sign documents electronically
          </p>
        </div>
        {pendingCount !== undefined && pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium self-start sm:self-auto">
            <PenTool className="h-3.5 w-3.5" />
            {pendingCount} pending signature{pendingCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 motion-safe-slide-up motion-safe-slide-up-delay-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#9d9da6]" aria-hidden="true" />
          <label htmlFor="signature-status-filter" className="sr-only">Filter by status</label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger id="signature-status-filter" className="w-[150px] h-10 bg-white border-[#EBEBEB] rounded-lg text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Request List */}
      {requests === undefined ? (
        <div className="flex h-64 items-center justify-center" aria-busy="true" aria-live="polite">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
            <p className="text-sm text-[#9d9da6]">Loading signature requests...</p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa] motion-safe-slide-up motion-safe-slide-up-delay-3">
          <div className="w-14 h-14 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-4">
            <FileSignature className="h-6 w-6 text-[#6b6b76]" />
          </div>
          <p className="text-base font-medium text-[#0f0f12]">No signature requests</p>
          <p className="text-sm text-[#9d9da6] mt-1">
            {statusFilter !== "all"
              ? "No requests match your filter"
              : "You have no documents to sign"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request, index) => {
            const displayStatus = request.displayStatus || request.status;
            const config = statusConfig[displayStatus] || statusConfig.pending;

            return (
              <div
                key={request._id}
                className={cn(
                  "group bg-white rounded-2xl border border-black/5 p-5 transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06)] motion-safe-slide-up motion-safe-slide-up-delay-3",
                  displayStatus === "pending" && "border-l-4 border-l-amber-400"
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Request Info */}
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0",
                      displayStatus === "signed" ? "bg-emerald-50" :
                      displayStatus === "pending" ? "bg-amber-50" : "bg-[#f8f8f8]"
                    )}>
                      <FileSignature className={cn(
                        "h-5 w-5",
                        displayStatus === "signed" ? "text-emerald-600" :
                        displayStatus === "pending" ? "text-amber-600" : "text-[#6b6b76]"
                      )} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[#0f0f12]">{request.title}</h3>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", config.bg, config.text)}>
                          {config.icon}
                          {config.label}
                        </span>
                      </div>
                      {request.description && (
                        <p className="mt-1 text-sm text-[#6b6b76] line-clamp-1">
                          {request.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#9d9da6] font-['DM_Mono']">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3" aria-hidden="true" />
                          {request.documentName}
                        </div>
                        <span>Requested {formatDistanceToNow(request.requestedAt)}</span>
                        {/* Multi-party signer progress */}
                        {request.signerCount && request.signerCount > 1 && (
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium",
                            request.completedCount === request.signerCount
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700"
                          )}>
                            <Users className="h-3 w-3" />
                            {request.completedCount || 0}/{request.signerCount} signed
                            {request.requireSequential && (
                              <span className="text-[#9d9da6]">(sequential)</span>
                            )}
                          </span>
                        )}
                        {request.expiresAt && request.status === "pending" && (
                          <span className="text-amber-600">
                            Expires {formatDistanceToNow(request.expiresAt)}
                          </span>
                        )}
                        {request.signedAt && (
                          <span className="text-emerald-600">
                            Signed {formatDistanceToNow(request.signedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {displayStatus === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeclineClick(request._id)}
                        className="h-9 px-4 rounded-lg border border-[#EBEBEB] text-sm font-medium text-[#3A3A3A] bg-white hover:bg-[#f8f8f8] transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleSignClick(request._id)}
                        className="h-9 px-4 rounded-lg bg-[#0f0f12] hover:bg-[#1a1a1f] text-white text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <PenTool className="h-3.5 w-3.5" aria-hidden="true" />
                        Sign
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sign Dialog - Two Step: Preview then Sign */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className={cn(
          "bg-white rounded-2xl border border-[#EBEBEB] shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
          dialogStep === "preview" ? "max-w-2xl" : "max-w-lg"
        )}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              {/* Step Indicator */}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  dialogStep === "preview"
                    ? "bg-[#0f0f12] text-white"
                    : "bg-emerald-100 text-emerald-700"
                )}>
                  {dialogStep === "sign" ? <CheckCircle2 className="h-3.5 w-3.5" /> : "1"}
                </span>
                <span className={cn(
                  "text-xs",
                  dialogStep === "preview" ? "text-[#0f0f12] font-medium" : "text-[#9d9da6]"
                )}>
                  Review
                </span>
              </div>
              <div className="w-8 h-px bg-[#e5e5e7]" />
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  dialogStep === "sign"
                    ? "bg-[#0f0f12] text-white"
                    : "bg-[#e5e5e7] text-[#9d9da6]"
                )}>
                  2
                </span>
                <span className={cn(
                  "text-xs",
                  dialogStep === "sign" ? "text-[#0f0f12] font-medium" : "text-[#9d9da6]"
                )}>
                  Sign
                </span>
              </div>
            </div>
            <DialogTitle className="font-serif text-2xl text-[#0f0f12]">
              {dialogStep === "preview" ? "Review Document" : "Sign Document"}
            </DialogTitle>
            <DialogDescription className="text-[#6b6b76]">
              {selectedRequestData?.title}
              {selectedRequestData?.description && (
                <span className="block text-sm mt-1">{selectedRequestData.description}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {dialogStep === "preview" ? (
            /* Step 1: Document Preview */
            <DocumentPreview
              url={documentPreviewUrl}
              filename={documentFilename}
              mimeType={documentMimeType}
              onReviewComplete={handleReviewComplete}
              isLoading={isLoadingPreview}
            />
          ) : (
            /* Step 2: Signature Form */
            <>
              {/* Reviewed Badge */}
              {hasReviewedDocument && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">Document reviewed</span>
                  <button
                    onClick={() => setDialogStep("preview")}
                    className="ml-auto text-xs text-emerald-600 hover:underline"
                  >
                    View again
                  </button>
                </div>
              )}

              {/* Multi-party signer list */}
              {selectedRequestSigners && selectedRequestSigners.length > 1 && (
                <div className="rounded-lg border border-[#EBEBEB] overflow-hidden">
                  <div className="px-3 py-2 bg-[#f8f8f8] border-b border-[#EBEBEB]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#6b6b76] uppercase tracking-wide">
                        Signers ({selectedRequestData?.completedCount || 0}/{selectedRequestData?.signerCount || 0})
                      </span>
                      {selectedRequestData?.requireSequential && (
                        <span className="text-[10px] text-[#9d9da6] bg-white px-2 py-0.5 rounded">Sequential</span>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-[#EBEBEB]">
                    {selectedRequestSigners.map((signer, idx) => (
                      <div key={signer._id} className="px-3 py-2 flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#f8f8f8] flex items-center justify-center text-[10px] font-medium text-[#6b6b76]">
                          {selectedRequestData?.requireSequential ? signer.sequence : idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0f0f12] truncate">{signer.name}</p>
                          <p className="text-xs text-[#9d9da6] truncate">{signer.email}</p>
                        </div>
                        {signer.status === "signed" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Signed
                          </span>
                        ) : signer.status === "declined" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-medium">
                            <XCircle className="h-3 w-3" />
                            Declined
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cannot sign warning for sequential requests */}
              {canUserSignResult && !canUserSignResult.canSign && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-700">{canUserSignResult.reason}</span>
                </div>
              )}

              <div className="space-y-6">
                {/* Signature Type Selector */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSignatureType("draw")}
                    className={cn(
                      "h-9 px-4 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                      signatureType === "draw"
                        ? "bg-[#0f0f12] text-white"
                        : "bg-white border border-[#EBEBEB] text-[#3A3A3A] hover:bg-[#f8f8f8]"
                    )}
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    Draw
                  </button>
                  <button
                    onClick={() => setSignatureType("type")}
                    className={cn(
                      "h-9 px-4 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                      signatureType === "type"
                        ? "bg-[#0f0f12] text-white"
                        : "bg-white border border-[#EBEBEB] text-[#3A3A3A] hover:bg-[#f8f8f8]"
                    )}
                  >
                    <Type className="h-3.5 w-3.5" />
                    Type
                  </button>
                  <button
                    onClick={() => setSignatureType("upload")}
                    className={cn(
                      "h-9 px-4 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                      signatureType === "upload"
                        ? "bg-[#0f0f12] text-white"
                        : "bg-white border border-[#EBEBEB] text-[#3A3A3A] hover:bg-[#f8f8f8]"
                    )}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </button>
                </div>

                {/* Signature Input */}
                {signatureType === "draw" && (
                  <div>
                    <label className="block text-sm font-medium text-[#0f0f12] mb-2">Draw your signature</label>
                    <SignatureCanvas
                      onSave={(dataUrl) => setDrawnSignature(dataUrl)}
                      onClear={() => setDrawnSignature(null)}
                    />
                    {drawnSignature && (
                      <p className="mt-2 text-xs text-emerald-600 font-medium">Signature captured</p>
                    )}
                  </div>
                )}
                {signatureType === "type" && (
                  <div>
                    <label htmlFor="typedSignature" className="block text-sm font-medium text-[#0f0f12] mb-2">
                      Type your signature
                    </label>
                    <Input
                      id="typedSignature"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder="Your full name"
                      className="h-12 text-xl border-[#EBEBEB] rounded-lg"
                      style={{ fontFamily: "'Brush Script MT', cursive" }}
                    />
                  </div>
                )}
                {signatureType === "upload" && (
                  <div>
                    <label className="block text-sm font-medium text-[#0f0f12] mb-2">Upload your signature</label>
                    {uploadedSignature ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border-2 border-dashed bg-white p-4">
                          <img
                            src={uploadedSignature}
                            alt="Uploaded signature"
                            className="max-h-32 mx-auto object-contain"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-medium">{uploadedFileName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedSignature(null);
                              setUploadedFileName("");
                            }}
                            className="h-8 px-3 rounded-lg border border-[#EBEBEB] text-xs font-medium text-[#3A3A3A] bg-white hover:bg-[#f8f8f8] transition-colors flex items-center gap-1.5"
                          >
                            <Eraser className="h-3 w-3" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-[#EBEBEB] bg-[#fafafa] cursor-pointer hover:bg-[#f5f5f5] transition-colors">
                        <ImageIcon className="h-8 w-8 text-[#9d9da6] mb-2" />
                        <span className="text-sm text-[#6b6b76]">Click to upload signature image</span>
                        <span className="text-xs text-[#9d9da6] mt-1">PNG, JPG up to 500KB</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Legal Name */}
                <div>
                  <label htmlFor="legalName" className="block text-sm font-medium text-[#0f0f12] mb-2">
                    Legal Name
                  </label>
                  <Input
                    id="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Enter your full legal name"
                    className="h-11 border-[#EBEBEB] rounded-lg"
                  />
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[#EBEBEB] text-[#253FF6] focus:ring-[#253FF6]"
                  />
                  <label htmlFor="terms" className="text-sm text-[#6b6b76] leading-relaxed">
                    I agree that my electronic signature is the legal equivalent of my manual signature.
                    I consent to be legally bound by this document.
                  </label>
                </div>
              </div>

              <DialogFooter className="gap-3">
                <button
                  onClick={() => setDialogStep("preview")}
                  className="h-10 px-5 rounded-lg border border-[#EBEBEB] text-sm font-medium text-[#3A3A3A] bg-white hover:bg-[#f8f8f8] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSign}
                  disabled={isSigning || (canUserSignResult && !canUserSignResult.canSign)}
                  className="h-10 px-5 rounded-lg bg-[#0f0f12] hover:bg-[#1a1a1f] disabled:bg-[#e5e5e7] disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isSigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Signing...
                    </>
                  ) : (
                    "Sign Document"
                  )}
                </button>
              </DialogFooter>
            </>
          )}

          {/* Cancel button for preview step */}
          {dialogStep === "preview" && (
            <DialogFooter className="gap-3 border-t border-[#EBEBEB] pt-4 mt-4">
              <button
                onClick={() => setSignDialogOpen(false)}
                className="h-10 px-5 rounded-lg border border-[#EBEBEB] text-sm font-medium text-[#3A3A3A] bg-white hover:bg-[#f8f8f8] transition-colors"
              >
                Cancel
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Decline Confirmation */}
      <AlertDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <AlertDialogContent className="bg-white rounded-2xl border border-[#EBEBEB] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-[#0f0f12]">Decline Signature Request</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6b6b76]">
              Are you sure you want to decline this signature request? The sender will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-10 px-5 rounded-lg border-[#EBEBEB] text-[#3A3A3A] hover:bg-[#f8f8f8]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              className="h-10 px-5 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
