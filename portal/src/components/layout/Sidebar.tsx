import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Bell, 
  Receipt, 
  PenTool,
  Settings,
  X,
  Building2,
  Users,
  Shield,
  History,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const clientNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Announcements", href: "/announcements", icon: Bell },
  { name: "Invoices", href: "/invoices", icon: Receipt },
  { name: "Signatures", href: "/signatures", icon: PenTool },
];

const adminNavigation = [
  { name: "Admin Dashboard", href: "/admin", icon: Shield },
  { name: "Organizations", href: "/admin/organizations", icon: Building2 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Invoices", href: "/admin/invoices", icon: Receipt },
  { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { name: "Activity Log", href: "/admin/activity", icon: History },
];

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  // Handle Escape key to close mobile sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <>
      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Mobile navigation"
        aria-hidden={!open}
      >
        <SidebarContent onClose={onClose} showCloseButton />
      </aside>

      {/* Desktop sidebar */}
      <aside 
        className="hidden lg:flex lg:w-64 lg:flex-col"
        aria-label="Main navigation"
      >
        <div className="flex min-h-0 flex-1 flex-col border-r bg-white">
          <SidebarContent />
        </div>
      </aside>
    </>
  );
}

interface SidebarContentProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

function SidebarContent({ onClose, showCloseButton }: SidebarContentProps) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "staff";

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            A&H
          </div>
          <span className="font-semibold">Amjad & Hazli</span>
        </div>
        {showCloseButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Client Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto" aria-label="Portal navigation">
        <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Portal
        </div>
        {clientNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-700 hover:bg-gray-100"
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.name}
          </NavLink>
        ))}

        {/* Admin Navigation */}
        {isAdmin && (
          <>
            <div className="mt-6 mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </div>
            {adminNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-100"
                  )
                }
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.name}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t px-2 py-4">
        {secondaryNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-700 hover:bg-gray-100"
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
