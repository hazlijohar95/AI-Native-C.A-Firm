import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import {
  Calculator,
  Receipt,
  Lightbulb,
  Building2,
  Users,
  FileText,
  Plus,
  Edit,
  Trash2,
  Settings,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
} from "@/lib/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Id, Doc } from "../../../convex/_generated/dataModel";

// Icon options for services
const iconOptions = [
  { value: "Calculator", label: "Calculator", icon: Calculator },
  { value: "Receipt", label: "Receipt", icon: Receipt },
  { value: "Lightbulb", label: "Lightbulb", icon: Lightbulb },
  { value: "Building2", label: "Building", icon: Building2 },
  { value: "Users", label: "Users", icon: Users },
  { value: "FileText", label: "Document", icon: FileText },
];

// Color options for services
const colorOptions = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "emerald", label: "Green", class: "bg-emerald-500" },
  { value: "violet", label: "Purple", class: "bg-violet-500" },
  { value: "amber", label: "Orange", class: "bg-amber-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
  { value: "gray", label: "Gray", class: "bg-gray-500" },
];

export function AdminServices() {
  const [editingService, setEditingService] = useState<Doc<"serviceTypes"> | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteService, setDeleteService] = useState<Doc<"serviceTypes"> | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"organizations"> | "all">("all");

  // Queries
  const serviceTypes = useQuery(api.serviceTypes.list, {});
  const organizations = useQuery(api.organizations.list);

  // Mutations
  const toggleServiceActive = useMutation(api.serviceTypes.toggleActive);
  const removeServiceType = useMutation(api.serviceTypes.remove);
  const seedServices = useMutation(api.serviceTypes.seedDefaultServiceTypes);

  const handleSeedServices = async () => {
    try {
      await seedServices({});
      toast.success("Default service types created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create services");
    }
  };

  const handleToggleActive = async (serviceId: Id<"serviceTypes">) => {
    try {
      await toggleServiceActive({ id: serviceId });
      toast.success("Service status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update service");
    }
  };

  const handleDelete = async () => {
    if (!deleteService) return;
    try {
      await removeServiceType({ id: deleteService._id });
      toast.success("Service deleted");
      setDeleteService(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete service");
    }
  };

  const isLoading = !serviceTypes || !organizations;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between motion-safe-slide-up">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#2B3A55] tracking-tight">
            Service <span className="italic text-[#B8986B]">Management</span>
          </h1>
          <p className="mt-2 text-[#6b6b76]">
            Manage service types and client subscriptions
          </p>
        </div>

        <div className="flex gap-2">
          {serviceTypes?.length === 0 && (
            <Button variant="outline" onClick={handleSeedServices}>
              <Sparkles className="h-4 w-4 mr-2" />
              Create Default Services
            </Button>
          )}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service Type
          </Button>
        </div>
      </div>

      {/* Service Types Grid */}
      <div className="motion-safe-slide-up motion-safe-slide-up-delay-2">
        <h2 className="font-serif text-xl text-[#0f0f12] mb-4">Service Types</h2>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#e5e5e7] border-t-[#0f0f12] rounded-full animate-spin" />
              <span className="text-[#9d9da6] text-sm">Loading services...</span>
            </div>
          </div>
        ) : serviceTypes.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa]">
            <div className="w-14 h-14 rounded-xl bg-[#e5e5e7] flex items-center justify-center mb-4">
              <LayoutGrid className="h-6 w-6 text-[#6b6b76]" />
            </div>
            <p className="text-base font-medium text-[#0f0f12]">No service types yet</p>
            <p className="text-sm text-[#9d9da6] mt-1 mb-4">
              Create your first service type or seed default services
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serviceTypes.map((service, index) => (
              <ServiceTypeCard
                key={service._id}
                service={service}
                onEdit={() => setEditingService(service)}
                onDelete={() => setDeleteService(service)}
                onToggleActive={() => handleToggleActive(service._id)}
                delay={0.1 + index * 0.05}
              />
            ))}
          </div>
        )}
      </div>

      {/* Organization Subscriptions */}
      <div className="motion-safe-slide-up motion-safe-slide-up-delay-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="font-serif text-xl text-[#0f0f12]">Client Subscriptions</h2>
          <Select
            value={selectedOrgId as string}
            onValueChange={(v) => setSelectedOrgId(v as Id<"organizations"> | "all")}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {organizations?.map((org) => (
                <SelectItem key={org._id} value={org._id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {organizations && organizations.length > 0 ? (
          <div className="space-y-4">
            {organizations
              .filter((org) => selectedOrgId === "all" || org._id === selectedOrgId)
              .map((org) => (
                <OrganizationSubscriptions
                  key={org._id}
                  organization={org}
                  serviceTypes={serviceTypes || []}
                />
              ))}
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e7] bg-[#fafafa]">
            <p className="text-sm text-[#6b6b76]">No client organizations yet</p>
          </div>
        )}
      </div>

      {/* Create/Edit Service Dialog */}
      <ServiceTypeDialog
        open={createDialogOpen || !!editingService}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingService(null);
          }
        }}
        service={editingService}
        onSuccess={() => {
          setCreateDialogOpen(false);
          setEditingService(null);
          toast.success(editingService ? "Service updated" : "Service created");
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteService} onOpenChange={(open) => !open && setDeleteService(null)}>
        <AlertDialogContent className="bg-white border border-[#EBEBEB] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-[#0f0f12]">
              Delete Service Type
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#6b6b76]">
              Are you sure you want to delete "{deleteService?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-10 px-5 rounded-lg border-[#EBEBEB]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-10 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// Service Type Card
interface ServiceTypeCardProps {
  service: Doc<"serviceTypes">;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  delay: number;
}

function ServiceTypeCard({ service, onEdit, onDelete, onToggleActive, delay }: ServiceTypeCardProps) {
  const IconComponent = iconOptions.find((i) => i.value === service.icon)?.icon || FileText;
  const colorClass = colorOptions.find((c) => c.value === service.color)?.class || "bg-gray-500";

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border p-5 transition-all duration-200 motion-safe-slide-up motion-safe-slide-up-delay-2",
        service.isActive ? "border-black/5" : "border-red-200 bg-red-50/30"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorClass)}>
          <IconComponent className="h-6 w-6 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium",
              service.isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            )}
          >
            {service.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <h3 className="font-medium text-[#0f0f12] mb-1">{service.name}</h3>
      <p className="text-xs text-[#6b6b76] mb-4 line-clamp-2">
        {service.description || `Code: ${service.code}`}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-black/5">
        <Switch checked={service.isActive} onCheckedChange={onToggleActive} />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Service Type Create/Edit Dialog
interface ServiceTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Doc<"serviceTypes"> | null;
  onSuccess: () => void;
}

