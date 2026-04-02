import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Shield, TrendingUp, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, homePathForRole } from "@/context/AuthContext";

export function WelcomePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // If already logged in, go straight to their home page
  useEffect(() => {
    if (currentUser) {
      navigate(homePathForRole(currentUser), { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border px-6 h-14 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight">CattleCoin</span>
        <Link to="/login">
          <Button variant="outline" size="sm">Sign in</Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-2xl space-y-6">
          {/* Icon badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Beef className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight">
            CattleCoin
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            The transparent marketplace connecting ranchers, feedlots, and
            investors through tokenized cattle herds.
          </p>

          <Link to="/login">
            <Button size="lg" className="mt-4 gap-2 text-base px-8">
              Get started <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Feature tiles */}
        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-3xl w-full text-left">
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Beef className="h-5 w-5 text-green-700" />
            </div>
            <h3 className="font-semibold">Ranchers</h3>
            <p className="text-sm text-muted-foreground">
              List your herd, register each animal, and connect with feedlots
              ready to bring your cattle to market.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-orange-700" />
            </div>
            <h3 className="font-semibold">Feedlots</h3>
            <p className="text-sm text-muted-foreground">
              Review incoming herds, set the investor allocation percentage, and
              publish to the investor marketplace in one click.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="font-semibold">Investors</h3>
            <p className="text-sm text-muted-foreground">
              Browse verified herds, view live valuations and health records, and
              purchase tokens backed by real cattle.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        CattleCoin MVP v0.1 — Texas A&amp;M CSCE 482
      </footer>
    </div>
  );
}
