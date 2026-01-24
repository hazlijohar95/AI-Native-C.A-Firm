import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
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
  CheckSquare,
  Plus,
  Building2,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Calendar,
  Download,
  User,
  MessageSquare,
  Send,
  Shield,
  HelpCircle,
  Bell,
  Check,
  X,
  AlertTriangle,
} from "@/lib/icons";
import { toast } from "sonner";
import { formatDate, formatDistanceToNow, cn } from "@/lib/utils";
import { useBulkSelection, exportToCSV, formatDateForExport } from "@/lib/bulk-actions";
import { Badge } from "@/components/ui/badge";
import type { Id } from "../../../convex/_generated/dataModel";

// Types
type TaskStatus = "pending" | "in_progress" | "completed";
type TaskPriority = "low" | "medium" | "high";
type RequestStatus = "pending_approval" | "approved" | "rejected";

type TaskType = {
  _id: Id<"tasks">;
  organizationId: Id<"organizations">;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: number;
  assignedTo?: Id<"users">;
  createdBy: Id<"users">;
  createdAt: number;
  completedAt?: number;
  // Client request fields
  isClientRequest?: boolean;
  requestStatus?: RequestStatus;
  requestedBy?: Id<"users">;
  rejectionReason?: string;
  // Escalation fields
  escalatedAt?: number;
  escalatedTo?: Id<"users">;
  // Reminder tracking
  remindersSent?: {
    sevenDays?: number;
    threeDays?: number;
    oneDay?: number;
    onDue?: number;
    overdue?: number[];
  };
};

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "pending_requests", label: "🔔 Pending Requests" },
  { value: "escalated", label: "⚠️ Escalated" },
];

const priorityOptions = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const priorityColors: Record<TaskPriority, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-gray-400" aria-hidden="true" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" aria-hidden="true" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />,
};

