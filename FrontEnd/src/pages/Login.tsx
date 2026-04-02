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
import { useAuth, homePathForRole } from "@/context/AuthContext";
import type { CurrentUser } from "@/context/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState<string | null>(null);

  // Already logged in — redirect immediately
  React.useEffect(() => {
    if (currentUser) {
      navigate(homePathForRole(currentUser), { replace: true });
    }
  }, [currentUser, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Login failed" }));
        throw new Error(body.error ?? "Invalid credentials");
      }

      const user = (await res.json()) as CurrentUser;
      login(user);
      navigate(homePathForRole(user), { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
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
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your username and password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="e.g. investor1"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Password</label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
            Sign up
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

export default Login;
