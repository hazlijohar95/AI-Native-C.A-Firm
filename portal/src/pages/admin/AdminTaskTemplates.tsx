import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Calendar,
  RefreshCw,
  Building2,
  CheckSquare,
  Receipt,
  FileText,
  Calculator,
  BookOpen,
} from "@/lib/icons";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

// Types
type TemplateCategory = "tax" | "bookkeeping" | "compliance" | "advisory" | "onboarding";
type RecurrenceFrequency = "monthly" | "quarterly" | "yearly";
type TaskPriority = "low" | "medium" | "high";

type TemplateType = {
  _id: Id<"taskTemplates">;
  name: string;
  description?: string;
  category: TemplateCategory;
  recurrence: {
    frequency: RecurrenceFrequency;
    dayOfMonth?: number;
    monthOfYear?: number;
    quarterMonth?: number;
  };
  taskDefaults: {
    title: string;
    description?: string;
    priority: TaskPriority;
    dueDaysAfterGeneration: number;
  };
  isActive: boolean;
  isBuiltIn: boolean;
  createdAt: number;
};

const categoryConfig: Record<TemplateCategory, { label: string; icon: typeof CheckSquare; color: string }> = {
  tax: { label: "Tax", icon: Receipt, color: "bg-red-100 text-red-700" },
  bookkeeping: { label: "Bookkeeping", icon: Calculator, color: "bg-blue-100 text-blue-700" },
  compliance: { label: "Compliance", icon: FileText, color: "bg-amber-100 text-amber-700" },
  advisory: { label: "Advisory", icon: BookOpen, color: "bg-purple-100 text-purple-700" },
  onboarding: { label: "Onboarding", icon: Building2, color: "bg-green-100 text-green-700" },
};

const frequencyLabels: Record<RecurrenceFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const priorityColors: Record<TaskPriority, string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

