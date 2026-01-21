import { Routes, Route, Navigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { Toaster } from "sonner";
import { api } from "../convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { Shell } from "@/components/layout/Shell";
import { Login } from "@/pages/Login";
import { Callback } from "@/pages/Callback";
import { Dashboard } from "@/pages/Dashboard";
import { Documents } from "@/pages/Documents";
import { Tasks } from "@/pages/Tasks";
import { Announcements } from "@/pages/Announcements";
import { Invoices } from "@/pages/Invoices";
import { Signatures } from "@/pages/Signatures";
import {
  AdminDashboard,
  AdminClients,
  AdminUsers,
  AdminInvoices,
  AdminAnnouncements,
  AdminActivity,
} from "@/pages/admin";

function App() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <AuthLoading>
        <div className="flex h-screen w-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Unauthenticated>

      <Authenticated>
        <Shell>
          <Routes>
            {/* Client Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/signatures" element={<Signatures />} />
            <Route path="/signatures/:id" element={<Signatures />} />
            <Route path="/settings" element={<ComingSoon title="Settings" />} />
            
            {/* Admin Routes - Protected by AdminRoute wrapper */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/organizations" element={<AdminRoute><AdminClients /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/invoices" element={<AdminRoute><AdminInvoices /></AdminRoute>} />
            <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />
            <Route path="/admin/activity" element={<AdminRoute><AdminActivity /></AdminRoute>} />
            
            {/* Fallbacks */}
            <Route path="/callback" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Shell>
      </Authenticated>
    </>
  );
}

/**
 * Admin route protection wrapper - redirects non-admin/staff users to dashboard
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const currentUser = useQuery(api.users.getCurrentUser);

  // Still loading user data
  if (currentUser === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not an admin or staff - redirect to dashboard
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "staff")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Placeholder component for pages not yet implemented
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}

export default App;
