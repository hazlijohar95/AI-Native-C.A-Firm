import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { LoadingState, EmptyState, SearchInput } from "@/components/common";
import { useDialog, useMutationWithToast } from "@/hooks";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PenTool,
  Plus,
  Building2,
  MoreHorizontal,
  Eye,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Download,
  FileText,
  User,
} from "@/lib/icons";
import { toast } from "sonner";
import { formatDate, formatDistanceToNow, cn } from "@/lib/utils";
import { exportToCSV, formatDateForExport } from "@/lib/bulk-actions";
import { Badge } from "@/components/ui/badge";
import type { Id } from "../../../convex/_generated/dataModel";

// Types
type SignatureStatus = "pending" | "signed" | "declined" | "expired";

type SignatureRequestType = {
  _id: Id<"signatureRequests">;
  organizationId: Id<"organizations">;
  documentId: Id<"documents">;
  title: string;
  description?: string;
  status: SignatureStatus;
  displayStatus: SignatureStatus;
  documentName: string;
  requestedBy: Id<"users">;
  requestedAt: number;
  expiresAt?: number;
  signedAt?: number;
  signedBy?: Id<"users">;
};

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "signed", label: "Signed" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
];

const statusConfig: Record<SignatureStatus, {
  icon: React.ReactNode;
  variant: "warning" | "success" | "destructive" | "secondary";
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
    icon: <AlertCircle className="h-4 w-4" />,
    variant: "secondary",
    label: "Expired",
  },
};

