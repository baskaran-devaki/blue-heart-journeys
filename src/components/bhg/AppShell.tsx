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
  if (!now) return <span className="block h-4 w-40 max-w-full rounded bg-muted/50" />;
  return (
    <span className="tamil block text-[10px] break-words text-muted-foreground sm:text-[11px]">
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
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col overflow-x-clip pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] md:max-w-3xl md:pb-8 xl:max-w-5xl 2xl:max-w-6xl">
      <header className="glass sticky top-0 z-30 rounded-b-3xl border-x-0 border-t-0 px-3 py-2.5 sm:px-4 sm:py-3 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="min-w-0 flex-1">
            <h1 className="tamil text-[13px] leading-tight font-bold sm:text-[15px] md:text-lg">
              <span aria-hidden>💙</span> BLUE HEART GUYS
              <span className="text-gradient-blue"> – சூறாவளி சுற்றுப்பயணம்</span>
            </h1>
            <LiveClock />
          </Link>

          {/* desktop / tablet inline navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all",
                    active
                      ? "gradient-blue glow-sm text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

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

      <main className="min-w-0 flex-1 space-y-4 px-3 pt-4 sm:px-4 md:px-6 md:pt-6">{children}</main>

      {showFooter ? <KuralFooter /> : null}

      {/* mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-2 pb-[env(safe-area-inset-bottom)] sm:px-3 md:hidden">
        <div className="glass mb-3 flex items-stretch justify-between gap-1 rounded-3xl px-1.5 py-2 sm:px-2">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[9px] leading-none font-medium transition-all xs:text-[10px]",
                  active ? "gradient-blue glow-sm text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-[18px] shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
