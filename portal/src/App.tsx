import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { Toaster } from "sonner";
import { api } from "../convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Shell } from "@/components/layout/Shell";
import { Login } from "@/pages/Login";
import { Callback } from "@/pages/Callback";
import { Dashboard } from "@/pages/Dashboard";
import { Documents } from "@/pages/Documents";
import { Tasks } from "@/pages/Tasks";
import { Announcements } from "@/pages/Announcements";
import { Invoices } from "@/pages/Invoices";
import { Signatures } from "@/pages/Signatures";
import { NotFound } from "@/pages/NotFound";

// Lazy load admin pages for code splitting
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminClients = lazy(() => import("@/pages/admin/AdminClients").then(m => ({ default: m.AdminClients })));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers").then(m => ({ default: m.AdminUsers })));
const AdminInvoices = lazy(() => import("@/pages/admin/AdminInvoices").then(m => ({ default: m.AdminInvoices })));
const AdminAnnouncements = lazy(() => import("@/pages/admin/AdminAnnouncements").then(m => ({ default: m.AdminAnnouncements })));
const AdminActivity = lazy(() => import("@/pages/admin/AdminActivity").then(m => ({ default: m.AdminActivity })));

// Loading fallback for lazy-loaded components
function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
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
          <ErrorBoundary>
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
              <Route path="/help" element={<ComingSoon title="Help & Support" />} />
              
              {/* Admin Routes - Protected by AdminRoute wrapper, lazy loaded */}
              <Route path="/admin" element={
                <AdminRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AdminDashboard />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/organizations" element={
                <AdminRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AdminClients />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/users" element={
                <AdminRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AdminUsers />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/invoices" element={
                <AdminRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AdminInvoices />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/announcements" element={
                <AdminRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AdminAnnouncements />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/activity" element={
                <AdminRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AdminActivity />
                  </Suspense>
                </AdminRoute>
              } />
              
              {/* 404 - Must be last */}
              <Route path="/callback" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </Shell>
      </Authenticated>
    </ErrorBoundary>
  );
}

/**
 * Admin route protection wrapper - redirects non-admin/staff users to dashboard
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const currentUser = useQuery(api.users.getCurrentUser);

  // Still loading user data
  if (currentUser === undefined) {
    return <PageLoader />;
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
