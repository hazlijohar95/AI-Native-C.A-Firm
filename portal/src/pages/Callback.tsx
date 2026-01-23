import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

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
        <div className="w-12 h-12 bg-[#090516] rounded flex items-center justify-center">
          <span className="text-white font-['Playfair_Display'] text-xl">A</span>
        </div>

        {/* Loading */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#EBEBEB] border-t-[#253FF6] rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-sm font-medium text-[#090516]">Signing you in</p>
            <p className="text-xs text-[#737373] mt-0.5">Just a moment...</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#253FF6]"
              style={{
                animation: "pulse-dot 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