export function AdminTasks() {
  const tasks = useQuery(api.tasks.list, {});
  const organizations = useQuery(api.organizations.list);
  const users = useQuery(api.users.list);
  const pendingRequestsCount = useQuery(api.tasks.countPendingRequests);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");

  // Dialog state using useDialog hook for consistency
  const createDialog = useDialog();
  const editDialog = useDialog<TaskType>();
  const deleteDialog = useDialog<TaskType>();
  const commentsDialog = useDialog<TaskType>();
  const approveDialog = useDialog<TaskType>();
  const rejectDialog = useDialog<TaskType>();
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Create org lookup map
  const orgMap = useMemo(() =>
    new Map(organizations?.map((org) => [org._id.toString(), org.name]) || []),
    [organizations]
  );

  // Filter tasks
  const filteredTasks = useMemo(() =>
    tasks?.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      // Handle special filter values
      let matchesStatus = true;
      if (statusFilter === "pending_requests") {
        matchesStatus = task.isClientRequest === true && task.requestStatus === "pending_approval";
      } else if (statusFilter === "escalated") {
        matchesStatus = task.escalatedAt !== undefined;
      } else if (statusFilter !== "all") {
        matchesStatus = task.status === statusFilter;
      }

      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesOrg = orgFilter === "all" || task.organizationId.toString() === orgFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesOrg;
    }),
    [tasks, searchQuery, statusFilter, priorityFilter, orgFilter]
  );

  // Bulk selection
  const {
    selectedCount,
    selectedItems,
    isSelected,
    toggleSelection,
    toggleAll,
    clearSelection,
    allSelected,
    someSelected,
  } = useBulkSelection(filteredTasks);

  // Mutation with toast using hook for consistency
  const deleteTaskMutation = useMutation(api.tasks.remove);
  const { execute: deleteTask, isLoading: isDeleting } = useMutationWithToast(
    (args: { id: Id<"tasks"> }) => deleteTaskMutation(args),
    {
      successMessage: deleteDialog.data ? `Task "${deleteDialog.data.title}" deleted` : "Task deleted",
      onSuccess: () => deleteDialog.close(),
    }
  );

  // Request approval mutations
  const approveRequestMutation = useMutation(api.tasks.approveRequest);
  const { execute: approveRequest, isLoading: isApproving } = useMutationWithToast(
    (args: { id: Id<"tasks"> }) => approveRequestMutation(args),
    {
      successMessage: "Request approved - task is now active",
      onSuccess: () => approveDialog.close(),
    }
  );

  const rejectRequestMutation = useMutation(api.tasks.rejectRequest);
  const { execute: rejectRequest, isLoading: isRejecting } = useMutationWithToast(
    (args: { id: Id<"tasks">; reason?: string }) => rejectRequestMutation(args),
    {
      successMessage: "Request rejected",
      onSuccess: () => {
        rejectDialog.close();
        setRejectionReason("");
      },
    }
  );

  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteDialog.data) return;
    await deleteTask({ id: deleteDialog.data._id });
  };

  const handleApprove = async () => {
    if (!approveDialog.data) return;
    await approveRequest({ id: approveDialog.data._id });
  };

  const handleReject = async () => {
    if (!rejectDialog.data) return;
    await rejectRequest({
      id: rejectDialog.data._id,
      reason: rejectionReason.trim() || undefined,
    });
  };

  // Bulk delete using Promise.allSettled for parallel processing
  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);

    const results = await Promise.allSettled(
      selectedItems.map(task => deleteTaskMutation({ id: task._id }))
    );

    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failCount = results.filter(r => r.status === "rejected").length;

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} task${successCount > 1 ? "s" : ""}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} task${failCount > 1 ? "s" : ""}`);
    }

    setIsBulkDeleting(false);
    setBulkDeleteOpen(false);
    clearSelection();
  };

  const handleExport = () => {
    const dataToExport = selectedCount > 0 ? selectedItems : (filteredTasks || []);

    exportToCSV(dataToExport, "tasks-export", [
      { key: "title", header: "Title" },
      { key: "description", header: "Description" },
      { key: "status", header: "Status" },
      { key: "priority", header: "Priority" },
      {
        key: "organizationId",
        header: "Organization",
        formatter: (val) => val ? (orgMap.get(val as string) || "Unknown") : ""
      },
      { key: "dueDate", header: "Due Date", formatter: formatDateForExport as (val: unknown) => string },
      { key: "createdAt", header: "Created", formatter: formatDateForExport as (val: unknown) => string },
    ]);

    toast.success(`Exported ${dataToExport.length} tasks`);
  };

  const isOverdue = (dueDate?: number, status?: TaskStatus) => {
    if (!dueDate || status === "completed") return false;
    return dueDate < Date.now();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl flex items-center gap-3">
            Tasks
            {pendingRequestsCount !== undefined && pendingRequestsCount > 0 && (
              <Badge variant="warning" className="text-xs">
                {pendingRequestsCount} pending request{pendingRequestsCount > 1 ? "s" : ""}
              </Badge>
            )}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage client tasks and assignments
          </p>
        </div>
        <Dialog open={createDialog.isOpen} onOpenChange={createDialog.setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <CreateTaskDialog
            organizations={organizations || []}
            users={users || []}
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
            placeholder="Search tasks..."
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
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((opt) => (
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

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            {selectedCount} task{selectedCount > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedCount})
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {tasks === undefined ? (
        <LoadingState message="Loading tasks..." />
      ) : filteredTasks?.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description={
            searchQuery || statusFilter !== "all" || priorityFilter !== "all" || orgFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first task to get started"
          }
          action={
            <Button onClick={() => createDialog.open()} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Tasks list">
              <caption className="sr-only">
                List of tasks with status, priority, organization, and due date
              </caption>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label="Select all tasks"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Task</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Priority</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Organization</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Due Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks?.map((task) => {
                  const selected = isSelected(task._id);
                  const overdue = isOverdue(task.dueDate, task.status);
                  const isPendingRequest = task.isClientRequest && task.requestStatus === "pending_approval";
                  const isEscalated = task.escalatedAt !== undefined;
                  const reminderCount = task.remindersSent
                    ? (task.remindersSent.sevenDays ? 1 : 0) +
                      (task.remindersSent.threeDays ? 1 : 0) +
                      (task.remindersSent.oneDay ? 1 : 0) +
                      (task.remindersSent.onDue ? 1 : 0) +
                      (task.remindersSent.overdue?.length || 0)
                    : 0;

                  return (
                    <tr
                      key={task._id}
                      className={cn(
                        "border-b last:border-0 hover:bg-muted/30",
                        task.status === "completed" && "opacity-60",
                        selected && "bg-primary/5",
                        isPendingRequest && "bg-amber-50/50",
                        isEscalated && "bg-red-50/50"
                      )}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleSelection(task._id)}
                          aria-label={`Select ${task.title}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {statusIcons[task.status]}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className={cn(
                                "font-medium",
                                task.status === "completed" && "line-through text-muted-foreground"
                              )}>
                                {task.title}
                              </p>
                              {/* Client Request Badge */}
                              {isPendingRequest && (
                                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                  <HelpCircle className="h-3 w-3 mr-1" />
                                  Request
                                </Badge>
                              )}
                              {/* Escalated Badge */}
                              {isEscalated && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Escalated
                                </Badge>
                              )}
                              {/* Reminder Count */}
                              {reminderCount > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0" title={`${reminderCount} reminder(s) sent`}>
                                  <Bell className="h-3 w-3 mr-1" />
                                  {reminderCount}
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            )}
                            {/* Escalation info */}
                            {isEscalated && task.escalatedAt && (
                              <p className="text-xs text-destructive mt-1">
                                Escalated {formatDistanceToNow(task.escalatedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={
                          task.status === "completed" ? "success" :
                          task.status === "in_progress" ? "info" : "secondary"
                        }>
                          {task.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          {orgMap.get(task.organizationId.toString()) || "Unknown"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {task.dueDate ? (
                          <div className={cn(
                            "flex items-center gap-1 text-sm",
                            overdue && "text-destructive font-medium"
                          )}>
                            {overdue && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
                            <Calendar className="h-3 w-3" aria-hidden="true" />
                            {formatDate(task.dueDate)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Quick approve/reject buttons for pending requests */}
                          {isPendingRequest && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => approveDialog.open(task)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                aria-label="Approve request"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => rejectDialog.open(task)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                aria-label="Reject request"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" aria-label={`Actions for ${task.title}`}>
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isPendingRequest && (
                                <>
                                  <DropdownMenuItem onClick={() => approveDialog.open(task)} className="text-green-600">
                                    <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                                    Approve Request
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => rejectDialog.open(task)} className="text-red-600">
                                    <X className="h-4 w-4 mr-2" aria-hidden="true" />
                                    Reject Request
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => commentsDialog.open(task)}>
                                <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                                Comments
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => editDialog.open(task)}>
                                <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteDialog.open(task)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
      {tasks && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground" aria-live="polite">
          <span>Total: {tasks.length} tasks</span>
          <span>Pending: {tasks.filter(t => t.status === "pending").length}</span>
          <span>In Progress: {tasks.filter(t => t.status === "in_progress").length}</span>
          <span>Completed: {tasks.filter(t => t.status === "completed").length}</span>
          <span className="text-destructive">
            Overdue: {tasks.filter(t => isOverdue(t.dueDate, t.status)).length}
          </span>
          {pendingRequestsCount !== undefined && pendingRequestsCount > 0 && (
            <span className="text-amber-600">
              Pending Requests: {pendingRequestsCount}
            </span>
          )}
          <span className="text-destructive">
            Escalated: {tasks.filter(t => t.escalatedAt !== undefined).length}
          </span>
        </div>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={editDialog.setIsOpen}>
        {editDialog.data && (
          <EditTaskDialog
            task={editDialog.data}
            organizations={organizations || []}
            users={users || []}
            onClose={editDialog.close}
          />
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={deleteDialog.setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.data?.title}"? This action cannot be undone.
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

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Delete Tasks</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} task{selectedCount > 1 ? "s" : ""}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? <Spinner size="sm" className="mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete {selectedCount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Request Dialog */}
      <AlertDialog open={approveDialog.isOpen} onOpenChange={approveDialog.setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Approve Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Approve the client's request "{approveDialog.data?.title}"?
              This will convert the request into an active task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isApproving ? <Spinner size="sm" className="mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Request Dialog */}
      <AlertDialog open={rejectDialog.isOpen} onOpenChange={(open) => {
        rejectDialog.setIsOpen(open);
        if (!open) setRejectionReason("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              Reject Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Reject the client's request "{rejectDialog.data?.title}"?
              The client will be notified of the rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason" className="text-sm font-medium">
              Reason (optional)
            </Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this request was rejected..."
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isRejecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRejecting ? <Spinner size="sm" className="mr-2" /> : <X className="h-4 w-4 mr-2" />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comments Dialog */}
      <Dialog open={commentsDialog.isOpen} onOpenChange={commentsDialog.setIsOpen}>
        {commentsDialog.data && (
          <TaskCommentsDialog
            task={commentsDialog.data}
            onClose={commentsDialog.close}
          />
        )}
      </Dialog>
    </div>
  );
}

// Create Task Dialog
interface CreateTaskDialogProps {
  organizations: Array<{ _id: Id<"organizations">; name: string }>;
  users: Array<{ _id: Id<"users">; name: string; role: string; organizationId?: Id<"organizations"> }>;
  onClose: () => void;
}

function CreateTaskDialog({ organizations, users, onClose }: CreateTaskDialogProps) {
  const createTask = useMutation(api.tasks.create);

  const [organizationId, setOrganizationId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter users by selected organization
  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.role !== "client" ||
      (u.organizationId && u.organizationId.toString() === organizationId)
    ),
    [users, organizationId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationId || !title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTask({
        organizationId: organizationId as Id<"organizations">,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        assignedTo: assignedTo !== "none" ? assignedTo as Id<"users"> : undefined,
      });
      toast.success("Task created");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            Create a new task for a client organization
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="organization">Organization *</Label>
            <Select value={organizationId} onValueChange={(v) => {
              setOrganizationId(v);
              setAssignedTo("none"); // Reset assignee when org changes
            }}>
              <SelectTrigger id="organization">
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

          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Submit tax documents"
              maxLength={200}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about the task..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger id="priority">
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

          {organizationId && (
            <div className="grid gap-2">
              <Label htmlFor="assignedTo">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger id="assignedTo">
                  <SelectValue placeholder="Select user (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {filteredUsers.map((user) => (
                    <SelectItem key={user._id} value={user._id.toString()}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {user.name}
                        <span className="text-muted-foreground">({user.role})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            Create Task
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// Edit Task Dialog
interface EditTaskDialogProps {
  task: TaskType;
  organizations: Array<{ _id: Id<"organizations">; name: string }>;
  users: Array<{ _id: Id<"users">; name: string; role: string; organizationId?: Id<"organizations"> }>;
  onClose: () => void;
}

function EditTaskDialog({ task, organizations, users, onClose }: EditTaskDialogProps) {
  const updateTask = useMutation(api.tasks.update);
  const updateStatus = useMutation(api.tasks.updateStatus);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  );
  const [assignedTo, setAssignedTo] = useState<string>(
    task.assignedTo?.toString() || "none"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter users by task's organization
  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.role !== "client" ||
      (u.organizationId && u.organizationId.toString() === task.organizationId.toString())
    ),
    [users, task.organizationId]
  );

  const orgName = organizations.find(o => o._id.toString() === task.organizationId.toString())?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update status if changed
      if (status !== task.status) {
        await updateStatus({ id: task._id, status });
      }

      // Update other fields
      await updateTask({
        id: task._id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        assignedTo: assignedTo !== "none" ? assignedTo as Id<"users"> : undefined,
      });
      toast.success("Task updated");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task for {orgName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="editTitle">Title *</Label>
            <Input
              id="editTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="editDescription">Description</Label>
            <Textarea
              id="editDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="editStatus">Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger id="editStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editPriority">Priority *</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger id="editPriority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="editDueDate">Due Date</Label>
            <Input
              id="editDueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="editAssignedTo">Assign To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger id="editAssignedTo">
                <SelectValue placeholder="Select user (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {filteredUsers.map((user) => (
                  <SelectItem key={user._id} value={user._id.toString()}>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {user.name}
                      <span className="text-muted-foreground">({user.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {task.createdAt && (
            <p className="text-xs text-muted-foreground">
              Created {formatDistanceToNow(task.createdAt)}
              {task.completedAt && ` • Completed ${formatDistanceToNow(task.completedAt)}`}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// Task Comments Dialog
interface TaskCommentsDialogProps {
  task: TaskType;
  onClose: () => void;
}

function TaskCommentsDialog({ task, onClose }: TaskCommentsDialogProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const comments = useQuery(api.tasks.listComments, { taskId: task._id });
  const addComment = useMutation(api.tasks.addComment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const commentText = newComment.trim();
    if (!commentText) return;

    setIsSubmitting(true);
    try {
      await addComment({
        taskId: task._id,
        content: commentText,
      });
      // Only clear on successful submission
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      // Keep the comment text so user doesn't lose their input
      toast.error(error instanceof Error ? error.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Task Comments
        </DialogTitle>
        <DialogDescription>
          {task.title}
        </DialogDescription>
      </DialogHeader>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[400px] bg-muted/30 rounded-lg p-3">
        {comments === undefined ? (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mt-2">No comments yet</p>
            <p className="text-xs text-muted-foreground">Start the conversation below</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              className="bg-white rounded-lg p-3 border shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs",
                  comment.userRole === "admin" || comment.userRole === "staff"
                    ? "bg-primary"
                    : "bg-gray-400"
                )}>
                  {comment.userRole === "admin" || comment.userRole === "staff"
                    ? <Shield className="h-3 w-3" />
                    : <User className="h-3 w-3" />
                  }
                </div>
                <span className="text-sm font-medium">{comment.userName}</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  {comment.userRole}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(comment.createdAt)}
                </span>
                {comment.editedAt && (
                  <span className="text-[10px] text-muted-foreground italic">(edited)</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground pl-8">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={!newComment.trim() || isSubmitting}>
          {isSubmitting ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>

      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
