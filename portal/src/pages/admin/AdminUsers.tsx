import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Search,
  Edit,
  User,
  Building2,
  Clock,
  Shield,
  UserX,
  UserCheck,
  MoreHorizontal,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate, formatDistanceToNow } from "@/lib/utils";
import { useBulkSelection, exportToCSV, formatDateTimeForExport } from "@/lib/bulk-actions";
import { UserRoleBadge, UserStatusBadge, type UserRole } from "@/components/status-badges";
import type { Id } from "../../../convex/_generated/dataModel";

// Type for user from API
type UserType = {
  _id: Id<"users">;
  workosId: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: Id<"organizations">;
  avatarUrl?: string;
  lastLoginAt?: number;
  createdAt: number;
  isActive?: boolean;
  deactivatedAt?: number;
  deactivatedBy?: Id<"users">;
  deactivationReason?: string;
};

export function AdminUsers() {
  const users = useQuery(api.users.list);
  const organizations = useQuery(api.organizations.list);
  const currentUser = useQuery(api.users.getCurrentUser);
  const deactivateUser = useMutation(api.users.deactivate);
  const reactivateUser = useMutation(api.users.reactivate);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<UserType | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);

  // Create org lookup map with memoization
  const orgMap = useMemo(() => 
    new Map(organizations?.map((org) => [org._id.toString(), org.name]) || []),
    [organizations]
  );

  // Filter users with memoization
  const filteredUsers = useMemo(() => 
    users?.filter((user) => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const isActive = user.isActive !== false;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && isActive) || 
        (statusFilter === "deactivated" && !isActive);
      return matchesSearch && matchesRole && matchesStatus;
    }),
    [users, searchQuery, roleFilter, statusFilter]
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
  } = useBulkSelection(filteredUsers);

  const handleDeactivate = async () => {
    if (!deactivatingUser) return;
    setIsDeactivating(true);
    try {
      await deactivateUser({ 
        userId: deactivatingUser._id, 
        reason: deactivationReason.trim() || undefined 
      });
      toast.success(`${deactivatingUser.name} has been deactivated`);
      setDeactivatingUser(null);
      setDeactivationReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deactivate user");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async (user: UserType) => {
    try {
      await reactivateUser({ userId: user._id });
      toast.success(`${user.name} has been reactivated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reactivate user");
    }
  };

  const handleBulkDeactivate = async () => {
    setIsBulkDeactivating(true);
    let successCount = 0;
    let failCount = 0;

    for (const user of selectedItems) {
      if (canDeactivate(user)) {
        try {
          await deactivateUser({ userId: user._id });
          successCount++;
        } catch {
          failCount++;
        }
      }
    }

    if (successCount > 0) {
      toast.success(`Deactivated ${successCount} user${successCount > 1 ? "s" : ""}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to deactivate ${failCount} user${failCount > 1 ? "s" : ""}`);
    }

    setIsBulkDeactivating(false);
    setBulkDeactivateOpen(false);
    clearSelection();
  };

  const handleExport = () => {
    const dataToExport = selectedCount > 0 ? selectedItems : (filteredUsers || []);
    
    exportToCSV(dataToExport, "users-export", [
      { key: "name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "role", header: "Role" },
      { 
        key: "organizationId", 
        header: "Organization",
        formatter: (val) => val ? (orgMap.get(val as string) || "Unknown") : ""
      },
      { 
        key: "isActive", 
        header: "Status",
        formatter: (val) => val !== false ? "Active" : "Deactivated"
      },
      { key: "lastLoginAt", header: "Last Login", formatter: formatDateTimeForExport as (val: unknown) => string },
      { key: "createdAt", header: "Created", formatter: formatDateTimeForExport as (val: unknown) => string },
    ]);

    toast.success(`Exported ${dataToExport.length} users`);
  };

  const canDeactivate = (user: UserType) => {
    // Can't deactivate yourself
    if (currentUser && user._id === currentUser._id) return false;
    // Can't deactivate admins
    if (user.role === "admin") return false;
    // Can't deactivate already deactivated users
    if (user.isActive === false) return false;
    return true;
  };

  // Count how many selected can be deactivated
  const deactivatableCount = selectedItems.filter(canDeactivate).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Users
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage portal users and their roles
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
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
            {selectedCount} user{selectedCount > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            {deactivatableCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeactivateOpen(true)}
                className="gap-1"
              >
                <UserX className="h-4 w-4" />
                Deactivate ({deactivatableCount})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Users List */}
      {users === undefined ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredUsers?.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-medium">No users found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || roleFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Users will appear here when they sign up"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Users list">
              <caption className="sr-only">
                List of portal users with their roles, status, and organization assignments
              </caption>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label="Select all users"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Organization</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Login</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers?.map((user) => {
                  const isActive = user.isActive !== false;
                  const selected = isSelected(user._id);
                  return (
                  <tr 
                    key={user._id} 
                    className={`border-b last:border-0 hover:bg-muted/30 ${!isActive ? "opacity-60" : ""} ${selected ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleSelection(user._id)}
                        aria-label={`Select ${user.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted overflow-hidden">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt=""
                              className="h-10 w-10 object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <UserRoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <UserStatusBadge isActive={isActive} />
                    </td>
                    <td className="px-4 py-3">
                      {user.organizationId ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          {orgMap.get(user.organizationId.toString()) || "Unknown"}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {user.lastLoginAt 
                          ? formatDistanceToNow(user.lastLoginAt)
                          : "Never"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label={`Actions for ${user.name}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingUser(user)}>
                            <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {isActive ? (
                            <DropdownMenuItem 
                              onClick={() => setDeactivatingUser(user)}
                              disabled={!canDeactivate(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <UserX className="h-4 w-4 mr-2" aria-hidden="true" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleReactivate(user)}>
                              <UserCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      {users && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground" aria-live="polite">
          <span>Total: {users.length} users</span>
          <span>Admins: {users.filter(u => u.role === "admin").length}</span>
          <span>Staff: {users.filter(u => u.role === "staff").length}</span>
          <span>Clients: {users.filter(u => u.role === "client").length}</span>
          <span>Active: {users.filter(u => u.isActive !== false).length}</span>
          <span>Deactivated: {users.filter(u => u.isActive === false).length}</span>
        </div>
      )}

      {/* Edit User Dialog - Rendered once outside the table */}
      <Dialog 
        open={!!editingUser} 
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        {editingUser && (
          <UserEditDialog 
            user={editingUser}
            organizations={organizations || []}
            onClose={() => setEditingUser(null)} 
          />
        )}
      </Dialog>

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog 
        open={!!deactivatingUser} 
        onOpenChange={(open) => {
          if (!open) {
            setDeactivatingUser(null);
            setDeactivationReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deactivatingUser?.name}</strong>? 
              They will no longer be able to access the portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for deactivation..."
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeactivating ? <Spinner size="sm" className="mr-2" /> : <UserX className="h-4 w-4 mr-2" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Deactivation Dialog */}
      <AlertDialog open={bulkDeactivateOpen} onOpenChange={setBulkDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Deactivate Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deactivatableCount} user{deactivatableCount > 1 ? "s" : ""}? 
              They will no longer be able to access the portal.
              {selectedCount > deactivatableCount && (
                <span className="block mt-2 text-amber-600">
                  Note: {selectedCount - deactivatableCount} selected user{selectedCount - deactivatableCount > 1 ? "s" : ""} cannot be deactivated (admins or already deactivated).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeactivate}
              disabled={isBulkDeactivating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeactivating ? <Spinner size="sm" className="mr-2" /> : <UserX className="h-4 w-4 mr-2" />}
              Deactivate {deactivatableCount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface UserEditDialogProps {
  user: {
    _id: Id<"users">;
    name: string;
    email: string;
    role: UserRole;
    organizationId?: Id<"organizations">;
    avatarUrl?: string;
    lastLoginAt?: number;
    createdAt: number;
  };
  organizations: Array<{
    _id: Id<"organizations">;
    name: string;
  }>;
  onClose: () => void;
}

function UserEditDialog({ user, organizations, onClose }: UserEditDialogProps) {
  const updateRole = useMutation(api.users.updateRole);
  const assignToOrg = useMutation(api.users.assignToOrganization);
  const removeFromOrg = useMutation(api.users.removeFromOrganization);
  
  const [role, setRole] = useState<UserRole>(user.role);
  const [organizationId, setOrganizationId] = useState<string>(
    user.organizationId?.toString() || "none"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when user changes
  useEffect(() => {
    setRole(user.role);
    setOrganizationId(user.organizationId?.toString() || "none");
    setIsSubmitting(false);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Update role if changed
      if (role !== user.role) {
        await updateRole({ userId: user._id, role });
      }

      // Update organization if changed
      const newOrgId = organizationId === "none" ? undefined : organizationId;
      const currentOrgId = user.organizationId?.toString();
      
      if (newOrgId !== currentOrgId) {
        if (newOrgId) {
          await assignToOrg({ 
            userId: user._id, 
            organizationId: newOrgId as Id<"organizations">
          });
        } else {
          // Remove from organization
          await removeFromOrg({ userId: user._id });
        }
      }

      toast.success("User updated");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user role and organization assignment
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* User info (read-only) */}
          <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted overflow-hidden">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name}
                  className="h-12 w-12 object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3 inline mr-1" />
                Joined {formatDate(user.createdAt)}
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">
              <Shield className="h-4 w-4 inline mr-1" />
              Role
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Admins have full access. Staff can manage clients. Clients can only view their own data.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="organization">
              <Building2 className="h-4 w-4 inline mr-1" />
              Organization
            </Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger id="organization">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Organization</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org._id} value={org._id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Assign client users to their organization to give them access to documents and tasks.
            </p>
          </div>
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
