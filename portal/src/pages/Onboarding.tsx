import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  CheckCircle2,
  Building2,
  User,
  ArrowRight,
  ArrowLeft,
  FileText,
  Bell,
  Shield,
  Check,
  Mail,
  ArrowUpRight,
} from "@/lib/icons";

import type { Id } from "../../convex/_generated/dataModel";

const STEPS = [
  { id: "welcome", title: "Welcome", icon: FileText },
  { id: "profile", title: "Profile", icon: User },
  { id: "organization", title: "Company", icon: Building2 },
  { id: "complete", title: "Complete", icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function Onboarding() {
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateProfile);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [currentStep, setCurrentStep] = useState<StepId>("welcome");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState({ name: "", phone: "" });

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || "",
        phone: currentUser.phone || "",
      });
    }
  }, [currentUser]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) setCurrentStep(STEPS[nextIndex].id);
  };
  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setCurrentStep(STEPS[prevIndex].id);
  };

  const handleProfileSubmit = async () => {
    if (!profileData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateProfile({
        name: profileData.name.trim(),
        phone: profileData.phone.trim() || undefined,
      });
      goToNextStep();
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding();
      toast.success("Welcome to the portal!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to complete onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentUser === undefined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-5 h-5 border-2 border-[#EBEBEB] border-t-[#253FF6] rounded-full animate-spin" />
          <p className="text-sm text-[#737373]">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentUser?.onboardingCompleted) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-[#F1F1F1]">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <div className="flex items-center justify-between h-14">
            <a href="https://amjadhazli.com" className="font-['Playfair_Display'] text-[#090516] text-lg">
              Amjad & Hazli
            </a>
            <div className="flex items-center gap-4">
              <span className="font-['DM_Mono'] text-[11px] text-[#737373] uppercase tracking-[0.02em]">
                Step {currentStepIndex + 1} of {STEPS.length}
              </span>
              <a
                href="https://amjadhazli.com"
                className="flex items-center gap-1 text-[13px] text-[#737373] hover:text-[#090516] transition-colors"
              >
                <span className="hidden sm:inline">Exit</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-5 md:px-8 py-10 md:py-16">
        {/* Progress Steps */}
        <div className="mb-10 md:mb-12">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`relative w-10 h-10 rounded flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? "bg-[#22c55e] text-white"
                          : isCurrent
                          ? "bg-[#253FF6] text-white"
                          : "bg-[#F8F8F8] text-[#737373] border border-[#EBEBEB]"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                      ) : (
                        <StepIcon className="w-4 h-4" strokeWidth={1.5} />
                      )}
                    </div>
                    <span
                      className={`mt-2.5 font-['DM_Mono'] text-[10px] uppercase tracking-[0.02em] hidden sm:block transition-colors duration-300 ${
                        isCurrent ? "text-[#090516]" : isCompleted ? "text-[#22c55e]" : "text-[#737373]"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="h-px flex-1 mx-3 md:mx-5 bg-[#EBEBEB] relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#22c55e] transition-all duration-500"
                        style={{ width: isCompleted ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Welcome Step */}
        {currentStep === "welcome" && (
          <div className="text-center">
            <span className="inline-block font-['DM_Mono'] text-[11px] text-[#737373] uppercase tracking-[0.02em] mb-4">
              Getting Started
            </span>
            <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl text-[#090516] leading-tight mb-4">
              Welcome to your
              <br />
              <span className="italic text-[#737373]">client portal</span>
            </h1>
            <p className="text-[#737373] text-base max-w-md mx-auto leading-relaxed mb-10">
              A secure space for managing your financial documents, tracking tasks, and staying connected with our team.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              <FeatureCard icon={FileText} title="Documents" desc="Secure file sharing" />
              <FeatureCard icon={Bell} title="Updates" desc="Real-time notifications" />
              <FeatureCard icon={Shield} title="Security" desc="Enterprise protection" />
            </div>

            <button
              onClick={goToNextStep}
              className="group w-full h-11 px-5 bg-[#253FF6] hover:bg-[#293ED5] text-white rounded text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}

        {/* Profile Step */}
        {currentStep === "profile" && (
          <div>
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-[#253FF6] rounded flex items-center justify-center mx-auto mb-4">
                <User className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-['Playfair_Display'] text-2xl md:text-3xl text-[#090516] mb-1">Your Profile</h2>
              <p className="text-[#737373] text-sm">Confirm your information</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block font-['DM_Mono'] text-[11px] text-[#737373] uppercase tracking-[0.02em]">
                  Full Name <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full h-11 px-4 bg-[#F8F8F8] border border-[#EBEBEB] rounded text-sm text-[#090516] placeholder-[#737373] focus:outline-none focus:border-[#253FF6] focus:ring-1 focus:ring-[#253FF6]/20"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block font-['DM_Mono'] text-[11px] text-[#737373] uppercase tracking-[0.02em]">
                  Phone Number <span className="text-[#737373] lowercase font-normal tracking-normal">(Optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+60 12-345 6789"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full h-11 px-4 bg-[#F8F8F8] border border-[#EBEBEB] rounded text-sm text-[#090516] placeholder-[#737373] focus:outline-none focus:border-[#253FF6] focus:ring-1 focus:ring-[#253FF6]/20"
                />
              </div>
              <div className="bg-[#F8F8F8] border border-[#EBEBEB] rounded p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-white border border-[#EBEBEB] rounded flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-[#737373]" />
                </div>
                <div>
                  <p className="text-[#090516] text-sm font-medium">{currentUser?.email}</p>
                  <p className="text-[#737373] text-xs mt-0.5">Contact us to update your email</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={goToPrevStep}
                className="h-11 px-4 rounded border border-[#EBEBEB] text-[#3A3A3A] text-sm font-medium hover:bg-[#F8F8F8] transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleProfileSubmit}
                disabled={isSubmitting || !profileData.name.trim()}
                className="group flex-1 h-11 px-5 bg-[#253FF6] hover:bg-[#293ED5] disabled:bg-[#EBEBEB] disabled:text-[#737373] disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Organization Step */}
        {currentStep === "organization" && (
          <div>
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-[#253FF6] rounded flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-['Playfair_Display'] text-2xl md:text-3xl text-[#090516] mb-1">Company Info</h2>
              <p className="text-[#737373] text-sm">
                {currentUser?.organizationId ? "Your linked organization" : "Pending assignment"}
              </p>
            </div>

            <div className="mb-6">
              {currentUser?.organizationId ? (
                <OrganizationInfo organizationId={currentUser.organizationId} />
              ) : (
                <div className="border border-dashed border-[#D7D7D7] rounded p-8 text-center bg-[#F8F8F8]">
                  <div className="w-12 h-12 bg-[#EBEBEB] rounded flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-5 h-5 text-[#737373]" />
                  </div>
                  <h3 className="font-['Playfair_Display'] text-xl text-[#090516] mb-2">No Organization Yet</h3>
                  <p className="text-[#737373] max-w-sm mx-auto text-sm leading-relaxed">
                    Our team will link your account to your company shortly. You can continue using the portal.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={goToPrevStep}
                className="h-11 px-4 rounded border border-[#EBEBEB] text-[#3A3A3A] text-sm font-medium hover:bg-[#F8F8F8] transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={goToNextStep}
                className="group flex-1 h-11 px-5 bg-[#253FF6] hover:bg-[#293ED5] text-white rounded text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === "complete" && (
          <div className="text-center">
            <div className="w-14 h-14 bg-[#22c55e] rounded flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl text-[#090516] mb-3">You're all set!</h1>
            <p className="text-[#737373] text-base max-w-sm mx-auto mb-8">
              Your account is ready. Explore your personalized dashboard.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <QuickLink icon={FileText} title="Documents" desc="View and upload files" />
              <QuickLink icon={Bell} title="Announcements" desc="Latest updates" />
            </div>

            <div className="bg-[#F8F8F8] border border-[#EBEBEB] rounded p-4 text-center mb-6">
              <p className="text-[#737373] text-sm">
                Need help?{" "}
                <a href="mailto:hello@amjadhazli.com" className="text-[#253FF6] font-medium hover:underline underline-offset-2">
                  Contact support
                </a>
              </p>
            </div>

            <button
              onClick={handleCompleteOnboarding}
              disabled={isSubmitting}
              className="group w-full h-12 px-5 bg-[#253FF6] hover:bg-[#293ED5] disabled:bg-[#EBEBEB] disabled:text-[#737373] disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#F1F1F1] py-4 mt-auto">
        <p className="text-center text-xs text-[#737373]">
          &copy; {new Date().getFullYear()} Amjad & Hazli. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="bg-[#F8F8F8] border border-[#EBEBEB] rounded p-4 text-center">
      <div className="w-10 h-10 bg-white border border-[#EBEBEB] rounded flex items-center justify-center mx-auto mb-3">
        <Icon className="w-4 h-4 text-[#090516]" />
      </div>
      <h3 className="font-medium text-[#090516] text-sm">{title}</h3>
      <p className="text-xs text-[#737373] mt-0.5">{desc}</p>
    </div>
  );
}

function QuickLink({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="bg-[#F8F8F8] border border-[#EBEBEB] rounded p-4 flex items-center gap-3 text-left">
      <div className="w-10 h-10 bg-white border border-[#EBEBEB] rounded flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#090516]" />
      </div>
      <div>
        <h3 className="font-medium text-[#090516] text-sm">{title}</h3>
        <p className="text-xs text-[#737373]">{desc}</p>
      </div>
    </div>
  );
}

function OrganizationInfo({ organizationId }: { organizationId: Id<"organizations"> }) {
  const organization = useQuery(api.organizations.get, { id: organizationId });

  if (!organization) {
    return (
      <div className="bg-[#F8F8F8] border border-[#EBEBEB] rounded p-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#EBEBEB] border-t-[#253FF6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#F8F8F8] border border-[#EBEBEB] rounded p-4 flex items-center gap-4">
      <div className="w-10 h-10 bg-white border border-[#EBEBEB] rounded flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4 text-[#090516]" />
      </div>
      <div>
        <h3 className="font-['Playfair_Display'] text-lg text-[#090516]">{organization.name}</h3>
        <p className="text-[#737373] text-sm">{organization.email}</p>
        {organization.registrationNumber && (
          <p className="font-['DM_Mono'] text-[11px] text-[#737373] uppercase tracking-[0.02em] mt-0.5">
            Reg: {organization.registrationNumber}
          </p>
        )}
      </div>
    </div>
  );
}
