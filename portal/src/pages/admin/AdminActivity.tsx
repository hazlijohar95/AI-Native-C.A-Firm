import { useState, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  History, 
  Search,
  User,
  FileText,
  CheckSquare,
  Receipt,
  PenTool,
  Bell,
  Building2,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

const PAGE_SIZE = 20;

// Type for activity items from the API
interface ActivityItem {
  _id: Id<"activityLogs">;
  _creationTime: number;
  organizationId?: Id<"organizations">;
  userId: Id<"users">;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  createdAt: number;
  userName: string;
  userAvatar?: string;
}

export function AdminActivity() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loadedActivities, setLoadedActivities] = useState<ActivityItem[]>([]);
  
  const activityResult = useQuery(api.activity.list, { limit: PAGE_SIZE, cursor });
  const organizations = useQuery(api.organizations.list);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Determine if we're loading more data
  const isLoadingMore = cursor !== undefined && activityResult === undefined;

  // Combine loaded results with current page
  const activities = useMemo(() => {
    if (cursor === undefined) {
      return activityResult?.activities || [];
    }
    // When loading more, append new results to previously loaded
    if (activityResult?.activities) {
      return [...loadedActivities, ...activityResult.activities];
    }
    return loadedActivities;
  }, [cursor, activityResult?.activities, loadedActivities]);

  // Create org lookup map with memoization
  const orgMap = useMemo(() => 
    new Map(organizations?.map((org) => [org._id.toString(), org.name]) || []),
    [organizations]
  );

  // Filter activity with memoization
  const filteredActivity = useMemo(() => 
    activities.filter((item) => {
      const matchesSearch = 
        item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.resourceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.action.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = actionFilter === "all" || item.resourceType === actionFilter;
      return matchesSearch && matchesAction;
    }),
    [activities, searchQuery, actionFilter]
  );

  const handleLoadMore = useCallback(() => {
    if (activityResult?.hasMore && activityResult?.nextCursor) {
      // Save current activities before loading more
      setLoadedActivities(activities);
      setCursor(activityResult.nextCursor);
    }
  }, [activityResult, activities]);

  const getActionIcon = (resourceType: string) => {
    switch (resourceType) {
      case "document":
        return <FileText className="h-4 w-4" />;
      case "task":
        return <CheckSquare className="h-4 w-4" />;
      case "invoice":
        return <Receipt className="h-4 w-4" />;
      case "signature":
        return <PenTool className="h-4 w-4" />;
      case "announcement":
        return <Bell className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes("created") || action.includes("uploaded") || action.includes("issued")) {
      return <Badge className="bg-green-500 text-xs">Created</Badge>;
    }
    if (action.includes("updated") || action.includes("completed") || action.includes("signed")) {
      return <Badge className="bg-blue-500 text-xs">Updated</Badge>;
    }
    if (action.includes("deleted") || action.includes("cancelled") || action.includes("declined")) {
      return <Badge variant="destructive" className="text-xs">Removed</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Action</Badge>;
  };

  // Get the link path for a resource based on type
  const getResourceLink = (resourceType: string): string | null => {
    switch (resourceType) {
      case "document":
        return "/documents";
      case "task":
        return "/tasks";
      case "invoice":
        return "/admin/invoices";
      case "signature":
        return "/signatures";
      default:
        return null;
    }
  };

  const handleResourceClick = (resourceType: string) => {
    const link = getResourceLink(resourceType);
    if (link) {
      navigate(link);
    }
  };

  const formatAction = (action: string): string => {
    const actions: Record<string, string> = {
      uploaded_document: "uploaded document",
      deleted_document: "deleted document",
      created_task: "created task",
      completed_task: "completed task",
      updated_task: "updated task",
      deleted_task: "deleted task",
      created_draft_invoice: "created draft invoice",
      issued_invoice: "issued invoice",
      updated_draft_invoice: "updated draft invoice",
      cancelled_invoice: "cancelled invoice",
      recorded_payment: "recorded payment for",
      signed_document: "signed document",
      declined_signature: "declined signature for",
      created_signature_request: "requested signature for",
    };
    return actions[action] || action.replace(/_/g, " ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Activity Log
        </h1>
        <p className="mt-1 text-muted-foreground">
          View all activity across the portal
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activity</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="invoice">Invoices</SelectItem>
            <SelectItem value="signature">Signatures</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity List */}
      {activityResult === undefined && cursor === undefined ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredActivity.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center text-center">
            <History className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-medium">No activity found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || actionFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Activity will appear here as users interact with the portal"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredActivity.map((item) => (
            <Card key={item._id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden">
                    {item.userAvatar ? (
                      <img 
                        src={item.userAvatar} 
                        alt={item.userName}
                        className="h-10 w-10 object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Activity Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.userName}</span>
                      <span className="text-muted-foreground">{formatAction(item.action)}</span>
                      {item.resourceName && (
                        getResourceLink(item.resourceType) ? (
                          <button
                            onClick={() => handleResourceClick(item.resourceType)}
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline truncate"
                          >
                            "{item.resourceName}"
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </button>
                        ) : (
                          <span className="font-medium truncate">"{item.resourceName}"</span>
                        )
                      )}
                    </div>
                    
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      {/* Organization */}
                      {item.organizationId && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {orgMap.get(item.organizationId.toString()) || "Unknown"}
                        </span>
                      )}
                      
                      {/* Time */}
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action Type */}
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                      {getActionIcon(item.resourceType)}
                    </div>
                    {getActionBadge(item.action)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary and Load More */}
      {activities.length > 0 && (
        <div className="flex flex-col items-center gap-4">
          {activityResult?.hasMore && (
            <Button 
              variant="outline" 
              onClick={handleLoadMore}
              disabled={isLoadingMore || activityResult === undefined}
              className="gap-2"
            >
              {isLoadingMore ? (
                <Spinner size="sm" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Load More
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            Showing {filteredActivity.length} of {activities.length} loaded activity items
            {activityResult?.hasMore && " (more available)"}
          </p>
        </div>
      )}
    </div>
  );
}
