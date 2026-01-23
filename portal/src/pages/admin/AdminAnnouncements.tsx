import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Megaphone,
  Plus,
  Search,
  Pin,
  Globe,
  Building2,
  Edit,
  Trash,
  Calendar,
} from "@/lib/icons";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

type AnnouncementType = "general" | "tax_update" | "deadline" | "news";

export function AdminAnnouncements() {
  const announcements = useQuery(api.admin.listAllAnnouncements);
  const organizations = useQuery(api.organizations.list);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<(typeof announcements extends (infer T)[] | undefined ? T : never) | null>(null);

  // Filter announcements
  const filteredAnnouncements = announcements?.filter((announcement) => {
    const matchesSearch = 
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || announcement.type === typeFilter;
    const matchesStatus = statusFilter === "all" || announcement.adminStatus === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeBadge = (type: AnnouncementType) => {
    switch (type) {
      case "general":
        return <Badge variant="secondary">General</Badge>;
      case "tax_update":
        return <Badge className="bg-blue-500">Tax Update</Badge>;
      case "deadline":
        return <Badge variant="destructive">Deadline</Badge>;
      case "news":
        return <Badge className="bg-purple-500">News</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "scheduled":
        return <Badge className="bg-amber-500">Scheduled</Badge>;
      case "expired":
        return <Badge variant="secondary" className="text-muted-foreground">Expired</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Announcements
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage client announcements
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <AnnouncementDialog 
            organizations={organizations || []}
            onClose={() => setIsCreateOpen(false)} 
          />
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="tax_update">Tax Update</SelectItem>
            <SelectItem value="deadline">Deadline</SelectItem>
            <SelectItem value="news">News</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Announcements List */}
      {announcements === undefined ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredAnnouncements?.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-medium">No announcements found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || typeFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Create your first announcement to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements?.map((announcement) => (
            <Card key={announcement._id} className={announcement.isPinned ? "border-primary/50" : ""}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {announcement.isPinned && (
                        <Pin className="h-4 w-4 text-primary" />
                      )}
                      {getTypeBadge(announcement.type as AnnouncementType)}
                      {getStatusBadge(announcement.adminStatus)}
                      {announcement.targetOrganizations && announcement.targetOrganizations.length > 0 ? (
                        <Badge variant="outline" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          {announcement.targetOrganizations.length} org{announcement.targetOrganizations.length !== 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" />
                          All clients
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{announcement.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {announcement.content}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Published {formatDate(announcement.publishedAt)}
                      </span>
                      {announcement.expiresAt && (
                        <span>Expires {formatDate(announcement.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog 
                      open={editingAnnouncement?._id === announcement._id} 
                      onOpenChange={(open) => !open && setEditingAnnouncement(null)}
                    >
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingAnnouncement(announcement)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <AnnouncementDialog 
                        announcement={announcement}
                        organizations={organizations || []}
                        onClose={() => setEditingAnnouncement(null)} 
                      />
                    </Dialog>
                    <DeleteAnnouncementButton id={announcement._id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteAnnouncementButton({ id }: { id: Id<"announcements"> }) {
  const deleteAnnouncement = useMutation(api.announcements.remove);

  const handleDelete = async () => {
    try {
      await deleteAnnouncement({ id });
      toast.success("Announcement deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete announcement");
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The announcement will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface AnnouncementDialogProps {
  announcement?: {
    _id: Id<"announcements">;
    title: string;
    content: string;
    type: string;
    targetOrganizations?: Id<"organizations">[];
    isPinned: boolean;
    expiresAt?: number;
  };
  organizations: Array<{ _id: Id<"organizations">; name: string }>;
  onClose: () => void;
}

function AnnouncementDialog({ announcement, organizations, onClose }: AnnouncementDialogProps) {
  const createAnnouncement = useMutation(api.announcements.create);
  const updateAnnouncement = useMutation(api.announcements.update);
  
  const [title, setTitle] = useState(announcement?.title || "");
  const [content, setContent] = useState(announcement?.content || "");
  const [type, setType] = useState<AnnouncementType>((announcement?.type as AnnouncementType) || "general");
  const [targetAll, setTargetAll] = useState(!announcement?.targetOrganizations?.length);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>(
    announcement?.targetOrganizations?.map(id => id.toString()) || []
  );
  const [isPinned, setIsPinned] = useState(announcement?.isPinned || false);
  const [expiresAt, setExpiresAt] = useState(
    announcement?.expiresAt 
      ? new Date(announcement.expiresAt).toISOString().split("T")[0]
      : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!announcement;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetOrganizations = targetAll 
        ? undefined 
        : selectedOrgs.map(id => id as Id<"organizations">);

      if (isEditing) {
        await updateAnnouncement({
          id: announcement._id,
          title: title.trim(),
          content: content.trim(),
          type,
          targetOrganizations,
          isPinned,
          expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
        });
        toast.success("Announcement updated");
      } else {
        await createAnnouncement({
          title: title.trim(),
          content: content.trim(),
          type,
          targetOrganizations,
          isPinned,
          expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
        });
        toast.success("Announcement created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOrg = (orgId: string) => {
    setSelectedOrgs(prev => 
      prev.includes(orgId) 
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    );
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the announcement details" : "Create a new announcement for your clients"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Important Tax Filing Deadline"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="content">Content *</Label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement content here..."
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AnnouncementType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="tax_update">Tax Update</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
                <SelectItem value="news">News</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Target Audience</Label>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="targetAll"
                checked={targetAll}
                onCheckedChange={(checked) => {
                  setTargetAll(checked === true);
                  if (checked) setSelectedOrgs([]);
                }}
              />
              <Label htmlFor="targetAll" className="text-sm font-normal">
                All clients
              </Label>
            </div>
            {!targetAll && (
              <div className="max-h-32 overflow-y-auto rounded-md border p-2">
                {organizations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No organizations available</p>
                ) : (
                  organizations.map((org) => (
                    <label 
                      key={org._id} 
                      className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedOrgs.includes(org._id.toString())}
                        onCheckedChange={() => toggleOrg(org._id.toString())}
                      />
                      <span className="text-sm">{org.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isPinned"
                checked={isPinned}
                onCheckedChange={(checked) => setIsPinned(checked === true)}
              />
              <Label htmlFor="isPinned" className="text-sm font-normal">
                Pin to top
              </Label>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expiresAt">Expires (optional)</Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for no expiration
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            {isEditing ? "Save Changes" : "Publish"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
