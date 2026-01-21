import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

// Onboarding steps
const STEPS = [
  { id: "welcome", title: "Welcome", icon: Sparkles },
  { id: "profile", title: "Your Profile", icon: User },
  { id: "organization", title: "Company Info", icon: Building2 },
  { id: "complete", title: "All Done", icon: CheckCircle2 },
] as const;

type StepId = typeof STEPS[number]["id"];

export function Onboarding() {
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateProfile);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [currentStep, setCurrentStep] = useState<StepId>("welcome");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
  });

  // Initialize form with current user data when user loads
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
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
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
      toast.error("Failed to update profile");
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
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // If user has already completed onboarding, redirect
  if (currentUser?.onboardingCompleted) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-2xl px-4 py-12">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                        ? "border-primary bg-background text-primary"
                        : "border-muted bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 w-12 sm:w-20 ${
                        isCompleted ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-sm">
            {STEPS.map((step) => (
              <span
                key={step.id}
                className={`text-center ${
                  step.id === currentStep
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-lg">
          {currentStep === "welcome" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Welcome to Amjad & Hazli</CardTitle>
                <CardDescription className="text-base">
                  Your secure client portal for managing documents, tasks, and communications with our team.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <FeatureItem
                    icon={FileText}
                    title="Secure Document Sharing"
                    description="Upload and access your financial documents securely"
                  />
                  <FeatureItem
                    icon={Building2}
                    title="Task Management"
                    description="Track tasks and deadlines assigned by our team"
                  />
                  <FeatureItem
                    icon={User}
                    title="Direct Communication"
                    description="Stay updated with announcements and notifications"
                  />
                </div>
                <Button onClick={goToNextStep} className="w-full gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}

          {currentStep === "profile" && (
            <>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>
                  Let's make sure we have your correct information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+60 12-345 6789"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({ ...profileData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Email:</strong> {currentUser?.email}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Contact us if you need to update your email address
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleProfileSubmit}
                    disabled={isSubmitting}
                    className="flex-1 gap-2"
                  >
                    {isSubmitting ? <Spinner size="sm" /> : null}
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === "organization" && (
            <>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  {currentUser?.organizationId
                    ? "Your account is linked to the organization below"
                    : "Your account will be linked to a company by our team"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentUser?.organizationId ? (
                  <OrganizationInfo organizationId={currentUser.organizationId} />
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 font-medium">No Organization Linked</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Our team will link your account to your company shortly. You can
                      continue using the portal in the meantime.
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={goToNextStep} className="flex-1 gap-2">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === "complete" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">You're All Set!</CardTitle>
                <CardDescription className="text-base">
                  Your account is ready. Start exploring your client portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Need help? Visit our{" "}
                    <a href="/help" className="text-primary hover:underline">
                      Help Center
                    </a>{" "}
                    or contact us at{" "}
                    <a
                      href="mailto:support@amjadhazli.com"
                      className="text-primary hover:underline"
                    >
                      support@amjadhazli.com
                    </a>
                  </p>
                </div>
                <Button
                  onClick={handleCompleteOnboarding}
                  disabled={isSubmitting}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isSubmitting ? <Spinner size="sm" /> : null}
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

interface FeatureItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function FeatureItem({ icon: Icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function OrganizationInfo({ organizationId }: { organizationId: string }) {
  const organization = useQuery(api.organizations.get, {
    id: organizationId as any,
  });

  if (!organization) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{organization.name}</h3>
          <p className="text-sm text-muted-foreground">{organization.email}</p>
          {organization.registrationNumber && (
            <p className="text-xs text-muted-foreground">
              Reg: {organization.registrationNumber}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
