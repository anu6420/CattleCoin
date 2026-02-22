import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Warehouse, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/investor", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/investor/holdings", label: "Lots", icon: Warehouse, end: false },
  { to: "/rancher", label: "Rancher", icon: User, end: false },
] as const;

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-14 items-center px-4">
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            CattleToken
          </span>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 px-2 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-xs text-muted-foreground">MVP v0.1</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-6">
          <h1 className="text-sm font-semibold md:hidden">CattleToken</h1>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Investor Portal</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
