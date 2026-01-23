import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  FileText,
  Plus,
  Search,
  Clock,
  Check,
  AlertTriangle,
  X,
  Eye,
  Building2,
  User,
} from "@/lib/icons";
import { toast } from "sonner";
import { formatDistanceToNow, cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

// Document category type
type DocumentCategory = "tax_return" | "financial_statement" | "invoice" | "agreement" | "receipt" | "other";

const categories = [
  { value: "tax_return", label: "Tax Returns" },
  { value: "financial_statement", label: "Financial Statements" },
  { value: "invoice", label: "Invoices" },
  { value: "agreement", label: "Agreements" },
  { value: "receipt", label: "Receipts" },
  { value: "other", label: "Other" },
];

const statusConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    bg: "bg-amber-50",
    text: "text-amber-700",
    label: "Pending"
  },
  uploaded: {
    icon: <Eye className="h-3.5 w-3.5" />,
    bg: "bg-blue-50",
    text: "text-blue-700",
    label: "Needs Review"
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
    label: "Rejected"
  },
};

const categoryColors: Record<string, { bg: string; text: string }> = {
  tax_return: { bg: "bg-blue-50", text: "text-blue-700" },
  financial_statement: { bg: "bg-emerald-50", text: "text-emerald-700" },
  invoice: { bg: "bg-amber-50", text: "text-amber-700" },
  agreement: { bg: "bg-violet-50", text: "text-violet-700" },
  receipt: { bg: "bg-gray-100", text: "text-gray-700" },
  other: { bg: "bg-gray-100", text: "text-gray-700" },
};

export function AdminDocuments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<Id<"documentRequests"> | null>(null);

  const documentRequests = useQuery(api.documents.listRequests, {
    status: statusFilter === "all" ? undefined : statusFilter as "pending" | "uploaded" | "reviewed" | "rejected",
  });
  const organizations = useQuery(api.organizations.list);
  const allUsers = useQuery(api.users.list);
  const users = useMemo(() => allUsers?.filter(u => u.role === "client") ?? [], [allUsers]);

  // Filter by search
  const filteredRequests = useMemo(() => {
    if (!documentRequests) return [];
    if (!searchQuery.trim()) return documentRequests;

    const query = searchQuery.toLowerCase();
    return documentRequests.filter(req =>
      req.title.toLowerCase().includes(query) ||
      req.description?.toLowerCase().includes(query)
    );
  }, [documentRequests, searchQuery]);

  // Group by status for summary
  const statusCounts = useMemo(() => {
    if (!documentRequests) return { pending: 0, uploaded: 0, reviewed: 0, rejected: 0 };
    return {
      pending: documentRequests.filter(r => r.status === "pending").length,
      uploaded: documentRequests.filter(r => r.status === "uploaded").length,
      reviewed: documentRequests.filter(r => r.status === "reviewed").length,
      rejected: documentRequests.filter(r => r.status === "rejected").length,
    };
  }, [documentRequests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Document Requests
          </h1>
          <p className="mt-1 text-muted-foreground">
            Request and review documents from clients
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Request Document
            </Button>
          </DialogTrigger>
          <CreateRequestDialog
            organizations={organizations ?? []}
            users={users ?? []}
            onClose={() => setIsCreateOpen(false)}
          />
        </Dialog>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatusCard
          label="Pending Upload"
          count={statusCounts.pending}
          icon={<Clock className="h-4 w-4" />}
          color="amber"
          onClick={() => setStatusFilter("pending")}
          isActive={statusFilter === "pending"}
        />
        <StatusCard
          label="Needs Review"
          count={statusCounts.uploaded}
          icon={<Eye className="h-4 w-4" />}
          color="blue"
          onClick={() => setStatusFilter("uploaded")}
          isActive={statusFilter === "uploaded"}
        />
        <StatusCard
          label="Approved"
          count={statusCounts.reviewed}
          icon={<Check className="h-4 w-4" />}
          color="emerald"
          onClick={() => setStatusFilter("reviewed")}
          isActive={statusFilter === "reviewed"}
        />
        <StatusCard
          label="Rejected"
          count={statusCounts.rejected}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="red"
          onClick={() => setStatusFilter("rejected")}
          isActive={statusFilter === "rejected"}
        />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending Upload</SelectItem>
            <SelectItem value="uploaded">Needs Review</SelectItem>
            <SelectItem value="reviewed">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {documentRequests === undefined ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
            <span className="text-muted-foreground text-sm">Loading requests...</span>
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 font-medium">No document requests</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusFilter !== "all"
              ? "No requests match the current filter"
              : "Create your first document request to get started"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request._id}
              request={request}
              organizations={organizations ?? []}
              users={users ?? []}
              onReview={() => setReviewingRequest(request._id)}
            />
          ))}
        </div>
      )}

      {/* Review Dialog */}
      {reviewingRequest && (
        <ReviewDialog
          requestId={reviewingRequest}
          onClose={() => setReviewingRequest(null)}
        />
      )}
    </div>
  );
}