export function AdminTaskTemplates() {
  const templates = useQuery(api.taskTemplates.list, {});
  const organizations = useQuery(api.organizations.list);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Dialog state
  const createDialog = useDialog();
  const editDialog = useDialog<TemplateType>();
  const deleteDialog = useDialog<TemplateType>();
  const subscribeDialog = useDialog<TemplateType>();

  // Filter templates
  const filteredTemplates = useMemo(() =>
    templates?.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }),
    [templates, searchQuery, categoryFilter]
  );

  // Mutations
  const deleteTemplateMutation = useMutation(api.taskTemplates.remove);
  const { execute: deleteTemplate, isLoading: isDeleting } = useMutationWithToast(
    (args: { id: Id<"taskTemplates"> }) => deleteTemplateMutation(args),
    {
      successMessage: "Template deleted",
      onSuccess: () => deleteDialog.close(),
    }
  );

  const toggleActiveMutation = useMutation(api.taskTemplates.toggleActive);

  const handleDelete = async () => {
    if (!deleteDialog.data) return;
    await deleteTemplate({ id: deleteDialog.data._id });
  };

  const handleToggleActive = async (id: Id<"taskTemplates">, isActive: boolean) => {
    try {
      await toggleActiveMutation({ id, isActive });
      toast.success(isActive ? "Template activated" : "Template deactivated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update template");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Task Templates
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage recurring task templates for automated task generation
          </p>
        </div>
        <Dialog open={createDialog.isOpen} onOpenChange={createDialog.setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <TemplateDialog onClose={createDialog.close} />
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search templates..."
          className="flex-1"
          maxWidth="md"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <config.icon className="h-4 w-4" />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {templates === undefined ? (
        <LoadingState message="Loading templates..." />
      ) : filteredTemplates?.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No templates found"
          description={
            searchQuery || categoryFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first template to automate recurring tasks"
          }
          action={
            <Button onClick={() => createDialog.open()} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates?.map((template) => {
            const categoryInfo = categoryConfig[template.category];
            const CategoryIcon = categoryInfo.icon;
            return (
              <Card
                key={template._id}
                className={cn(
                  "relative transition-opacity",
                  !template.isActive && "opacity-60"
                )}
              >
                {template.isBuiltIn && (
                  <Badge variant="secondary" className="absolute top-3 right-3 text-[10px]">
                    Built-in
                  </Badge>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", categoryInfo.color)}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.description || "No description"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Template Info */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="gap-1">
                        <RefreshCw className="h-3 w-3" />
                        {frequencyLabels[template.recurrence.frequency]}
                      </Badge>
                      <Badge className={priorityColors[template.taskDefaults.priority]}>
                        {template.taskDefaults.priority}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {template.taskDefaults.dueDaysAfterGeneration}d to complete
                      </Badge>
                    </div>

                    {/* Task Preview */}
                    <div className="rounded-md bg-muted/50 p-2 text-sm">
                      <p className="font-medium text-muted-foreground text-xs mb-1">Generated Task:</p>
                      <p className="truncate">{template.taskDefaults.title}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.isActive}
                          onCheckedChange={(checked) => handleToggleActive(template._id, checked)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {template.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => subscribeDialog.open(template)}
                          title="Manage subscriptions"
                        >
                          <Building2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editDialog.open(template)}
                          disabled={template.isBuiltIn}
                          title={template.isBuiltIn ? "Built-in templates cannot be edited" : "Edit template"}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDialog.open(template)}
                          disabled={template.isBuiltIn}
                          className="text-destructive hover:text-destructive"
                          title={template.isBuiltIn ? "Built-in templates cannot be deleted" : "Delete template"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {templates && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Total: {templates.length} templates</span>
          <span>Active: {templates.filter(t => t.isActive).length}</span>
          <span>Built-in: {templates.filter(t => t.isBuiltIn).length}</span>
          <span>Custom: {templates.filter(t => !t.isBuiltIn).length}</span>
        </div>
      )}

      {/* Edit Template Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={editDialog.setIsOpen}>
        {editDialog.data && (
          <TemplateDialog template={editDialog.data} onClose={editDialog.close} />
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={deleteDialog.setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.data?.name}"?
              This will not affect tasks that have already been generated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Spinner size="sm" className="mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Subscriptions Dialog */}
      <Dialog open={subscribeDialog.isOpen} onOpenChange={subscribeDialog.setIsOpen}>
        {subscribeDialog.data && (
          <SubscriptionDialog
            template={subscribeDialog.data}
            organizations={organizations || []}
            onClose={subscribeDialog.close}
          />
        )}
      </Dialog>
    </div>
  );
}

// Template Create/Edit Dialog
interface TemplateDialogProps {
  template?: TemplateType;
  onClose: () => void;
}

function TemplateDialog({ template, onClose }: TemplateDialogProps) {
  const createTemplate = useMutation(api.taskTemplates.create);
  const updateTemplate = useMutation(api.taskTemplates.update);

  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState<TemplateCategory>(template?.category || "tax");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(template?.recurrence.frequency || "monthly");
  const [dayOfMonth, setDayOfMonth] = useState(template?.recurrence.dayOfMonth?.toString() || "1");
  const [taskTitle, setTaskTitle] = useState(template?.taskDefaults.title || "");
  const [taskDescription, setTaskDescription] = useState(template?.taskDefaults.description || "");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>(template?.taskDefaults.priority || "medium");
  const [dueDays, setDueDays] = useState(template?.taskDefaults.dueDaysAfterGeneration?.toString() || "14");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!template;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !taskTitle.trim()) {
      toast.error("Template name and task title are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        recurrence: {
          frequency,
          dayOfMonth: parseInt(dayOfMonth) || 1,
        },
        taskDefaults: {
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          priority: taskPriority,
          dueDaysAfterGeneration: parseInt(dueDays) || 14,
        },
      };

      if (isEditing) {
        await updateTemplate({ id: template._id, ...data });
        toast.success("Template updated");
      } else {
        await createTemplate(data);
        toast.success("Template created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the template details" : "Create a new recurring task template"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Template Info */}
          <div className="grid gap-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monthly Bookkeeping"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dayOfMonth">Day of Month to Generate</Label>
            <Input
              id="dayOfMonth"
              type="number"
              min="1"
              max="28"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tasks will be generated on this day (1-28)
            </p>
          </div>

          {/* Task Defaults */}
          <div className="border-t pt-4 mt-2">
            <h4 className="font-medium mb-3">Generated Task Settings</h4>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="taskTitle">Task Title *</Label>
                <Input
                  id="taskTitle"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Submit monthly documents"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="taskDescription">Task Description</Label>
                <Textarea
                  id="taskDescription"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Instructions for completing this task..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="taskPriority">Priority</Label>
                  <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as TaskPriority)}>
                    <SelectTrigger id="taskPriority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDays">Days to Complete</Label>
                  <Input
                    id="dueDays"
                    type="number"
                    min="1"
                    max="90"
                    value={dueDays}
                    onChange={(e) => setDueDays(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            {isEditing ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// Subscription Management Dialog
interface SubscriptionDialogProps {
  template: TemplateType;
  organizations: Array<{ _id: Id<"organizations">; name: string }>;
  onClose: () => void;
}

function SubscriptionDialog({ template, organizations, onClose }: SubscriptionDialogProps) {
  const subscriptions = useQuery(api.taskTemplates.listSubscriptions, { templateId: template._id });
  const subscribeMutation = useMutation(api.taskTemplates.subscribeOrganization);
  const unsubscribeMutation = useMutation(api.taskTemplates.unsubscribeOrganization);

  const [isLoading, setIsLoading] = useState<string | null>(null);

  const subscribedOrgIds = new Set(subscriptions?.map(s => s.organizationId.toString()) || []);

  const handleToggleSubscription = async (orgId: Id<"organizations">, isSubscribed: boolean) => {
    setIsLoading(orgId.toString());
    try {
      if (isSubscribed) {
        await unsubscribeMutation({ templateId: template._id, organizationId: orgId });
        toast.success("Organization unsubscribed");
      } else {
        await subscribeMutation({ templateId: template._id, organizationId: orgId });
        toast.success("Organization subscribed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update subscription");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Manage Subscriptions
        </DialogTitle>
        <DialogDescription>
          Select which organizations should receive recurring tasks from "{template.name}"
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        {organizations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No organizations available
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {organizations.map((org) => {
              const isSubscribed = subscribedOrgIds.has(org._id.toString());
              const loading = isLoading === org._id.toString();
              return (
                <div
                  key={org._id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{org.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {loading && <Spinner size="sm" />}
                    <Switch
                      checked={isSubscribed}
                      onCheckedChange={() => handleToggleSubscription(org._id, isSubscribed)}
                      disabled={loading}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
