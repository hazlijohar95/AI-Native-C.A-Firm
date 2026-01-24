import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen,
  Plus,
} from "@/lib/icons";
import { toast } from "sonner";
import { FolderGrid, EmptyFolderState } from "./FolderCard";
import { BreadcrumbNav, buildBreadcrumbItems } from "./Breadcrumb";
import type { Id, Doc } from "../../../convex/_generated/dataModel";

interface FolderWithCount extends Doc<"folders"> {
  documentCount: number;
}

// Color options for folders
const colorOptions = [
  { value: "gray", label: "Gray", class: "bg-gray-400" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "emerald", label: "Green", class: "bg-emerald-500" },
  { value: "violet", label: "Purple", class: "bg-violet-500" },
  { value: "amber", label: "Orange", class: "bg-amber-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
];

interface FolderBrowserProps {
  organizationId: Id<"organizations">;
  serviceTypeId?: Id<"serviceTypes">;
  serviceType?: Doc<"serviceTypes"> | null;
  currentFolderId?: Id<"folders"> | null;
  onFolderSelect: (folderId: Id<"folders"> | null) => void;
  onBreadcrumbNavigate?: (type: "home" | "service", serviceId?: Id<"serviceTypes">) => void;
  showBreadcrumb?: boolean;
  showCreateButton?: boolean;
  className?: string;
}

export function FolderBrowser({
  organizationId,
  serviceTypeId,
  serviceType,
  currentFolderId,
  onFolderSelect,
  onBreadcrumbNavigate,
  showBreadcrumb = true,
  showCreateButton = true,
  className,
}: FolderBrowserProps) {
  // State for dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<FolderWithCount | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderWithCount | null>(null);

  // Query folders
  const folders = useQuery(api.folders.list, {
    organizationId,
    serviceTypeId,
    parentId: currentFolderId ?? undefined,
  });

  // Query current folder details for breadcrumb
  const currentFolderDetails = useQuery(
    api.folders.getBreadcrumb,
    currentFolderId ? { folderId: currentFolderId } : "skip"
  );

  // Mutations
  const deleteFolderMutation = useMutation(api.folders.remove);

  // Build breadcrumb items
  const breadcrumbItems = buildBreadcrumbItems({
    showHome: true,
    serviceType: currentFolderDetails?.serviceType ?? serviceType,
    folderPath: currentFolderDetails?.path,
  });

  const handleBreadcrumbNavigate = (item: { id: string; type: string }, index: number) => {
    if (item.type === "home") {
      onFolderSelect(null);
      onBreadcrumbNavigate?.("home");
    } else if (item.type === "service") {
      onFolderSelect(null);
      onBreadcrumbNavigate?.("service", item.id as Id<"serviceTypes">);
    } else if (item.type === "folder") {
      // Navigate to the specific folder
      const folderPath = currentFolderDetails?.path;
      if (folderPath && index > 0) {
        // Find the folder in the path (subtract 1 for home, subtract 1 more if service is present)
        const serviceOffset = serviceType ? 1 : 0;
        const folderIndex = index - 1 - serviceOffset;
        if (folderIndex >= 0 && folderIndex < folderPath.length) {
          onFolderSelect(folderPath[folderIndex]._id);
        }
      }
    }
  };

  const handleFolderClick = (folderId: Id<"folders">) => {
    onFolderSelect(folderId);
  };

  const handleEditFolder = (folder: FolderWithCount) => {
    setEditFolder(folder);
  };

  const handleDeleteFolder = (folder: FolderWithCount) => {
    setDeleteFolder(folder);
  };

  const isLoading = folders === undefined;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumb and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {showBreadcrumb && breadcrumbItems.length > 0 && (
          <BreadcrumbNav
            items={breadcrumbItems}
            onNavigate={handleBreadcrumbNavigate}
          />
        )}

        {showCreateButton && (
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium text-[#0f0f12] bg-white border border-[#EBEBEB] rounded-lg hover:bg-[#f8f8f8] transition-colors self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            New Folder
          </button>
        )}
      </div>

      {/* Folder grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
            <span className="text-[#9d9da6] text-sm">Loading folders...</span>
          </div>
        </div>
      ) : folders.length === 0 && !currentFolderId ? (
        <EmptyFolderState
          onCreateFolder={showCreateButton ? () => setCreateDialogOpen(true) : undefined}
          serviceName={serviceType?.name}
        />
      ) : folders.length > 0 ? (
        <FolderGrid
          folders={folders}
          onFolderClick={handleFolderClick}
          onEdit={handleEditFolder}
          onDelete={handleDeleteFolder}
        />
      ) : null}

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        organizationId={organizationId}
        serviceTypeId={serviceTypeId}
        parentId={currentFolderId ?? undefined}
        onSuccess={() => {
          setCreateDialogOpen(false);
          toast.success("Folder created");
        }}
      />

      {/* Edit Folder Dialog */}
      {editFolder && (
        <EditFolderDialog
          open={!!editFolder}
          onOpenChange={(open) => !open && setEditFolder(null)}
          folder={editFolder}
          onSuccess={() => {
            setEditFolder(null);
            toast.success("Folder updated");
          }}
        />
      )}

      {/* Delete Folder Confirmation */}
      <AlertDialog open={!!deleteFolder} onOpenChange={(open) => !open && setDeleteFolder(null)}>
        <AlertDialogContent className="bg-white border border-[#EBEBEB] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-[#0f0f12]">
              Delete Folder
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#6b6b76]">
              Are you sure you want to delete "{deleteFolder?.name}"?
              {deleteFolder && deleteFolder.documentCount > 0 && (
                <span className="block mt-2 text-red-600">
                  This folder contains {deleteFolder.documentCount} document
                  {deleteFolder.documentCount !== 1 ? "s" : ""}. Please move or delete them first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-10 px-5 rounded-lg border-[#EBEBEB]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteFolder) return;
                try {
                  await deleteFolderMutation({ id: deleteFolder._id });
                  toast.success("Folder deleted");
                  setDeleteFolder(null);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete folder");
                }
              }}
              disabled={deleteFolder ? deleteFolder.documentCount > 0 : false}
              className="h-10 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Create Folder Dialog
interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
  serviceTypeId?: Id<"serviceTypes">;
  parentId?: Id<"folders">;
  onSuccess: () => void;
}

function CreateFolderDialog({
  open,
  onOpenChange,
  organizationId,
  serviceTypeId,
  parentId,
  onSuccess,
}: CreateFolderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("gray");
  const [isCreating, setIsCreating] = useState(false);

  const createFolder = useMutation(api.folders.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await createFolder({
        organizationId,
        serviceTypeId,
        parentId,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      setName("");
      setDescription("");
      setColor("gray");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create folder");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Create Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your documents
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name..."
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all",
                    option.class,
                    color === option.value
                      ? "ring-2 ring-offset-2 ring-[#0f0f12]"
                      : "opacity-60 hover:opacity-100"
                  )}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Folder"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Folder Dialog
interface EditFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderWithCount;
  onSuccess: () => void;
}

function EditFolderDialog({
  open,
  onOpenChange,
  folder,
  onSuccess,
}: EditFolderDialogProps) {
  const [name, setName] = useState(folder.name);
  const [description, setDescription] = useState(folder.description || "");
  const [color, setColor] = useState(folder.color || "gray");
  const [isUpdating, setIsUpdating] = useState(false);

  const updateFolder = useMutation(api.folders.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsUpdating(true);
    try {
      await updateFolder({
        id: folder._id,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update folder");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Edit Folder</DialogTitle>
          <DialogDescription>
            Update folder details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Folder Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name..."
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all",
                    option.class,
                    color === option.value
                      ? "ring-2 ring-offset-2 ring-[#0f0f12]"
                      : "opacity-60 hover:opacity-100"
                  )}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isUpdating}>
              {isUpdating ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Folder selector for moving documents
interface FolderSelectorProps {
  organizationId: Id<"organizations">;
  serviceTypeId?: Id<"serviceTypes">;
  currentFolderId?: Id<"folders">;
  excludeFolderId?: Id<"folders">;
  onSelect: (folderId: Id<"folders"> | null) => void;
  className?: string;
}

export function FolderSelector({
  organizationId,
  serviceTypeId,
  currentFolderId,
  excludeFolderId,
  onSelect,
  className,
}: FolderSelectorProps) {
  const folders = useQuery(api.folders.list, {
    organizationId,
    serviceTypeId,
  });

  const availableFolders = folders?.filter((f) => f._id !== excludeFolderId) || [];

  return (
    <Select
      value={currentFolderId || "none"}
      onValueChange={(value) => onSelect(value === "none" ? null : (value as Id<"folders">))}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select folder">
          {currentFolderId
            ? availableFolders.find((f) => f._id === currentFolderId)?.name || "Select folder"
            : "No folder (root)"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-[#9d9da6]" />
            No folder (root)
          </span>
        </SelectItem>
        {availableFolders.map((folder) => (
          <SelectItem key={folder._id} value={folder._id}>
            <span className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-[#9d9da6]" />
              {folder.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
