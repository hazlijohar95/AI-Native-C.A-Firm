import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Calendar,
} from "lucide-react";
import { cn, formatDistanceToNow } from "@/lib/utils";

import type { Id } from "../../convex/_generated/dataModel";

type TaskStatus = "pending" | "in_progress" | "completed";
type TaskPriority = "low" | "medium" | "high";

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

const priorityColors: Record<string, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-gray-400" aria-hidden="true" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" aria-hidden="true" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />,
};

export function Tasks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const tasks = useQuery(api.tasks.list, {
    status: statusFilter === "all" ? undefined : statusFilter as TaskStatus,
    priority: priorityFilter === "all" ? undefined : priorityFilter as TaskPriority,
  });

  const updateStatus = useMutation(api.tasks.updateStatus);

  const handleStatusChange = async (taskId: Id<"tasks">, newStatus: TaskStatus) => {
    try {
      await updateStatus({ id: taskId, status: newStatus });
      toast.success("Task updated", {
        description: newStatus === "completed" ? "Task marked as completed" : `Status changed to ${newStatus.replace("_", " ")}`,
      });
    } catch (error) {
      toast.error("Failed to update task", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const isOverdue = (dueDate?: number) => {
    if (!dueDate) return false;
    return dueDate < Date.now();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your assigned tasks
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
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

      {/* Task List */}
      {tasks === undefined ? (
        <div className="flex h-64 items-center justify-center" aria-live="polite" aria-busy="true">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center">
            <CheckSquare className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-lg font-medium">No tasks</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter !== "all" || priorityFilter !== "all"
                ? "No tasks match your filters"
                : "You're all caught up!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card
              key={task._id}
              className={cn(
                "transition-shadow hover:shadow-md",
                task.status === "completed" && "opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Status Toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        task._id,
                        task.status === "completed" ? "pending" : "completed"
                      )
                    }
                    className="mt-0.5 flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`Mark task "${task.title}" as ${task.status === "completed" ? "pending" : "completed"}`}
                  >
                    {statusIcons[task.status]}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={cn(
                          "font-medium",
                          task.status === "completed" && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </h3>
                      <Badge variant={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                      {task.status !== "completed" && isOverdue(task.dueDate) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          Overdue
                        </Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          Due {formatDistanceToNow(task.dueDate)}
                        </div>
                      )}
                      <div>Created {formatDistanceToNow(task.createdAt)}</div>
                      {task.completedAt && (
                        <div className="text-green-600">
                          Completed {formatDistanceToNow(task.completedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Select */}
                  {task.status !== "completed" && (
                    <Select
                      value={task.status}
                      onValueChange={(value) =>
                        handleStatusChange(task._id, value as TaskStatus)
                      }
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