// Status summary card
interface StatusCardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: "amber" | "blue" | "emerald" | "red";
  onClick: () => void;
  isActive: boolean;
}

function StatusCard({ label, count, icon, color, onClick, isActive }: StatusCardProps) {
  const colorClasses = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border transition-all text-left",
        isActive ? colorClasses[color] : "bg-white border-gray-200 hover:bg-gray-50"
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold">{count}</p>
    </button>
  );
}

// Request card component
interface RequestCardProps {
  request: {
    _id: Id<"documentRequests">;
    organizationId: Id<"organizations">;
    clientId: Id<"users">;
    title: string;
    description?: string;
    category: string;
    dueDate?: number;
    status: string;
    createdAt: number;
    uploadedAt?: number;
    reviewNote?: string;
  };
  organizations: Array<{ _id: Id<"organizations">; name: string }>;
  users: Array<{ _id: Id<"users">; name: string; email: string }>;
  onReview: () => void;
}

function RequestCard({ request, organizations, users, onReview }: RequestCardProps) {
  const config = statusConfig[request.status] || statusConfig.pending;
  const categoryColor = categoryColors[request.category] || categoryColors.other;
  const org = organizations.find(o => o._id === request.organizationId);
  const client = users.find(u => u._id === request.clientId);
  const isOverdue = request.dueDate && request.dueDate < Date.now() && request.status === "pending";

  const cancelRequest = useMutation(api.documents.cancelRequest);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this request?")) return;
    setIsCancelling(true);
    try {
      await cancelRequest({ id: request._id });
      toast.success("Request cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel request");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-gray-900 truncate">{request.title}</h3>
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", config.bg, config.text)}>
              {config.icon}
              {config.label}
            </span>
          </div>

          {request.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{request.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {org?.name || "Unknown"}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {client?.name || "Unknown"}
            </span>
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium uppercase", categoryColor.bg, categoryColor.text)}>
              {categories.find(c => c.value === request.category)?.label || request.category}
            </span>
            {request.dueDate && (
              <span className={cn(isOverdue ? "text-red-600" : "")}>
                {isOverdue ? "Overdue: " : "Due: "}
                {new Date(request.dueDate).toLocaleDateString()}
              </span>
            )}
            <span>Created {formatDistanceToNow(request.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {request.status === "uploaded" && (
            <Button size="sm" onClick={onReview}>
              <Eye className="h-4 w-4 mr-1" />
              Review
            </Button>
          )}
          {request.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Create request dialog
interface CreateRequestDialogProps {
  organizations: Array<{ _id: Id<"organizations">; name: string }>;
  users: Array<{ _id: Id<"users">; name: string; email: string; organizationId?: Id<"organizations"> }>;
  onClose: () => void;
}

function CreateRequestDialog({ organizations, users, onClose }: CreateRequestDialogProps) {
  const [organizationId, setOrganizationId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRequest = useMutation(api.documents.createRequest);

  // Filter users by selected organization
  const filteredUsers = organizationId
    ? users.filter(u => u.organizationId === organizationId)
    : users;

  // Reset client when org changes
  const handleOrgChange = (value: string) => {
    setOrganizationId(value);
    setClientId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationId || !clientId || !title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createRequest({
        organizationId: organizationId as Id<"organizations">,
        clientId: clientId as Id<"users">,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      });
      toast.success("Document request created");
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
          <DialogTitle>Request Document</DialogTitle>
          <DialogDescription>
            Request a specific document from a client
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="org">Organization *</Label>
            <Select value={organizationId} onValueChange={handleOrgChange}>
              <SelectTrigger id="org">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org._id} value={org._id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client">Client *</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={!organizationId}>
              <SelectTrigger id="client">
                <SelectValue placeholder={organizationId ? "Select client" : "Select organization first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Bank statements for Q4 2025"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed instructions for the client..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger id="category">
                  <SelectValue />
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

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Request"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// Review dialog for uploaded documents
interface ReviewDialogProps {
  requestId: Id<"documentRequests">;
  onClose: () => void;
}

function ReviewDialog({ requestId, onClose }: ReviewDialogProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const request = useQuery(api.documents.getRequest, { id: requestId });
  const reviewRequest = useMutation(api.documents.reviewRequest);

  const handleReview = async (action: "approve" | "reject") => {
    if (action === "reject" && !note.trim()) {
      toast.error("Please provide feedback for rejection");
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewRequest({
        requestId,
        action,
        note: note.trim() || undefined,
      });
      toast.success(action === "approve" ? "Document approved" : "Document rejected");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to review document");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) {
    return null;
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Document</DialogTitle>
          <DialogDescription>
            Review and approve or reject: {request.title}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-blue-900">{request.title}</p>
            {request.description && (
              <p className="text-sm text-blue-700 mt-1">{request.description}</p>
            )}
            <p className="text-xs text-blue-600 mt-2">
              Uploaded {request.uploadedAt ? formatDistanceToNow(request.uploadedAt) : "recently"}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Review Note (required for rejection)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add feedback for the client..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleReview("reject")}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button
            onClick={() => handleReview("approve")}
            disabled={isSubmitting}
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
