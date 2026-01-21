import { useAuth } from "@workos-inc/authkit-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Menu, LogOut, User } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4">
      {/* Left side - Menu button (mobile) */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right side - Notifications & User */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <div className="flex items-center gap-3 border-l pl-3">
          <div className="hidden text-right text-sm md:block">
            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          
          {/* Avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            {user?.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={user.firstName || "User"}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>

          {/* Sign Out */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
