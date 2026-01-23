import { useEffect } from "react";
import { useAuth } from "@workos-inc/authkit-react";

export function Login() {
  const { signIn } = useAuth();

  // Automatically redirect to WorkOS login
  useEffect(() => {
    signIn();
  }, [signIn]);

  // Show a branded loading state while redirecting
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
          <p className="text-sm text-[#737373]">Redirecting to sign in...</p>
        </div>
      </div>
    </div>
  );
}
