import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  FileText,
  CheckSquare,
  Megaphone,
  Receipt,
  CheckCheck,
} from "@/lib/icons";
import { cn, formatDistanceToNow } from "@/lib/utils";

const typeIcons: Record<string, React.ReactNode> = {
  new_document: <FileText className="h-4 w-4 text-blue-500" />,
  new_task: <CheckSquare className="h-4 w-4 text-amber-500" />,
  task_due: <CheckSquare className="h-4 w-4 text-red-500" />,
  task_completed: <CheckSquare className="h-4 w-4 text-green-500" />,
  new_announcement: <Megaphone className="h-4 w-4 text-purple-500" />,
  invoice_due: <Receipt className="h-4 w-4 text-red-500" />,
  payment_received: <Receipt className="h-4 w-4 text-green-500" />,
  system: <Bell className="h-4 w-4 text-gray-500" />,
};

export function NotificationBell() {
  const navigate = useNavigate();
  const notifications = useQuery(api.notifications.list, { limit: 10 });
  const unreadCount = useQuery(api.notifications.countUnread);
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const handleNotificationClick = async (notification: {
    _id: string;
    link?: string;
    isRead: boolean;
  }) => {
    if (!notification.isRead) {
      await markRead({ id: notification._id as any });
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount !== undefined && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications === undefined ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification._id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 p-3",
                  !notification.isRead && "bg-primary/5"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {typeIcons[notification.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm",
                    !notification.isRead && "font-medium"
                  )}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(notification.createdAt)}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
