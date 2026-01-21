import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";

export function Callback() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const syncUser = useMutation(api.users.syncUser);
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    const handleAuth = async () => {
      if (!isLoading && isAuthenticated && !syncComplete) {
        try {
          await syncUser();
          setSyncComplete(true);
        } catch (error) {
          console.error("Failed to sync user:", error);
          setSyncComplete(true);
        }
      }
    };
    handleAuth();
  }, [isAuthenticated, isLoading, syncUser, syncComplete]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && syncComplete) {
        navigate("/dashboard", { replace: true });
      } else if (!isAuthenticated) {
        navigate("/login", { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate, syncComplete]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
          <span className="text-white font-serif text-xl font-medium">A&H</span>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <div className="text-center">
            <p className="text-brand-black font-medium">Completing sign in</p>
            <p className="text-brand-gray-600 text-sm mt-1">Please wait a moment...</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