export function AdminSignatures() {
  const signatureRequests = useQuery(api.signatures.list, {});
  const organizations = useQuery(api.organizations.list);
  const documents = useQuery(api.documents.list, {});

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");

  // Dialog state using useDialog hook for consistency
  const createDialog = useDialog();
  const viewDialog = useDialog<SignatureRequestType>();
  const cancelDialog = useDialog<SignatureRequestType>();

  // Create org lookup map
  const orgMap = useMemo(() =>
    new Map(organizations?.map((org) => [org._id.toString(), org.name]) || []),
    [organizations]
  );

  // Filter signature requests
  const filteredRequests = useMemo(() =>
    signatureRequests?.filter((req) => {
      const matchesSearch =
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.documentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || req.displayStatus === statusFilter;
      const matchesOrg = orgFilter === "all" || req.organizationId.toString() === orgFilter;
      return matchesSearch && matchesStatus && matchesOrg;
    }),
    [signatureRequests, searchQuery, statusFilter, orgFilter]
  );

  // Mutation with toast using hook for consistency
  const cancelRequestMutation = useMutation(api.signatures.cancel);
  const { execute: cancelRequest, isLoading: isCancelling } = useMutationWithToast(
    (args: { id: Id<"signatureRequests"> }) => cancelRequestMutation(args),
    {
      successMessage: "Signature request cancelled",
      onSuccess: () => cancelDialog.close(),
    }
  );

  const handleCancel = async () => {
    if (!cancelDialog.data) return;
    await cancelRequest({ id: cancelDialog.data._id });
  };

  const handleExport = () => {
    if (!filteredRequests) return;

    exportToCSV(filteredRequests, "signatures-export", [
      { key: "title", header: "Title" },
      { key: "documentName", header: "Document" },
      { key: "displayStatus", header: "Status" },
      {
        key: "organizationId",
        header: "Organization",
        formatter: (val) => val ? (orgMap.get(val as string) || "Unknown") : ""
      },
      { key: "requestedAt", header: "Requested", formatter: formatDateForExport as (val: unknown) => string },
      { key: "signedAt", header: "Signed", formatter: formatDateForExport as (val: unknown) => string },
      { key: "expiresAt", header: "Expires", formatter: formatDateForExport as (val: unknown) => string },
    ]);

    toast.success(`Exported ${filteredRequests.length} signature requests`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Signatures
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage document signature requests
          </p>
        </div>
        <Dialog open={createDialog.isOpen} onOpenChange={createDialog.setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Request Signature
            </Button>
          </DialogTrigger>
          <CreateSignatureRequestDialog
            organizations={organizations || []}
            documents={documents || []}
            onClose={createDialog.close}
          />
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-1 sm:flex-wrap">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search requests..."
            className="flex-1"
            maxWidth="full"
          />
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations?.map((org) => (
                <SelectItem key={org._id} value={org._id.toString()}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Signature Requests List */}
      {signatureRequests === undefined ? (
        <LoadingState message="Loading signature requests..." />
      ) : filteredRequests?.length === 0 ? (
        <EmptyState
          icon={PenTool}
          title="No signature requests"
          description={
            searchQuery || statusFilter !== "all" || orgFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first signature request to get started"
          }
          action={
            <Button onClick={() => createDialog.open()} className="gap-2">
              <Plus className="h-4 w-4" />
              Request Signature
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Signature requests list">
              <caption className="sr-only">
                List of signature requests with status and organization
              </caption>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Request</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Document</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Organization</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Requested</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests?.map((req) => {
                  const config = statusConfig[req.displayStatus];
                  const isExpiringSoon = req.displayStatus === "pending" && req.expiresAt &&
                    req.expiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days

                  return (
                    <tr
                      key={req._id}
                      className={cn(
                        "border-b last:border-0 hover:bg-muted/30",
                        req.displayStatus !== "pending" && req.displayStatus !== "signed" && "opacity-60"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{req.title}</p>
                          {req.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {req.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <span className="max-w-[150px] truncate">{req.documentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={config.variant} className="gap-1">
                            {config.icon}
                            {config.label}
                          </Badge>
                          {isExpiringSoon && (
                            <Badge variant="warning" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Expiring soon
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          {orgMap.get(req.organizationId.toString()) || "Unknown"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p>{formatDistanceToNow(req.requestedAt)}</p>
                          {req.signedAt && (
                            <p className="text-xs text-green-600">
                              Signed {formatDistanceToNow(req.signedAt)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label={`Actions for ${req.title}`}>
                              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewDialog.open(req)}>
                              <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                              View Details
                            </DropdownMenuItem>
                            {req.displayStatus === "pending" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => cancelDialog.open(req)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <X className="h-4 w-4 mr-2" aria-hidden="true" />
                                  Cancel Request
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {signatureRequests && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground" aria-live="polite">
          <span>Total: {signatureRequests.length}</span>
          <span className="text-amber-600">Pending: {signatureRequests.filter(r => r.displayStatus === "pending").length}</span>
          <span className="text-green-600">Signed: {signatureRequests.filter(r => r.displayStatus === "signed").length}</span>
          <span className="text-red-600">Declined: {signatureRequests.filter(r => r.displayStatus === "declined").length}</span>
          <span>Expired: {signatureRequests.filter(r => r.displayStatus === "expired").length}</span>
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={viewDialog.isOpen} onOpenChange={viewDialog.setIsOpen}>
        {viewDialog.data && (
          <SignatureDetailsDialog
            request={viewDialog.data}
            orgName={orgMap.get(viewDialog.data.organizationId.toString()) || "Unknown"}
            onClose={viewDialog.close}
          />
        )}
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialog.isOpen} onOpenChange={cancelDialog.setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Signature Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the signature request for "{cancelDialog.data?.title}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? <Spinner size="sm" className="mr-2" /> : <X className="h-4 w-4 mr-2" />}
              Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Create Signature Request Dialog
interface CreateSignatureRequestDialogProps {
  organizations: Array<{ _id: Id<"organizations">; name: string }>;
  documents: Array<{ _id: Id<"documents">; name: string; organizationId: Id<"organizations"> }>;
  onClose: () => void;
}

function CreateSignatureRequestDialog({ organizations, documents, onClose }: CreateSignatureRequestDialogProps) {
  const createRequest = useMutation(api.signatures.create);

  const [organizationId, setOrganizationId] = useState<string>("");
  const [documentId, setDocumentId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("30"); // days
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter documents by selected organization
  const filteredDocuments = useMemo(() =>
    documents.filter(doc => doc.organizationId.toString() === organizationId),
    [documents, organizationId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationId || !documentId || !title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = expiresIn !== "never"
        ? Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000
        : undefined;

      await createRequest({
        organizationId: organizationId as Id<"organizations">,
        documentId: documentId as Id<"documents">,
        title: title.trim(),
        description: description.trim() || undefined,
        expiresAt,
      });
      toast.success("Signature request created");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Request Signature</DialogTitle>
          <DialogDescription>
            Create a new signature request for a document
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="sigOrganization">Organization *</Label>
            <Select value={organizationId} onValueChange={(v) => {
              setOrganizationId(v);
              setDocumentId(""); // Reset document when org changes
            }}>
              <SelectTrigger id="sigOrganization">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org._id} value={org._id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {organizationId && (
            <div className="grid gap-2">
              <Label htmlFor="sigDocument">Document *</Label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger id="sigDocument">
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDocuments.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No documents for this organization
                    </div>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <SelectItem key={doc._id} value={doc._id.toString()}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          {doc.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {filteredDocuments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Upload a document first to request a signature
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="sigTitle">Title *</Label>
            <Input
              id="sigTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Annual Report Acknowledgment"
              maxLength={200}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sigDescription">Description</Label>
            <Textarea
              id="sigDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional instructions for the signer..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sigExpires">Expires In</Label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger id="sigExpires">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || (!!organizationId && filteredDocuments.length === 0)}>
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            Request Signature
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// Signature Details Dialog
interface SignatureDetailsDialogProps {
  request: SignatureRequestType;
  orgName: string;
  onClose: () => void;
}

function SignatureDetailsDialog({ request, orgName, onClose }: SignatureDetailsDialogProps) {
  const signatureDetails = useQuery(api.signatures.get, { id: request._id });
  const config = statusConfig[request.displayStatus];

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{request.title}</DialogTitle>
        <DialogDescription>{orgName}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <Badge variant={config.variant} className="gap-1">
            {config.icon}
            {config.label}
          </Badge>
        </div>

        {/* Document */}
        <div>
          <p className="text-sm font-medium mb-1">Document</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            {request.documentName}
          </div>
        </div>

        {/* Description */}
        {request.description && (
          <div>
            <p className="text-sm font-medium mb-1">Description</p>
            <p className="text-sm text-muted-foreground">{request.description}</p>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-1">Requested</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(request.requestedAt)}
            </div>
          </div>
          {request.expiresAt && (
            <div>
              <p className="text-sm font-medium mb-1">Expires</p>
              <div className={cn(
                "flex items-center gap-1 text-sm",
                request.expiresAt < Date.now() ? "text-destructive" : "text-muted-foreground"
              )}>
                <Clock className="h-3 w-3" />
                {formatDate(request.expiresAt)}
              </div>
            </div>
          )}
        </div>

        {/* Signature Details */}
        {signatureDetails?.signature && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Signature</p>
            <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{signatureDetails.signature.legalName}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Signed on {formatDate(signatureDetails.signature.timestamp)}
              </p>
              <p className="text-xs text-muted-foreground">
                Type: {signatureDetails.signature.signatureType}
              </p>
              {signatureDetails.signature.signatureType === "draw" && (
                <div className="mt-2 p-2 bg-white rounded border">
                  {/* Validate signature data is a proper base64 image data URL */}
                  {signatureDetails.signature.signatureData?.startsWith("data:image/") ? (
                    <img
                      src={signatureDetails.signature.signatureData}
                      alt="Signature"
                      className="max-h-20 mx-auto"
                      onError={(e) => {
                        // Hide broken images
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">Invalid signature data</p>
                  )}
                </div>
              )}
              {signatureDetails.signature.signatureType === "type" && (
                <div className="mt-2 p-3 bg-white rounded border text-center">
                  {/* Text content is already escaped by React, but we trim and limit length for safety */}
                  <span className="text-2xl font-['Caveat'] italic">
                    {signatureDetails.signature.signatureData?.slice(0, 200) || ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {signatureDetails?.signerName && (
          <div>
            <p className="text-sm font-medium mb-1">Signed By</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {signatureDetails.signerName}
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
