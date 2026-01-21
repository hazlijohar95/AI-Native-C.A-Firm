import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Megaphone,
  AlertTriangle,
  Calendar,
  Newspaper,
  Pin,
  Check,
} from "lucide-react";
import { cn, formatDistanceToNow } from "@/lib/utils";

const typeIcons: Record<string, React.ReactNode> = {
  general: <Megaphone className="h-5 w-5 text-blue-500" />,
  tax_update: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  deadline: <Calendar className="h-5 w-5 text-red-500" />,
  news: <Newspaper className="h-5 w-5 text-green-500" />,
};

const typeLabels: Record<string, string> = {
  general: "General",
  tax_update: "Tax Update",
  deadline: "Deadline",
  news: "News",
};

const typeBadgeVariants: Record<string, "info" | "warning" | "destructive" | "success"> = {
  general: "info",
  tax_update: "warning",
  deadline: "destructive",
  news: "success",
};

export function Announcements() {
  const announcements = useQuery(api.announcements.list, {});
  const markRead = useMutation(api.announcements.markRead);

  const handleMarkRead = async (id: string) => {
    await markRead({ id: id as any });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Important updates from Amjad & Hazli
        </p>
      </div>

      {/* Announcements List */}
      {announcements === undefined ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No announcements</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back later for updates
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card
              key={announcement._id}
              className={cn(
                "transition-all",
                !announcement.isRead && "border-l-4 border-l-primary bg-primary/5",
                announcement.isPinned && "ring-1 ring-amber-300"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {typeIcons[announcement.type]}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">
                          {announcement.title}
                        </CardTitle>
                        {announcement.isPinned && (
                          <Pin className="h-4 w-4 text-amber-500" />
                        )}
                        <Badge variant={typeBadgeVariants[announcement.type]}>
                          {typeLabels[announcement.type]}
                        </Badge>
                        {!announcement.isRead && (
                          <Badge variant="default" className="bg-primary">
                            New
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        Posted {formatDistanceToNow(announcement.publishedAt)}
                      </CardDescription>
                    </div>
                  </div>

                  {!announcement.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => handleMarkRead(announcement._id)}
                    >
                      <Check className="h-3 w-3" />
                      Mark as read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {announcement.content.split("\n").map((paragraph, i) => (
                    <p key={i} className="mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {announcement.expiresAt && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Expires {formatDistanceToNow(announcement.expiresAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
