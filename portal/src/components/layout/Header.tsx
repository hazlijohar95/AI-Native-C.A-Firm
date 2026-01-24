import { useAuth } from "@workos-inc/authkit-react";
import { Link } from "react-router-dom";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut, Settings, HelpCircle, ChevronDown } from "@/lib/icons";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.firstName?.[0]?.toUpperCase() || "U";

  return (
    <header className="flex h-14 items-center justify-between border-b border-[rgba(184,152,107,0.1)] bg-white px-4 md:px-6">
      {/* Left side - Menu button (mobile) */}
      <div className="flex items-center gap-3">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(184,152,107,0.15)] text-[#737373] hover:bg-[#B8986B]/8 hover:text-[#2B3A55] transition-all duration-200 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Page context - can be dynamic */}
        <div className="hidden md:block">
          <span className="font-['DM_Mono'] text-[11px] text-[#B8986B] uppercase tracking-[0.02em]">
            Client Portal
          </span>
        </div>
      </div>

      {/* Right side - Notifications & User */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationBell />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border border-[rgba(184,152,107,0.15)] py-1.5 pl-1.5 pr-2.5 min-h-[44px] hover:bg-[#B8986B]/8 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#B8986B]/20 focus:border-[#B8986B]">
              {/* Avatar */}
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#2B3A55] to-[#1E2A3F] text-white">
                {user?.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt={user.firstName || "User"}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded object-cover"
                  />
                ) : (
                  <span className="font-['Playfair_Display'] text-xs">{initials}</span>
                )}
              </div>
              {/* Name (desktop only) */}
              <span className="hidden text-sm font-medium text-[#090516] md:block">
                {user?.firstName || "User"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[#737373]" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border border-[rgba(184,152,107,0.15)] rounded-xl shadow-[0_4px_16px_rgba(43,58,85,0.1)] p-1">
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#090516]">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs text-[#737373] truncate">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#EBEBEB]" />
            <DropdownMenuItem asChild className="cursor-pointer rounded px-3 py-2 text-sm text-[#3A3A3A] hover:bg-[#F8F8F8] hover:text-[#090516] focus:bg-[#F8F8F8]">
              <Link to="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer rounded px-3 py-2 text-sm text-[#3A3A3A] hover:bg-[#F8F8F8] hover:text-[#090516] focus:bg-[#F8F8F8]">
              <Link to="/help" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                <span>Help & Support</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#EBEBEB]" />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="cursor-pointer rounded px-3 py-2 text-sm text-[#ef4444] hover:bg-red-50 hover:text-[#dc2626] focus:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
