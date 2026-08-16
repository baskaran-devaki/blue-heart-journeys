import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Images, Wallet, MessageCircle, Users, Settings, LogOut, Radio } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { KuralFooter } from "./KuralFooter";

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!now) return <span className="h-4 w-40 rounded bg-muted/50" />;
  return (
    <span className="tamil text-[11px] text-muted-foreground">
      {now.toLocaleDateString("ta-IN", { weekday: "long", day: "numeric", month: "long" })} •{" "}
      {now.toLocaleTimeString("en-GB")}
    </span>
  );
}

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/memories", label: "Memories", icon: Images },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/members", label: "Members", icon: Users },
] as const;

export function AppShell({
  children,
  showFooter = true,
}: {
  children: React.ReactNode;
  showFooter?: boolean;
}) {
  const { isAdmin, isMember, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
      <header className="glass sticky top-0 z-30 rounded-b-3xl border-x-0 border-t-0 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="min-w-0">
            <h1 className="tamil truncate text-[15px] leading-tight font-bold">
              <span aria-hidden>💙</span> BLUE HEART GUYS
              <span className="text-gradient-blue"> – சூறாவளி சுற்றுப்பயணம்</span>
            </h1>
            <LiveClock />
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              to="/live"
              aria-label="Live Trip"
              className="grid size-9 place-items-center rounded-full border border-glass-border text-live transition-transform active:scale-95"
            >
              <Radio className="size-4" />
            </Link>
            {isAdmin ? (
              <Link
                to="/admin"
                aria-label="Admin panel"
                className="grid size-9 place-items-center rounded-full border border-glass-border text-primary transition-transform active:scale-95"
              >
                <Settings className="size-4" />
              </Link>
            ) : null}
            {isMember ? (
              <button
                onClick={() => void signOut()}
                aria-label="Sign out"
                className="grid size-9 place-items-center rounded-full border border-glass-border text-muted-foreground transition-transform active:scale-95"
              >
                <LogOut className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="safe-bottom flex-1 space-y-4 px-3 pt-4">{children}</main>

      {showFooter ? <KuralFooter /> : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-3 pb-[env(safe-area-inset-bottom)]">
        <div className="glass mb-3 flex items-center justify-between rounded-3xl px-2 py-2">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-medium transition-all",
                  active ? "gradient-blue glow-sm text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
