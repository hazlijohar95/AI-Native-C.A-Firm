import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand";
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
  RefreshCw,
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
  { name: "Task Templates", href: "/admin/task-templates", icon: RefreshCw },
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
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-gradient-to-b from-white to-[#FAF8F5] border-r border-[rgba(184,152,107,0.1)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out lg:hidden",
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
        <div className="flex min-h-0 flex-1 flex-col border-r border-[rgba(184,152,107,0.1)] bg-gradient-to-b from-white to-[#FAF8F5]">
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
      <div className="flex h-14 items-center justify-between border-b border-[rgba(184,152,107,0.1)] px-4">
        <a href="https://amjadhazli.com" className="flex items-center">
          <Logo variant="full" size="xs" color="gold" />
        </a>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(184,152,107,0.15)] text-[#737373] hover:bg-[#B8986B]/8 hover:text-[#2B3A55] transition-all duration-200"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Portal navigation">
        {/* Client Navigation - Only show for clients */}
        {!isAdmin && (
          <>
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
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 border-l-[3px]",
                      isActive
                        ? "bg-[#B8986B]/12 text-[#B8986B] border-l-[#B8986B]"
                        : "text-[#3A3A3A] hover:bg-[#B8986B]/6 hover:text-[#2B3A55] border-l-transparent"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </>
        )}

        {/* Admin Navigation - Only show for admins/staff */}
        {isAdmin && (
          <>
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
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 border-l-[3px]",
                      isActive
                        ? "bg-[#B8986B]/12 text-[#B8986B] border-l-[#B8986B]"
                        : "text-[#3A3A3A] hover:bg-[#B8986B]/6 hover:text-[#2B3A55] border-l-transparent"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t border-[rgba(184,152,107,0.1)] px-3 py-4">
        <div className="space-y-0.5">
          {secondaryNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 border-l-[3px]",
                  isActive
                    ? "bg-[#B8986B]/12 text-[#B8986B] border-l-[#B8986B]"
                    : "text-[#737373] hover:bg-[#B8986B]/6 hover:text-[#2B3A55] border-l-transparent"
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
