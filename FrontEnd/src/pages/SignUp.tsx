import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Beef } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import type { CurrentUser } from "@/context/AuthContext";

type Role = "investor" | "rancher" | "feedlot";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "investor",  label: "Investor",  description: "Browse and invest in cattle herds" },
  { value: "rancher",   label: "Rancher",   description: "List and manage your herds" },
  { value: "feedlot",   label: "Feedlot",   description: "Review herds and set investor allocation" },
];

export function SignUp() {
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();

  const [username, setUsername]   = React.useState("");
  const [email, setEmail]         = React.useState("");
  const [password, setPassword]   = React.useState("");
  const [confirm, setConfirm]     = React.useState("");
  const [role, setRole]           = React.useState<Role>("investor");
  const [loading, setLoading]     = React.useState(false);
  const [error, setError]         = React.useState<string | null>(null);

  // Already logged in — go to their home
  React.useEffect(() => {
    if (currentUser) navigate("/", { replace: true });
  }, [currentUser, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (username.trim().length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Sign up failed" }));
        throw new Error(body.error ?? "Sign up failed");
      }

      // Auto-login after successful signup
      const user = (await res.json()) as CurrentUser;
      login(user);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand mark */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Beef className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CattleCoin</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>
              Fill in your details to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="e.g. johndoe"
                />
                <p className="text-xs text-muted-foreground">
                  This will be your login username.
                </p>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Password</label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                />
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                />
              </div>

              {/* Role selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sign up as</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(({ value, label, description }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        role === value
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <div className="font-medium text-foreground">{label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                        {description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:underline underline-offset-4">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
