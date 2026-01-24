import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutationWithToast } from "@/hooks";
import {
  CheckSquare,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Calendar,
  Sparkles,
  MessageSquare,
  Send,
  User,
  Shield,
  Plus,
  HelpCircle,
  X,
  Loader2,
  Bell,
} from "@/lib/icons";
import { cn, formatDistanceToNow } from "@/lib/utils";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";

// Local types matching Convex schema
type TaskStatus = "pending" | "in_progress" | "completed";
type TaskPriority = "low" | "medium" | "high";
type RequestStatus = "pending_approval" | "approved" | "rejected";

const statusOptions = [
  { value: "all", label: "All Tasks" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const priorityOptions = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const priorityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-red-50", text: "text-red-700" },
  medium: { bg: "bg-amber-50", text: "text-amber-700" },
  low: { bg: "bg-gray-100", text: "text-gray-600" },
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Circle className="h-5 w-5 text-[#d1d1d6]" aria-hidden="true" />,
  in_progress: <Clock className="h-5 w-5 text-[#3b82f6]" aria-hidden="true" />,
  completed: <CheckCircle2 className="h-5 w-5 text-[#22c55e]" aria-hidden="true" />,
};

const requestStatusColors: Record<RequestStatus, { bg: string; text: string; label: string }> = {
  pending_approval: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending Approval" },
  approved: { bg: "bg-green-50", text: "text-green-700", label: "Approved" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
};

export function Tasks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const tasks = useQuery(api.tasks.list, {
    status: statusFilter === "all" ? undefined : statusFilter as TaskStatus,
    priority: priorityFilter === "all" ? undefined : priorityFilter as TaskPriority,
  });

  const selectedTask = tasks?.find(t => t._id === selectedTaskId);

  const updateStatusMutation = useMutation(api.tasks.updateStatus);
  const { execute: updateStatus } = useMutationWithToast(
    (args: { id: Id<"tasks">; status: TaskStatus }) => updateStatusMutation(args),
    {
      successMessage: "Task updated",
    }
  );

  const cancelRequestMutation = useMutation(api.tasks.cancelRequest);
  const { execute: cancelRequest } = useMutationWithToast(
    (args: { id: Id<"tasks"> }) => cancelRequestMutation(args),
    {
      successMessage: "Request cancelled",
    }
  );

  const handleStatusChange = async (taskId: Id<"tasks">, newStatus: TaskStatus) => {
    await updateStatus({ id: taskId, status: newStatus });
  };

  const handleCancelRequest = async (taskId: Id<"tasks">) => {
    await cancelRequest({ id: taskId });
  };

  const isOverdue = (dueDate?: number) => {
    if (!dueDate) return false;
    return dueDate < Date.now();
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div
        className="opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f8f8f8] border border-black/5 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#6b6b76]" />
              <span className="text-xs font-medium text-[#6b6b76]">Tasks</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#0f0f12] tracking-tight">
              Your <span className="italic text-[#6b6b76]">Tasks</span>
            </h1>
            <p className="mt-2 text-[#6b6b76]">
              View and manage your assigned tasks
            </p>
          </div>
          <Button
            onClick={() => setShowRequestDialog(true)}
            className="h-10 bg-[#253FF6] hover:bg-[#1e35d4] text-white rounded-xl text-sm font-medium shadow-sm"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Request Help
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 opacity-0"
        style={{
          animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
        }}
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#9d9da6]" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-10 bg-white border-[#EBEBEB] rounded-lg text-sm">
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
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px] h-10 bg-white border-[#EBEBEB] rounded-lg text-sm">
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

      {/* Task List */}
      {tasks === undefined ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
            <span className="text-[#9d9da6] text-sm">Loading tasks...</span>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa] opacity-0"
          style={{
            animation: "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards",
          }}
        >
          <div className="w-14 h-14 rounded-xl bg-[#22c55e]/10 flex items-center justify-center mb-4">
            <CheckSquare className="h-6 w-6 text-[#22c55e]" />
          </div>
          <p className="text-base font-medium text-[#0f0f12]">
            {statusFilter !== "all" || priorityFilter !== "all"
              ? "No tasks match your filters"
              : "You're all caught up!"}
          </p>
          <p className="text-sm text-[#9d9da6] mt-1">
            {statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your filter settings"
              : "No pending tasks at the moment"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <TaskCard
              key={task._id}
              task={task}
              index={index}
              onStatusChange={handleStatusChange}
              onSelect={() => setSelectedTaskId(task._id)}
              onCancelRequest={handleCancelRequest}
              isOverdue={isOverdue}
            />
          ))}
        </div>
      )}

      {/* Task Detail Dialog with Comments */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Request Help Dialog */}
      <RequestHelpDialog
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
      />

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Task Card Component
interface TaskCardProps {
  task: {
    _id: Id<"tasks">;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: number;
    createdAt: number;
    completedAt?: number;
    isClientRequest?: boolean;
    requestStatus?: RequestStatus;
    rejectionReason?: string;
    remindersSent?: {
      sevenDays?: number;
      threeDays?: number;
      oneDay?: number;
      onDue?: number;
      overdue?: number[];
    };
  };
  index: number;
  onStatusChange: (id: Id<"tasks">, status: TaskStatus) => void;
  onSelect: () => void;
  onCancelRequest: (id: Id<"tasks">) => void;
  isOverdue: (dueDate?: number) => boolean;
}

