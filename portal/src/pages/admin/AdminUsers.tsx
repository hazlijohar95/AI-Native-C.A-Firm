import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
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
  Users, 
  Search,
  Edit,
  User,
  Building2,
  Clock,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDistanceToNow } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

type UserRole = "admin" | "staff" | "client";

export function AdminUsers() {
  const users = useQuery(api.users.list);
  const organizations = useQuery(api.organizations.list);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<(typeof users extends (infer T)[] | undefined ? T : never) | null>(null);

  // Filter users
  const filteredUsers = users?.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Create org lookup map
  const orgMap = new Map(
    organizations?.map((org) => [org._id.toString(), org.name]) || []
  );

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "admin": return "default";
      case "staff": return "secondary";
      case "client": return "outline";
    }
  };

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
      <div className="flex flex-col gap-4 sm:flex-row">
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
      </div>

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
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Organization</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Login</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers?.map((user) => (
                  <tr key={user._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted overflow-hidden">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt={user.name}
                              className="h-10 w-10 object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {user.organizationId ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
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
                      <Dialog 
                        open={editingUser?._id === user._id} 
                        onOpenChange={(open) => !open && setEditingUser(null)}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <UserEditDialog 
                          user={user}
                          organizations={organizations || []}
                          onClose={() => setEditingUser(null)} 
                        />
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {users && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Total: {users.length} users</span>
          <span>Admins: {users.filter(u => u.role === "admin").length}</span>
          <span>Staff: {users.filter(u => u.role === "staff").length}</span>
          <span>Clients: {users.filter(u => u.role === "client").length}</span>
        </div>
      )}
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
