import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { cn, formatDistanceToNow } from "@/lib/utils";
import type { Id, Doc } from "../../convex/_generated/dataModel";

const statusOptions = [
  { value: "all", label: "All Requests" },
  { value: "pending", label: "Pending" },
  { value: "signed", label: "Signed" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
];

const statusConfig: Record<string, {
  icon: React.ReactNode;
  variant: "default" | "warning" | "destructive" | "success" | "secondary";
  label: string;
}> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    variant: "warning",
    label: "Pending",
  },
  signed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    variant: "success",
    label: "Signed",
  },
  declined: {
    icon: <XCircle className="h-4 w-4" />,
    variant: "destructive",
    label: "Declined",
  },
  expired: {
    icon: <AlertTriangle className="h-4 w-4" />,
    variant: "secondary",
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
        <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1">
          <Eraser className="h-3 w-3" />
          Clear
        </Button>
        <Button size="sm" onClick={saveSignature} disabled={!hasDrawn} className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Use Signature
        </Button>
      </div>
    </div>
  );
}

export function Signatures() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Id<"signatureRequests"> | null>(null);
  const [signatureType, setSignatureType] = useState<"draw" | "type">("draw");
  const [typedSignature, setTypedSignature] = useState("");
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [legalName, setLegalName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const requests = useQuery(api.signatures.list, {
    status: statusFilter === "all" ? undefined : statusFilter as any,
  });

  const pendingCount = useQuery(api.signatures.countPending, {});

  const selectedRequestData = useQuery(
    api.signatures.get,
    selectedRequest ? { id: selectedRequest } : "skip"
  );

  const signMutation = useMutation(api.signatures.sign);
  const declineMutation = useMutation(api.signatures.decline);

  const handleSignClick = (requestId: Id<"signatureRequests">) => {
    setSelectedRequest(requestId);
    setSignDialogOpen(true);
    // Reset form
    setSignatureType("draw");
    setTypedSignature("");
    setDrawnSignature(null);
    setLegalName("");
    setAgreedToTerms(false);
  };

  const handleDeclineClick = (requestId: Id<"signatureRequests">) => {
    setSelectedRequest(requestId);
    setDeclineDialogOpen(true);
  };

  const handleSign = async () => {
    if (!selectedRequest) return;

    const signatureData = signatureType === "draw" ? drawnSignature : typedSignature;
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
      await signMutation({
        requestId: selectedRequest,
        signatureType,
        signatureData,
        legalName: legalName.trim(),
        agreedToTerms,
        userAgent: navigator.userAgent,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Signatures</h1>
          <p className="text-sm text-muted-foreground">
            Sign documents electronically
          </p>
        </div>
        {pendingCount !== undefined && pendingCount > 0 && (
          <Badge variant="warning" className="gap-1">
            <PenTool className="h-3 w-3" />
            {pendingCount} pending signature{pendingCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
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
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">Loading signature requests...</p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center">
            <FileSignature className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No signature requests</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter !== "all"
                ? "No requests match your filter"
                : "You have no documents to sign"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request: Doc<"signatureRequests"> & { documentName: string }) => {
            const config = statusConfig[request.status];

            return (
              <Card
                key={request._id}
                className={cn(
                  "transition-shadow hover:shadow-md",
                  request.status === "pending" && "border-l-4 border-l-warning"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Request Info */}
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        request.status === "signed" ? "bg-green-100" :
                        request.status === "pending" ? "bg-amber-100" : "bg-muted"
                      )}>
                        <FileSignature className={cn(
                          "h-5 w-5",
                          request.status === "signed" ? "text-green-600" :
                          request.status === "pending" ? "text-amber-600" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{request.title}</h3>
                          <Badge variant={config.variant} className="gap-1">
                            {config.icon}
                            {config.label}
                          </Badge>
                        </div>
                        {request.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                            {request.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {request.documentName}
                          </div>
                          <span>Requested {formatDistanceToNow(request.requestedAt)}</span>
                          {request.expiresAt && request.status === "pending" && (
                            <span className="text-amber-600">
                              Expires {formatDistanceToNow(request.expiresAt)}
                            </span>
                          )}
                          {request.signedAt && (
                            <span className="text-green-600">
                              Signed {formatDistanceToNow(request.signedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeclineClick(request._id)}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => handleSignClick(request._id)}
                        >
                          <PenTool className="h-3 w-3" />
                          Sign
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              {selectedRequestData?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Signature Type Selector */}
            <div className="flex gap-2">
              <Button
                variant={signatureType === "draw" ? "default" : "outline"}
                size="sm"
                className="gap-1"
                onClick={() => setSignatureType("draw")}
              >
                <PenTool className="h-3 w-3" />
                Draw
              </Button>
              <Button
                variant={signatureType === "type" ? "default" : "outline"}
                size="sm"
                className="gap-1"
                onClick={() => setSignatureType("type")}
              >
                <Type className="h-3 w-3" />
                Type
              </Button>
            </div>

            {/* Signature Input */}
            {signatureType === "draw" ? (
              <div>
                <Label className="mb-2 block">Draw your signature</Label>
                <SignatureCanvas
                  onSave={(dataUrl) => setDrawnSignature(dataUrl)}
                  onClear={() => setDrawnSignature(null)}
                />
                {drawnSignature && (
                  <p className="mt-2 text-xs text-green-600">Signature captured</p>
                )}
              </div>
            ) : (
              <div>
                <Label htmlFor="typedSignature" className="mb-2 block">
                  Type your signature
                </Label>
                <Input
                  id="typedSignature"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Your full name"
                  className="font-signature text-xl"
                  style={{ fontFamily: "'Brush Script MT', cursive" }}
                />
              </div>
            )}

            {/* Legal Name */}
            <div>
              <Label htmlFor="legalName" className="mb-2 block">
                Legal Name
              </Label>
              <Input
                id="legalName"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Enter your full legal name"
              />
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree that my electronic signature is the legal equivalent of my manual signature.
                I consent to be legally bound by this document.
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={isSigning}>
              {isSigning ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Signing...
                </>
              ) : (
                "Sign Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Confirmation */}
      <AlertDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Signature Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this signature request? The sender will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