function TaskCard({ task, index, onStatusChange, onSelect, onCancelRequest, isOverdue }: TaskCardProps) {
  const priorityColor = priorityColors[task.priority] || priorityColors.low;
  const commentCount = useQuery(api.tasks.countComments, { taskId: task._id });

  // Check if this is a pending client request
  const isPendingRequest = task.isClientRequest && task.requestStatus === "pending_approval";
  const isRejectedRequest = task.isClientRequest && task.requestStatus === "rejected";

  // Count reminders sent
  const reminderCount = task.remindersSent
    ? (task.remindersSent.sevenDays ? 1 : 0) +
      (task.remindersSent.threeDays ? 1 : 0) +
      (task.remindersSent.oneDay ? 1 : 0) +
      (task.remindersSent.onDue ? 1 : 0) +
      (task.remindersSent.overdue?.length || 0)
    : 0;

  return (
    <div
      className={cn(
        "group bg-white rounded-2xl border border-black/5 p-5 transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06)] opacity-0",
        task.status === "completed" && "opacity-60",
        isPendingRequest && "border-amber-200 bg-amber-50/30",
        isRejectedRequest && "border-red-200 bg-red-50/30 opacity-70"
      )}
      style={{
        animation: `slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.15 + index * 0.03}s forwards`,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Status Toggle - disabled for pending/rejected requests */}
        <button
          type="button"
          onClick={() => {
            if (!isPendingRequest && !isRejectedRequest) {
              onStatusChange(
                task._id,
                task.status === "completed" ? "pending" : "completed"
              );
            }
          }}
          disabled={isPendingRequest || isRejectedRequest}
          className={cn(
            "mt-0.5 flex-shrink-0 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#253FF6] focus-visible:ring-offset-2",
            isPendingRequest || isRejectedRequest
              ? "cursor-not-allowed opacity-50"
              : "hover:scale-110"
          )}
          aria-label={`Mark task "${task.title}" as ${task.status === "completed" ? "pending" : "completed"}`}
        >
          {statusIcons[task.status]}
        </button>

        {/* Content - clickable to open details */}
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cn(
                "font-medium text-[#0f0f12] hover:text-[#253FF6] transition-colors",
                task.status === "completed" && "line-through text-[#9d9da6]"
              )}
            >
              {task.title}
            </h3>
            {/* Client Request Badge */}
            {task.isClientRequest && task.requestStatus && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                requestStatusColors[task.requestStatus].bg,
                requestStatusColors[task.requestStatus].text
              )}>
                <HelpCircle className="h-3 w-3" aria-hidden="true" />
                {requestStatusColors[task.requestStatus].label}
              </span>
            )}
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", priorityColor.bg, priorityColor.text)}>
              {task.priority}
            </span>
            {task.status !== "completed" && isOverdue(task.dueDate) && !isPendingRequest && !isRejectedRequest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-medium uppercase tracking-wide">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                Overdue
              </span>
            )}
            {/* Reminder indicator */}
            {reminderCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium" title={`${reminderCount} reminder(s) sent`}>
                <Bell className="h-3 w-3" aria-hidden="true" />
                {reminderCount}
              </span>
            )}
            {commentCount !== undefined && commentCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">
                <MessageSquare className="h-3 w-3" aria-hidden="true" />
                {commentCount}
              </span>
            )}
          </div>

          {task.description && (
            <p className="mt-1.5 text-sm text-[#6b6b76] line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Rejection reason */}
          {isRejectedRequest && task.rejectionReason && (
            <p className="mt-2 text-sm text-red-600 bg-red-50 rounded px-2 py-1">
              <span className="font-medium">Reason:</span> {task.rejectionReason}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#9d9da6]">
            {task.dueDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                Due {formatDistanceToNow(task.dueDate)}
              </div>
            )}
            <div className="font-['DM_Mono'] text-[11px]">Created {formatDistanceToNow(task.createdAt)}</div>
            {task.completedAt && (
              <div className="text-[#22c55e]">
                Completed {formatDistanceToNow(task.completedAt)}
              </div>
            )}
          </div>
        </button>

        {/* Cancel button for pending requests, or Status Select for regular tasks */}
        {isPendingRequest ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancelRequest(task._id)}
            className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        ) : task.status !== "completed" && !isRejectedRequest ? (
          <Select
            value={task.status}
            onValueChange={(value) =>
              onStatusChange(task._id, value as TaskStatus)
            }
          >
            <SelectTrigger className="w-[130px] h-9 bg-white border-[#EBEBEB] rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </div>
  );
}

// Task Detail Dialog with Comments
interface TaskDetailDialogProps {
  task: {
    _id: Id<"tasks">;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: number;
    createdAt: number;
    completedAt?: number;
  };
  onClose: () => void;
  onStatusChange: (id: Id<"tasks">, status: TaskStatus) => void;
}

function TaskDetailDialog({ task, onClose }: Omit<TaskDetailDialogProps, "onStatusChange">) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const comments = useQuery(api.tasks.listComments, { taskId: task._id });
  const addCommentMutation = useMutation(api.tasks.addComment);

  const priorityColor = priorityColors[task.priority] || priorityColors.low;

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const commentText = newComment.trim();
    if (!commentText) return;

    setIsSubmitting(true);
    try {
      await addCommentMutation({
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 -mt-2">
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", priorityColor.bg, priorityColor.text)}>
            {task.priority} priority
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium">
            {statusIcons[task.status]}
            <span className="ml-1 capitalize">{task.status.replace("_", " ")}</span>
          </span>
          {task.dueDate && (
            <span className="text-xs text-muted-foreground">
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
        )}

        {/* Comments Section */}
        <div className="flex-1 overflow-hidden flex flex-col mt-4">
          <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4" />
            Discussion
            {comments && comments.length > 0 && (
              <span className="text-muted-foreground">({comments.length})</span>
            )}
          </h4>

          <div className="flex-1 overflow-y-auto space-y-3 min-h-[150px] max-h-[300px] bg-muted/30 rounded-lg p-3">
            {comments === undefined ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
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
                        ? "bg-[#253FF6]"
                        : "bg-gray-400"
                    )}>
                      {comment.userRole === "admin" || comment.userRole === "staff"
                        ? <Shield className="h-3 w-3" />
                        : <User className="h-3 w-3" />
                      }
                    </div>
                    <span className="text-sm font-medium">{comment.userName}</span>
                    <span className="text-[10px] text-muted-foreground font-['DM_Mono']">
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
            <div ref={commentsEndRef} />
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleSubmitComment} className="mt-3 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 h-10 px-3 rounded-lg border border-[#EBEBEB] text-sm focus:outline-none focus:ring-2 focus:ring-[#253FF6] focus:border-transparent"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="h-10 px-4 bg-[#0f0f12] hover:bg-[#1a1a1f] text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Request Help Dialog
interface RequestHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

function RequestHelpDialog({ open, onClose }: RequestHelpDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRequestMutation = useMutation(api.tasks.createRequest);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsSubmitting(true);
    try {
      await createRequestMutation({
        title: trimmedTitle,
        description: description.trim() || undefined,
      });
      toast.success("Help request submitted! Our team will review it shortly.");
      setTitle("");
      setDescription("");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle("");
      setDescription("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#253FF6]" />
            Request Help
          </DialogTitle>
          <DialogDescription className="text-[#6b6b76]">
            Need assistance with something? Submit a request and our team will review it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label htmlFor="request-title" className="block text-sm font-medium text-[#0f0f12] mb-1.5">
              What do you need help with? <span className="text-red-500">*</span>
            </label>
            <input
              id="request-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Need help with tax documents"
              className="w-full h-10 px-3 rounded-lg border border-[#EBEBEB] text-sm focus:outline-none focus:ring-2 focus:ring-[#253FF6] focus:border-transparent"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label htmlFor="request-description" className="block text-sm font-medium text-[#0f0f12] mb-1.5">
              Additional details <span className="text-[#9d9da6]">(optional)</span>
            </label>
            <textarea
              id="request-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional context that might help us assist you better..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-[#EBEBEB] text-sm focus:outline-none focus:ring-2 focus:ring-[#253FF6] focus:border-transparent resize-none"
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="bg-[#253FF6] hover:bg-[#1e35d4] text-white rounded-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
