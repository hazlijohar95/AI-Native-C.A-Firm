import { Routes, Route, Navigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Spinner } from "@/components/ui/spinner";
import { Shell } from "@/components/layout/Shell";
import { Login } from "@/pages/Login";
import { Callback } from "@/pages/Callback";
import { Dashboard } from "@/pages/Dashboard";
import { Documents } from "@/pages/Documents";
import { Tasks } from "@/pages/Tasks";
import { Announcements } from "@/pages/Announcements";

function App() {
  return (
    <>
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/invoices" element={<ComingSoon title="Invoices" />} />
            <Route path="/settings" element={<ComingSoon title="Settings" />} />
            <Route path="/callback" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Shell>
      </Authenticated>
    </>
  );
}

// Placeholder component for pages not yet implemented
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">Coming soon in Phase 3</p>
    </div>
  );
}

export default App;
