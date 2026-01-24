import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Bell,
  LogOut,
  ChevronRight,
  Check,
  ExternalLink,
  FileText,
  CheckSquare,
  MessageSquare,
  Receipt,
  Pen,
  Megaphone,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

// Email preference toggle component
interface EmailToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function EmailToggle({ icon, label, description, checked, onChange, disabled }: EmailToggleProps) {
  return (
    <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#F8F8F8] rounded flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-[#090516]">{label}</p>
          <p className="text-xs text-[#737373] mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8986B] focus-visible:ring-offset-2",
          checked ? "bg-[#B8986B]" : "bg-[#e5e5e7]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export function Settings() {
  const { user, signOut } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const organization = useQuery(
    api.organizations.get,
    currentUser?.organizationId ? { id: currentUser.organizationId } : "skip"
  );
  const emailPreferences = useQuery(api.users.getMyEmailPreferences);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateEmailPreferences = useMutation(api.users.updateEmailPreferences);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
  });

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || "",
        phone: currentUser.phone || "",
      });
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!profileData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        name: profileData.name.trim(),
        phone: profileData.phone.trim() || undefined,
      });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
      name: currentUser?.name || "",
      phone: currentUser?.phone || "",
    });
    setIsEditing(false);
  };

  const handleEmailPrefChange = async (key: keyof NonNullable<typeof emailPreferences>, value: boolean) => {
    if (isSavingPrefs) return;
    setIsSavingPrefs(true);
    try {
      await updateEmailPreferences({ [key]: value });
      // Toast is optional since the toggle gives immediate visual feedback
    } catch (error) {
      toast.error("Failed to update preference");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-3xl text-[#2B3A55]">Account <span className="italic text-[#B8986B]">Settings</span></h1>
        <p className="text-[#737373] mt-2">Manage your profile and preferences</p>
      </div>

      {/* Profile Section */}
      <section className="bg-white border border-[rgba(184,152,107,0.15)] rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-5 border-b border-[rgba(184,152,107,0.1)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#B8986B] rounded flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-['Playfair_Display'] text-xl text-[#090516]">Profile</h2>
              <p className="text-sm text-[#737373]">Your personal information</p>
            </div>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="h-9 px-4 text-sm font-medium text-[#B8986B] hover:bg-[#B8986B]/5 rounded transition-colors"
            >
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="h-9 px-4 text-sm font-medium text-[#737373] hover:bg-[#F8F8F8] rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="h-9 px-4 text-sm font-medium text-white bg-[#B8986B] hover:bg-[#A6875A] disabled:bg-[#EBEBEB] disabled:text-[#737373] rounded transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-[#F1F1F1]">
          {/* Name */}
          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-[#737373]" />
              <span className="text-sm text-[#737373]">Full Name</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                autoComplete="name"
                className="w-full sm:w-64 h-10 sm:h-9 px-3 bg-[#F8F8F8] border border-[#EBEBEB] rounded text-sm text-[#090516] focus:outline-none focus:border-[#B8986B] focus:ring-1 focus:ring-[#B8986B]/20"
                placeholder="Enter your name"
              />
            ) : (
              <span className="text-sm font-medium text-[#090516]">
                {currentUser?.name || "—"}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[#737373]" />
              <span className="text-sm text-[#737373]">Email</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#090516]">
                {currentUser?.email || user?.email}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#22c55e]/10 text-[#22c55e] rounded font-medium uppercase tracking-wide">
                Verified
              </span>
            </div>
          </div>

          {/* Phone */}
          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#737373]" />
              <span className="text-sm text-[#737373]">Phone</span>
            </div>
            {isEditing ? (
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                autoComplete="tel"
                className="w-full sm:w-64 h-10 sm:h-9 px-3 bg-[#F8F8F8] border border-[#EBEBEB] rounded text-sm text-[#090516] focus:outline-none focus:border-[#B8986B] focus:ring-1 focus:ring-[#B8986B]/20"
                placeholder="+60 12-345 6789"
              />
            ) : (
              <span className="text-sm font-medium text-[#090516]">
                {currentUser?.phone || "—"}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Organization Section */}
      <section className="bg-white border border-[#EBEBEB] rounded overflow-hidden">
        <div className="px-6 py-5 border-b border-[#F1F1F1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#090516] rounded flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-['Playfair_Display'] text-xl text-[#090516]">Organization</h2>
              <p className="text-sm text-[#737373]">Your company details</p>
            </div>
          </div>
        </div>

        {organization ? (
          <div className="divide-y divide-[#F1F1F1]">
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <span className="text-sm text-[#737373]">Company Name</span>
              <span className="text-sm font-medium text-[#090516]">{organization.name}</span>
            </div>
            {organization.registrationNumber && (
              <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <span className="text-sm text-[#737373]">Registration No.</span>
                <span className="font-['DM_Mono'] text-sm text-[#090516]">
                  {organization.registrationNumber}
                </span>
              </div>
            )}
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <span className="text-sm text-[#737373]">Contact Email</span>
              <span className="text-sm font-medium text-[#090516]">{organization.email}</span>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 bg-[#F8F8F8] rounded flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-5 h-5 text-[#737373]" />
            </div>
            <p className="text-sm text-[#737373]">
              No organization linked yet.{" "}
              <a href="mailto:hello@amjadhazli.com" className="text-[#B8986B] hover:underline">
                Contact us
              </a>{" "}
              to set this up.
            </p>
          </div>
        )}
      </section>

      {/* Security Section */}
      <section className="bg-white border border-[#EBEBEB] rounded overflow-hidden">
        <div className="px-6 py-5 border-b border-[#F1F1F1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#090516] rounded flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-['Playfair_Display'] text-xl text-[#090516]">Security</h2>
              <p className="text-sm text-[#737373]">Manage your account security</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#F1F1F1]">
          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div>
              <p className="text-sm font-medium text-[#090516]">Authentication</p>
              <p className="text-xs text-[#737373] mt-0.5">Managed via WorkOS</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 bg-[#22c55e]/10 text-[#22c55e] rounded font-medium uppercase tracking-wide">
                Active
              </span>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div>
              <p className="text-sm font-medium text-[#090516]">Two-Factor Authentication</p>
              <p className="text-xs text-[#737373] mt-0.5">Extra security for your account</p>
            </div>
            <a
              href="https://auth.amjadhazli.com/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-[#B8986B] hover:underline"
            >
              <span>Manage</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      {/* Email Notifications Section */}
      <section className="bg-white border border-[#EBEBEB] rounded overflow-hidden">
        <div className="px-6 py-5 border-b border-[#F1F1F1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#090516] rounded flex items-center justify-center">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-['Playfair_Display'] text-xl text-[#090516]">Email Notifications</h2>
              <p className="text-sm text-[#737373]">Choose what you want to be notified about</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#F1F1F1]">
          <EmailToggle
            icon={<FileText className="w-4 h-4 text-[#737373]" />}
            label="Document Requests"
            description="When a document is requested from you"
            checked={emailPreferences?.documentRequests ?? true}
            onChange={(v) => handleEmailPrefChange("documentRequests", v)}
            disabled={!emailPreferences || isSavingPrefs}
          />
          <EmailToggle
            icon={<CheckSquare className="w-4 h-4 text-[#737373]" />}
            label="Task Assignments"
            description="When a new task is assigned to you"
            checked={emailPreferences?.taskAssignments ?? true}
            onChange={(v) => handleEmailPrefChange("taskAssignments", v)}
            disabled={!emailPreferences || isSavingPrefs}
          />
          <EmailToggle
            icon={<MessageSquare className="w-4 h-4 text-[#737373]" />}
            label="Task Comments"
            description="When someone comments on your tasks"
            checked={emailPreferences?.taskComments ?? true}
            onChange={(v) => handleEmailPrefChange("taskComments", v)}
            disabled={!emailPreferences || isSavingPrefs}
          />
          <EmailToggle
            icon={<Receipt className="w-4 h-4 text-[#737373]" />}
            label="Invoices"
            description="When a new invoice is issued"
            checked={emailPreferences?.invoices ?? true}
            onChange={(v) => handleEmailPrefChange("invoices", v)}
            disabled={!emailPreferences || isSavingPrefs}
          />
          <EmailToggle
            icon={<Pen className="w-4 h-4 text-[#737373]" />}
            label="Signature Requests"
            description="When a document requires your signature"
            checked={emailPreferences?.signatures ?? true}
            onChange={(v) => handleEmailPrefChange("signatures", v)}
            disabled={!emailPreferences || isSavingPrefs}
          />
          <EmailToggle
            icon={<Megaphone className="w-4 h-4 text-[#737373]" />}
            label="Announcements"
            description="Important updates from us"
            checked={emailPreferences?.announcements ?? true}
            onChange={(v) => handleEmailPrefChange("announcements", v)}
            disabled={!emailPreferences || isSavingPrefs}
          />
        </div>
      </section>

      {/* Sign Out Section */}
      <section className="bg-white border border-[#EBEBEB] rounded overflow-hidden">
        <button
          onClick={() => signOut()}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-red-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 group-hover:bg-red-100 rounded flex items-center justify-center transition-colors">
              <LogOut className="w-4 h-4 text-[#ef4444]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#ef4444]">Sign Out</p>
              <p className="text-xs text-[#737373]">Log out of your account</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#ef4444]" />
        </button>
      </section>

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="text-xs text-[#737373]">
          Need help?{" "}
          <a href="mailto:hello@amjadhazli.com" className="text-[#B8986B] hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
