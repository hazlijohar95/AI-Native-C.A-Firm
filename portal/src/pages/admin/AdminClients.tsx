import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Building2,
  Plus,
  Mail,
  Phone,
  MapPin,
  Hash,
  Search,
  Edit,
  Trash,
} from "@/lib/icons";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

export function AdminClients() {
  const organizations = useQuery(api.organizations.list);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<(typeof organizations extends (infer T)[] | undefined ? T : never) | null>(null);

  // Filter organizations by search query
  const filteredOrgs = organizations?.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Organizations
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage client organizations
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Organization
            </Button>
          </DialogTrigger>
          <OrganizationDialog 
            onClose={() => setIsCreateOpen(false)} 
          />
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Organizations List */}
      {organizations === undefined ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredOrgs?.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-medium">No organizations found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Create your first organization to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrgs?.map((org) => (
            <Card key={org._id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{org.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Added {formatDate(org.createdAt)}
                      </CardDescription>
                    </div>
                  </div>
                  <Dialog open={editingOrg?._id === org._id} onOpenChange={(open) => !open && setEditingOrg(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setEditingOrg(org)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <OrganizationDialog 
                      organization={org}
                      onClose={() => setEditingOrg(null)} 
                    />
                  </Dialog>
                  <DeleteOrganizationButton id={org._id} name={org.name} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{org.email}</span>
                </div>
                {org.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{org.phone}</span>
                  </div>
                )}
                {org.registrationNumber && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span>{org.registrationNumber}</span>
                  </div>
                )}
                {org.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{org.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface OrganizationDialogProps {
  organization?: {
    _id: Id<"organizations">;
    name: string;
    email: string;
    phone?: string;
    registrationNumber?: string;
    address?: string;
  };
  onClose: () => void;
}

function OrganizationDialog({ organization, onClose }: OrganizationDialogProps) {
  const createOrg = useMutation(api.organizations.create);
  const updateOrg = useMutation(api.organizations.update);
  
  const [name, setName] = useState(organization?.name || "");
  const [email, setEmail] = useState(organization?.email || "");
  const [phone, setPhone] = useState(organization?.phone || "");
  const [registrationNumber, setRegistrationNumber] = useState(organization?.registrationNumber || "");
  const [address, setAddress] = useState(organization?.address || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!organization;

  // Reset form when organization changes (opening new dialog)
  useEffect(() => {
    setName(organization?.name || "");
    setEmail(organization?.email || "");
    setPhone(organization?.phone || "");
    setRegistrationNumber(organization?.registrationNumber || "");
    setAddress(organization?.address || "");
    setIsSubmitting(false);
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateOrg({
          id: organization._id,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          registrationNumber: registrationNumber.trim() || undefined,
          address: address.trim() || undefined,
        });
        toast.success("Organization updated");
      } else {
        await createOrg({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          registrationNumber: registrationNumber.trim() || undefined,
          address: address.trim() || undefined,
        });
        toast.success("Organization created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Organization" : "Add Organization"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update organization details" : "Create a new client organization"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Sdn Bhd"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@acme.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+60 3-1234 5678"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="regNumber">Registration Number</Label>
            <Input
              id="regNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="202301012345 (1234567-A)"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Jalan Example, 50000 Kuala Lumpur"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            {isEditing ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function DeleteOrganizationButton({ id, name }: { id: Id<"organizations">; name: string }) {
  const removeOrg = useMutation(api.organizations.remove);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeOrg({ id });
      toast.success(`"${name}" deleted`);
    } catch (error) {
      // Show the specific error message from the backend
      const message = error instanceof Error ? error.message : "Failed to delete organization";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{name}". This action cannot be undone.
            <br /><br />
            <strong>Note:</strong> Organizations with users, documents, tasks, invoices, or signature requests cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? <Spinner size="sm" className="mr-2" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
