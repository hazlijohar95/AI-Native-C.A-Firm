import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  CheckCircle2,
  Building2,
  User,
  FileText,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Bell,
  Shield,
  Check,
  Mail,
} from "lucide-react";

import type { Id } from "../../convex/_generated/dataModel";

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Sparkles },
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
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-serif text-xl">A&H</span>
          </div>
          <Spinner size="lg" />
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
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-serif text-sm font-medium">A&H</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-gray-900 font-serif font-medium">Amjad & Hazli</h1>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Getting Started</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Step <span className="text-gray-900 font-medium">{currentStepIndex + 1}</span> of {STEPS.length}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 lg:py-14">
        {/* Progress Steps */}
        <div className="mb-10 lg:mb-14">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? "bg-blue-600 text-white shadow-md"
                          : isCurrent
                          ? "bg-gray-900 text-white shadow-md"
                          : "bg-gray-100 text-gray-400 border border-gray-200"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" strokeWidth={3} />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                      {isCurrent && (
                        <div className="absolute -inset-1.5 rounded-2xl border-2 border-gray-900/20 animate-pulse" />
                      )}
                    </div>
                    <span
                      className={`mt-2.5 text-xs font-medium uppercase tracking-wider hidden sm:block ${
                        isCurrent ? "text-gray-900" : isCompleted ? "text-blue-600" : "text-gray-400"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-3 sm:mx-5 rounded-full transition-colors duration-300 ${
                      isCompleted ? "bg-blue-600" : "bg-gray-200"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          
          {/* Welcome Step */}
          {currentStep === "welcome" && (
            <>
              <div className="bg-blue-600 p-8 lg:p-10 text-white">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h1 className="text-3xl lg:text-4xl font-serif font-medium tracking-tight mb-3">
                  Welcome to your
                  <br />
                  client portal
                </h1>
                <p className="text-white/80 text-lg max-w-md">
                  A secure space for managing your financial documents, tracking tasks, and staying connected with our team.
                </p>
              </div>
              <div className="p-8 lg:p-10">
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  <FeatureCard icon={FileText} title="Documents" desc="Secure file sharing" />
                  <FeatureCard icon={Bell} title="Updates" desc="Real-time notifications" />
                  <FeatureCard icon={Shield} title="Security" desc="Enterprise protection" />
                </div>
                <Button 
                  onClick={goToNextStep} 
                  className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 group"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </>
          )}

          {/* Profile Step */}
          {currentStep === "profile" && (
            <>
              <div className="p-8 lg:p-10 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-serif font-medium text-gray-900">Your Profile</h2>
                    <p className="text-gray-500 mt-0.5">Let's confirm your information</p>
                  </div>
                </div>
              </div>
              <div className="p-8 lg:p-10 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-900">
                      Full Name <span className="text-blue-600">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="h-12 text-base bg-gray-50 border-gray-200 focus:border-blue-600 focus:ring-blue-600 rounded-lg px-4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-900">
                      Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+60 12-345 6789"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="h-12 text-base bg-gray-50 border-gray-200 focus:border-blue-600 focus:ring-blue-600 rounded-lg px-4"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 border border-gray-200">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                      <Mail className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">{currentUser?.email}</p>
                      <p className="text-gray-500 text-sm">Contact us to update your email</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={goToPrevStep} 
                    className="h-12 px-6 rounded-lg border-gray-200 hover:bg-gray-50 text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleProfileSubmit}
                    disabled={isSubmitting || !profileData.name.trim()}
                    className="flex-1 h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 group"
                  >
                    {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Organization Step */}
          {currentStep === "organization" && (
            <>
              <div className="p-8 lg:p-10 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-serif font-medium text-gray-900">Company Info</h2>
                    <p className="text-gray-500 mt-0.5">
                      {currentUser?.organizationId ? "Your linked organization" : "Pending assignment"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8 lg:p-10 space-y-6">
                {currentUser?.organizationId ? (
                  <OrganizationInfo organizationId={currentUser.organizationId} />
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50">
                    <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-7 h-7 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-serif font-medium text-gray-900 mb-2">No Organization Yet</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Our team will link your account to your company shortly. You can continue using the portal.
                    </p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={goToPrevStep} 
                    className="h-12 px-6 rounded-lg border-gray-200 hover:bg-gray-50 text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={goToNextStep} 
                    className="flex-1 h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 group"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Complete Step */}
          {currentStep === "complete" && (
            <>
              <div className="bg-blue-600 p-8 lg:p-10 text-white text-center">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h1 className="text-3xl lg:text-4xl font-serif font-medium tracking-tight mb-3">
                  You're all set!
                </h1>
                <p className="text-white/80 text-lg max-w-sm mx-auto">
                  Your account is ready. Explore your personalized dashboard.
                </p>
              </div>
              <div className="p-8 lg:p-10 space-y-6">
                <div className="grid sm:grid-cols-2 gap-3">
                  <QuickLink icon={FileText} title="Documents" desc="View and upload files" />
                  <QuickLink icon={Bell} title="Announcements" desc="Latest updates" />
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
                  <p className="text-gray-500 text-sm">
                    Need help? Visit our{" "}
                    <a href="/help" className="text-blue-600 font-medium hover:underline">Help Center</a>
                    {" "}or email{" "}
                    <a href="mailto:support@amjadhazli.com" className="text-blue-600 font-medium hover:underline">support@amjadhazli.com</a>
                  </p>
                </div>
                <Button
                  onClick={handleCompleteOnboarding}
                  disabled={isSubmitting}
                  className="w-full h-14 text-lg font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 group"
                >
                  {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
                  <span>Enter Dashboard</span>
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-5 text-center border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200">
      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </div>
  );
}

function QuickLink({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

function OrganizationInfo({ organizationId }: { organizationId: Id<"organizations"> }) {
  const organization = useQuery(api.organizations.get, { id: organizationId });

  if (!organization) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center border border-gray-200">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-5 flex items-center gap-4 border border-gray-200">
      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <Building2 className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="text-lg font-serif font-medium text-gray-900">{organization.name}</h3>
        <p className="text-gray-500">{organization.email}</p>
        {organization.registrationNumber && (
          <p className="text-sm text-gray-400 mt-0.5">Reg: {organization.registrationNumber}</p>
        )}
      </div>
    </div>
  );
}
