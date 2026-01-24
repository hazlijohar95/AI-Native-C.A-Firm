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
  HelpCircle,
  Layers,
} from "@/lib/icons";

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
  { name: "Services", href: "/admin/services", icon: Layers },
  { name: "Tasks", href: "/admin/tasks", icon: CheckSquare },
  { name: "Invoices", href: "/admin/invoices", icon: Receipt },
  { name: "Signatures", href: "/admin/signatures", icon: PenTool },
  { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { name: "Activity Log", href: "/admin/activity", icon: History },
];

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
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
      {/* Backdrop for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-[#F1F1F1] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Mobile navigation"
        aria-hidden={!open}
      >
        <SidebarContent onClose={onClose} showCloseButton />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0"
        aria-label="Main navigation"
      >
        <div className="flex min-h-0 flex-1 flex-col border-r border-[#F1F1F1] bg-white">
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
      <div className="flex h-14 items-center justify-between border-b border-[#F1F1F1] px-4">
        <a href="https://amjadhazli.com" className="flex items-center">
          <span className="font-['Playfair_Display'] text-[#090516] text-base">Amjad & Hazli</span>
        </a>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#EBEBEB] text-[#737373] hover:bg-[#F8F8F8] hover:text-[#090516] transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Client Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Portal navigation">
        <div className="mb-2 px-3">
          <span className="font-['DM_Mono'] text-[10px] text-[#737373] uppercase tracking-[0.02em]">
            Portal
          </span>
        </div>
        <div className="space-y-0.5">
          {clientNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#253FF6]/5 text-[#253FF6]"
                    : "text-[#3A3A3A] hover:bg-[#F8F8F8] hover:text-[#090516]"
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </div>

        {/* Admin Navigation */}
        {isAdmin && (
          <div className="mt-6">
            <div className="mb-2 px-3">
              <span className="font-['DM_Mono'] text-[10px] text-[#737373] uppercase tracking-[0.02em]">
                Admin
              </span>
            </div>
            <div className="space-y-0.5">
              {adminNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#253FF6]/5 text-[#253FF6]"
                        : "text-[#3A3A3A] hover:bg-[#F8F8F8] hover:text-[#090516]"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t border-[#F1F1F1] px-3 py-4">
        <div className="space-y-0.5">
          {secondaryNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#253FF6]/5 text-[#253FF6]"
                    : "text-[#737373] hover:bg-[#F8F8F8] hover:text-[#090516]"
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
