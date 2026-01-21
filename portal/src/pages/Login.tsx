import { useAuth } from "@workos-inc/authkit-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function Login() {
  const { signIn } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Logo */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            A&H
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access your Amjad & Hazli client portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={() => signIn()} 
            className="w-full"
            size="lg"
          >
            Sign In
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Secure access to your documents, invoices, and updates
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