function ServiceTypeDialog({ open, onOpenChange, service, onSuccess }: ServiceTypeDialogProps) {
  const [code, setCode] = useState(service?.code || "");
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [icon, setIcon] = useState(service?.icon || "FileText");
  const [color, setColor] = useState(service?.color || "gray");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createServiceType = useMutation(api.serviceTypes.create);
  const updateServiceType = useMutation(api.serviceTypes.update);

  // Reset form when service changes or dialog opens
  useEffect(() => {
    if (open) {
      if (service) {
        setCode(service.code);
        setName(service.name);
        setDescription(service.description || "");
        setIcon(service.icon);
        setColor(service.color);
      } else {
        setCode("");
        setName("");
        setDescription("");
        setIcon("FileText");
        setColor("gray");
      }
    }
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    setIsSubmitting(true);
    try {
      if (service) {
        await updateServiceType({
          id: service._id,
          name: name.trim(),
          description: description.trim() || undefined,
          icon,
          color,
        });
      } else {
        await createServiceType({
          code: code.trim().toLowerCase(),
          name: name.trim(),
          description: description.trim() || undefined,
          icon,
          color,
          displayOrder: 99, // Will be placed at end
        });
      }
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save service");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {service ? "Edit Service Type" : "Create Service Type"}
          </DialogTitle>
          <DialogDescription>
            {service ? "Update the service type details" : "Create a new service type for your clients"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!service && (
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., accounting"
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, no spaces)
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Accounting Services"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this service..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 pt-2">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setColor(opt.value)}
                    className={cn(
                      "w-8 h-8 rounded-lg transition-all",
                      opt.class,
                      color === opt.value
                        ? "ring-2 ring-offset-2 ring-[#0f0f12]"
                        : "opacity-60 hover:opacity-100"
                    )}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!code.trim() || !name.trim() || isSubmitting}>
              {isSubmitting ? "Saving..." : service ? "Save Changes" : "Create Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Organization Subscriptions Component
interface OrganizationSubscriptionsProps {
  organization: Doc<"organizations">;
  serviceTypes: Doc<"serviceTypes">[];
}

function OrganizationSubscriptions({ organization, serviceTypes }: OrganizationSubscriptionsProps) {
  const subscriptions = useQuery(api.subscriptions.listByOrganization, {
    organizationId: organization._id,
  });

  const subscribe = useMutation(api.subscriptions.subscribe);
  const unsubscribe = useMutation(api.subscriptions.unsubscribe);

  const handleToggle = async (serviceTypeId: Id<"serviceTypes">, isCurrentlySubscribed: boolean) => {
    try {
      if (isCurrentlySubscribed) {
        await unsubscribe({ organizationId: organization._id, serviceTypeId });
        toast.success("Subscription removed");
      } else {
        await subscribe({ organizationId: organization._id, serviceTypeId });
        toast.success("Subscription added");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update subscription");
    }
  };

  const subscribedServiceIds = new Set(
    subscriptions?.filter((s) => s.status === "active").map((s) => s.serviceTypeId.toString()) || []
  );

  return (
    <div className="bg-white rounded-xl border border-black/5 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#f8f8f8] flex items-center justify-center">
          <Building2 className="h-5 w-5 text-[#6b6b76]" />
        </div>
        <div>
          <h3 className="font-medium text-[#0f0f12]">{organization.name}</h3>
          <p className="text-xs text-[#6b6b76]">
            {subscribedServiceIds.size} of {serviceTypes.filter((s) => s.isActive).length} services active
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {serviceTypes
          .filter((s) => s.isActive)
          .map((service) => {
            const isSubscribed = subscribedServiceIds.has(service._id.toString());
            const IconComponent = iconOptions.find((i) => i.value === service.icon)?.icon || FileText;
            const colorClass = colorOptions.find((c) => c.value === service.color)?.class || "bg-gray-500";

            return (
              <button
                key={service._id}
                onClick={() => handleToggle(service._id, isSubscribed)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  isSubscribed
                    ? cn(colorClass, "text-white")
                    : "bg-[#f8f8f8] text-[#6b6b76] border border-[#EBEBEB] hover:border-[#0f0f12]"
                )}
              >
                {isSubscribed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <IconComponent className="h-4 w-4" />
                )}
                {service.name}
              </button>
            );
          })}
      </div>
    </div>
  );
}
