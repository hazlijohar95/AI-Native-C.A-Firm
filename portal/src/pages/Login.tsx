import { useAuth } from "@workos-inc/authkit-react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function Login() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8">
          <div className="flex items-center justify-between h-14">
            <a href="https://amjadhazli.com" className="flex items-center gap-3 text-gray-900 font-serif text-lg font-medium">
              Amjad & Hazli
            </a>
            <a 
              href="https://amjadhazli.com" 
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              Back to Website
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-5 md:px-8">
        <div className="min-h-[calc(100vh-56px)] flex flex-col lg:flex-row">
          
          {/* Left Side - Branding (hidden on mobile) */}
          <div className="hidden lg:flex lg:w-1/2 flex-col justify-center pr-16">
            <div className="max-w-md">
              <p className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-4">
                Client Portal
              </p>
              <h1 className="font-serif text-4xl xl:text-5xl text-gray-900 font-medium leading-tight mb-6">
                Access your financial documents securely
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Track deadlines, view reports, and stay connected with your accounting team — all in one place.
              </p>
              
              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Secure document sharing</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Real-time notifications</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Bank-level encryption</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex-1 flex items-center justify-center py-12 lg:py-0 lg:pl-16 lg:border-l lg:border-gray-200">
            <div className="w-full max-w-sm">
              {/* Mobile Header */}
              <div className="lg:hidden text-center mb-8">
                <p className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Client Portal
                </p>
                <h1 className="font-serif text-2xl text-gray-900 font-medium">
                  Welcome back
                </h1>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:block mb-8">
                <h2 className="font-serif text-2xl text-gray-900 font-medium mb-2">
                  Sign in
                </h2>
                <p className="text-gray-500">
                  Access your client portal
                </p>
              </div>

              {/* Sign In Button */}
              <Button 
                onClick={() => signIn()} 
                className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-all duration-200 group"
              >
                <span>Continue with WorkOS</span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-500 uppercase tracking-wider">
                    Secure authentication
                  </span>
                </div>
              </div>

              {/* Security Note */}
              <div className="bg-gray-50 rounded p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-900 font-medium">Enterprise Security</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Sign in with Google or email. Your data is encrypted and protected.
                    </p>
                  </div>
                </div>
              </div>

              {/* Help Link */}
              <p className="text-center text-sm text-gray-500 mt-6">
                New client?{" "}
                <a 
                  href="https://amjadhazli.com/#contact" 
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Get in touch
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-4">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>&copy; {new Date().getFullYear()} Amjad & Hazli</span>
            <div className="flex items-center gap-4">
              <a href="https://amjadhazli.com" className="hover:text-blue-600 transition-colors">Website</a>
              <a href="mailto:hello@amjadhazli.com" className="hover:text-blue-600 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
