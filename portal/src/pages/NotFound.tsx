import { Link } from "react-router-dom";
import { FileQuestion, Home, ArrowLeft } from "@/lib/icons";

export function NotFound() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center text-center opacity-0"
      style={{
        animation: "fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      {/* 404 Visual */}
      <div className="relative mb-8">
        <div className="font-serif text-[120px] sm:text-[160px] font-medium text-[#f0f0f0] leading-none select-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-[#f8f8f8] border border-black/5 flex items-center justify-center">
            <FileQuestion className="h-8 w-8 text-[#6b6b76]" />
          </div>
        </div>
      </div>

      <div className="space-y-3 max-w-md">
        <h1 className="font-serif text-2xl sm:text-3xl text-[#0f0f12]">
          Page Not Found
        </h1>
        <p className="text-[#6b6b76]">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row mt-8">
        <button
          onClick={() => window.history.back()}
          className="h-11 px-5 rounded-xl border border-[#EBEBEB] text-sm font-medium text-[#3A3A3A] bg-white hover:bg-[#f8f8f8] transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Go Back
        </button>
        <Link
          to="/dashboard"
          className="h-11 px-5 rounded-xl bg-[#0f0f12] hover:bg-[#1a1a1f] text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.15)] hover:-translate-y-0.5"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Go to Dashboard
        </Link>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
