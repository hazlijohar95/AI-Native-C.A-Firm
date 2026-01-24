import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
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
  Upload,
  Filter,
  FolderOpen,
  X,
  Sparkles,
  Clock,
  ArrowRight,
  AlertTriangle,
  Check,
  Search,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Id, Doc } from "../../convex/_generated/dataModel";

// Import new components
import { ServiceTabsNav } from "@/components/documents/ServiceTabsNav";
import { ServiceOverviewGrid } from "@/components/documents/ServiceOverviewCard";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { FolderBrowser } from "@/components/documents/FolderBrowser";
import { BreadcrumbNav, buildBreadcrumbItems } from "@/components/documents/Breadcrumb";
import { DocumentPreviewModal, useDocumentPreview } from "@/components/documents/DocumentPreviewModal";
import { DocumentVersionHistory, useVersionHistory } from "@/components/documents/DocumentVersionHistory";
import { UploadDocumentDialog } from "@/components/documents/UploadDocumentDialog";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "tax_return", label: "Tax Returns" },
  { value: "financial_statement", label: "Financial Statements" },
  { value: "invoice", label: "Invoices" },
  { value: "agreement", label: "Agreements" },
  { value: "receipt", label: "Receipts" },
  { value: "other", label: "Other" },
];

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

export function Documents() {
  // State for service-based navigation
  const [selectedServiceId, setSelectedServiceId] = useState<Id<"serviceTypes"> | "all">("all");
  const [currentFolderId, setCurrentFolderId] = useState<Id<"folders"> | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fulfillRequestId, setFulfillRequestId] = useState<Id<"documentRequests"> | null>(null);

  // Use dialog hook for delete confirmation
  const deleteDialog = useDialog<{ id: Id<"documents">; name: string }>();

  // Document preview hook
  const preview = useDocumentPreview();

  // Version history hook
  const versionHistory = useVersionHistory();

  // Queries
  const currentUser = useQuery(api.users.getCurrentUser);
  const serviceTypes = useQuery(api.serviceTypes.list, {});
  const subscriptions = useQuery(api.subscriptions.listForCurrentUser, {});
  const serviceStats = useQuery(api.documents.getServiceStats, {});

  // Get folders for current service
  const folders = useQuery(
    api.folders.list,
    selectedServiceId !== "all" && currentUser?.organizationId
      ? {
          organizationId: currentUser.organizationId,
          serviceTypeId: selectedServiceId,
          parentId: currentFolderId ?? undefined,
        }
      : "skip"
  );

  // Get breadcrumb for current folder
  const folderBreadcrumb = useQuery(
    api.folders.getBreadcrumb,
    currentFolderId ? { folderId: currentFolderId } : "skip"
  );

  // Get documents based on selected service and folder
  const documents = useQuery(api.documents.listByService, {
    serviceTypeId: selectedServiceId === "all" ? undefined : selectedServiceId,
    folderId: currentFolderId ?? undefined,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    searchQuery: searchQuery || undefined,
    limit: 50,
  });

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

  // Get subscribed services (for clients) or all services (for admin)
  const subscribedServices = currentUser?.role === "client"
    ? subscriptions?.map(s => s.serviceType).filter((s): s is Doc<"serviceTypes"> => s !== null) ?? []
    : serviceTypes ?? [];

  // Calculate total documents
  const totalDocuments = serviceStats?.reduce((sum, s) => sum + s.documentCount, 0) ?? 0;

  // Prepare services with document counts for tabs
  const servicesWithCounts = subscribedServices.map(service => ({
    ...service,
    documentCount: serviceStats?.find(s => s.serviceType._id === service._id)?.documentCount ?? 0,
  }));

  // Get the current service type for display
  const currentServiceType = selectedServiceId !== "all"
    ? subscribedServices.find(s => s._id === selectedServiceId)
    : null;

  // Handle service selection (reset folder when changing services)
  const handleServiceSelect = (serviceId: Id<"serviceTypes"> | "all") => {
    setSelectedServiceId(serviceId);
    setCurrentFolderId(null);
  };

  // Handle folder navigation
  const handleFolderSelect = (folderId: Id<"folders"> | null) => {
    setCurrentFolderId(folderId);
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = (type: "home" | "service", serviceId?: Id<"serviceTypes">) => {
    if (type === "home") {
      setSelectedServiceId("all");
      setCurrentFolderId(null);
    } else if (type === "service" && serviceId) {
      setSelectedServiceId(serviceId);
      setCurrentFolderId(null);
    }
  };

  // Build breadcrumb items
  const breadcrumbItems = buildBreadcrumbItems({
    showHome: true,
    serviceType: currentServiceType || folderBreadcrumb?.serviceType,
    folderPath: folderBreadcrumb?.path,
  });

  const isLoading = !currentUser || !serviceTypes || !subscriptions;
  const showServiceOverview = selectedServiceId === "all" && !searchQuery;
  const showFolders = selectedServiceId !== "all" && !searchQuery && folders && folders.length > 0;
  const isInFolder = currentFolderId !== null;

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
            {selectedServiceId === "all"
              ? "View and manage your documents across all services"
              : `Documents for ${servicesWithCounts.find(s => s._id === selectedServiceId)?.name || "this service"}`}
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
            serviceTypes={subscribedServices}
            defaultServiceTypeId={selectedServiceId === "all" ? undefined : selectedServiceId}
            defaultFolderId={currentFolderId}
            onClose={() => {
              setUploadDialogOpen(false);
              setFulfillRequestId(null);
            }}
            fulfillRequestId={fulfillRequestId}
            onFulfillComplete={() => setFulfillRequestId(null)}
          />
        </Dialog>
      </div>

      {/* Service Tabs Navigation */}
      {!isLoading && subscribedServices.length > 0 && (
        <div
          className="opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards",
          }}
        >
          <ServiceTabsNav
            services={servicesWithCounts}
            selectedServiceId={selectedServiceId}
            onSelectService={handleServiceSelect}
            showAllTab={true}
            totalDocuments={totalDocuments}
          />
        </div>
      )}

      {/* Breadcrumb Navigation (when inside a service or folder) */}
      {!isLoading && (selectedServiceId !== "all" || currentFolderId) && (
        <div
          className="opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.07s forwards",
          }}
        >
          <BreadcrumbNav
            items={breadcrumbItems}
            onNavigate={(item) => {
              if (item.type === "home") {
                handleBreadcrumbNavigate("home");
              } else if (item.type === "service") {
                handleBreadcrumbNavigate("service", item.id as Id<"serviceTypes">);
              } else if (item.type === "folder") {
                // Navigate directly to the folder using its ID from the breadcrumb item
                setCurrentFolderId(item.id as Id<"folders">);
              }
            }}
          />
        </div>
      )}

      {/* Search and Filters */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
        }}
      >
        {/* Search Input */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9d9da6]" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white border-[#EBEBEB] rounded-lg text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9d9da6] hover:text-[#6b6b76]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
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

      {/* Active Filters Summary */}
      {(searchQuery || categoryFilter !== "all") && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#6b6b76]">Filters:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0f0f12] text-white text-xs font-medium">
              Search: "{searchQuery.length > 20 ? searchQuery.slice(0, 20) + "..." : searchQuery}"
              <button
                onClick={() => setSearchQuery("")}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {categoryFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0f0f12] text-white text-xs font-medium">
              Category: {categories.find((c) => c.value === categoryFilter)?.label}
              <button
                onClick={() => setCategoryFilter("all")}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {(searchQuery || categoryFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
              }}
              className="text-xs text-[#6b6b76] hover:text-[#0f0f12] underline underline-offset-2 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

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

      {/* Main Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
            <span className="text-[#9d9da6] text-sm">Loading documents...</span>
          </div>
        </div>
      ) : showServiceOverview && serviceStats ? (
        // Service Overview Grid (when "All" is selected and no search)
        <div
          className="opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards",
          }}
        >
          <h2 className="font-serif text-xl text-[#0f0f12] mb-4">Your Services</h2>
          <ServiceOverviewGrid
            stats={serviceStats.filter(s =>
              subscribedServices.some(sub => sub._id.toString() === s.serviceType._id?.toString())
            )}
            onSelectService={(serviceId) => handleServiceSelect(serviceId)}
          />
        </div>
      ) : (
        // Service-specific view with folders and documents
        <div
          className="space-y-6 opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards",
          }}
        >
          {/* Folders Section */}
          {showFolders && !isInFolder && currentUser?.organizationId && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-[#0f0f12]">Folders</h2>
              </div>
              <FolderBrowser
                organizationId={currentUser.organizationId}
                serviceTypeId={selectedServiceId !== "all" ? selectedServiceId : undefined}
                serviceType={currentServiceType}
                currentFolderId={currentFolderId}
                onFolderSelect={handleFolderSelect}
                onBreadcrumbNavigate={handleBreadcrumbNavigate}
                showBreadcrumb={false}
                showCreateButton={true}
              />
            </div>
          )}

          {/* Folder contents (when inside a folder) */}
          {isInFolder && currentUser?.organizationId && (
            <FolderBrowser
              organizationId={currentUser.organizationId}
              serviceTypeId={selectedServiceId !== "all" ? selectedServiceId : undefined}
              serviceType={currentServiceType}
              currentFolderId={currentFolderId}
              onFolderSelect={handleFolderSelect}
              onBreadcrumbNavigate={handleBreadcrumbNavigate}
              showBreadcrumb={false}
              showCreateButton={true}
            />
          )}

          {/* Documents Section */}
          {documents === undefined ? (
            <div className="flex h-32 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
                <span className="text-[#9d9da6] text-sm">Loading documents...</span>
              </div>
            </div>
          ) : documents.documents.length === 0 && (!showFolders || isInFolder) ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa]">
              <div className="w-14 h-14 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-4">
                <FolderOpen className="h-6 w-6 text-[#6b6b76]" />
              </div>
              <p className="text-base font-medium text-[#0f0f12]">No documents yet</p>
              <p className="text-sm text-[#9d9da6] mt-1 mb-4 text-center max-w-sm px-4">
                {searchQuery
                  ? `No documents found matching "${searchQuery}"`
                  : categoryFilter !== "all"
                  ? "No documents found in this category. Try clearing the filter."
                  : isInFolder
                  ? "This folder is empty. Upload documents or create subfolders to organize your files."
                  : selectedServiceId !== "all"
                  ? "No documents in this service yet. Upload your first document to get started."
                  : "Upload your first document to get started"}
              </p>
              {!searchQuery && categoryFilter === "all" && (
                <button
                  onClick={() => setUploadDialogOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-5 bg-[#0f0f12] hover:bg-[#1a1a1f] text-white rounded-xl font-medium text-sm transition-all duration-200"
                >
                  <Upload className="h-4 w-4" />
                  Upload Document
                </button>
              )}
              {categoryFilter !== "all" && (
                <button
                  onClick={() => setCategoryFilter("all")}
                  className="inline-flex items-center gap-2 h-10 px-5 border border-[#EBEBEB] hover:bg-[#f8f8f8] text-[#0f0f12] rounded-xl font-medium text-sm transition-all duration-200"
                >
                  Clear Filter
                </button>
              )}
            </div>
          ) : documents.documents.length > 0 ? (
            <div>
              {/* Results count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#6b6b76]">
                  {documents.total} document{documents.total !== 1 ? "s" : ""}
                  {searchQuery && ` matching "${searchQuery}"`}
                  {isInFolder && folderBreadcrumb?.path && ` in ${folderBreadcrumb.path[folderBreadcrumb.path.length - 1]?.name}`}
                </p>
              </div>

              {/* Document Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {documents.documents.map((doc, index) => (
                  <DocumentCard
                    key={doc._id}
                    document={doc}
                    onDelete={() => deleteDialog.open({ id: doc._id, name: doc.name })}
                    onPreview={() => preview.openPreview(
                      doc._id,
                      documents.documents.map(d => d._id)
                    )}
                    onViewVersions={() => versionHistory.openVersionHistory(doc._id, doc.name)}
                    showServiceBadge={selectedServiceId === "all" || !!searchQuery}
                    delay={0.02 + index * 0.02}
                  />
                ))}
              </div>
            </div>
          ) : null}
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

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        documentId={preview.previewId}
        isOpen={preview.isOpen}
        onClose={preview.closePreview}
        onNext={preview.goToNext}
        onPrevious={preview.goToPrevious}
        hasNext={preview.hasNext}
        hasPrevious={preview.hasPrevious}
      />

      {/* Document Version History */}
      {versionHistory.documentId && (
        <DocumentVersionHistory
          documentId={versionHistory.documentId}
          documentName={versionHistory.documentName}
          isOpen={versionHistory.isOpen}
          onClose={versionHistory.closeVersionHistory}
        />
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
  const categoryColor = {
    tax_return: { bg: "bg-blue-50", text: "text-blue-700" },
    financial_statement: { bg: "bg-emerald-50", text: "text-emerald-700" },
    invoice: { bg: "bg-amber-50", text: "text-amber-700" },
    agreement: { bg: "bg-violet-50", text: "text-violet-700" },
    receipt: { bg: "bg-gray-100", text: "text-gray-700" },
    other: { bg: "bg-gray-100", text: "text-gray-700" },
  }[request.category] || { bg: "bg-gray-100", text: "text-gray-700" };
  // Check if overdue - compute once per render (display-only logic)
  // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for overdue display
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
