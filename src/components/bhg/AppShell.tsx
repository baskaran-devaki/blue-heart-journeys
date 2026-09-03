import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, Images, Wallet, MessageCircle, Users, Settings, LogOut, Radio } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { activeLiveQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { KuralFooter } from "./KuralFooter";
import { NotificationBell, CalendarButton } from "./NavExtras";

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!now)
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="block h-3 w-24 rounded bg-muted/50" />
        <span className="block h-3 w-14 rounded bg-muted/50" />
      </span>
    );
  return (
    <span className="tamil flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
      <span className="truncate">
        {now.toLocaleDateString("ta-IN", { weekday: "short", day: "numeric", month: "short" })}
      </span>
      <span className="tabular-nums">{now.toLocaleTimeString("en-GB")}</span>
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

function Avatar({ name, url }: { name: string; url: string | null | undefined }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="size-9 shrink-0 rounded-full border border-glass-border object-cover sm:size-11"
      />
    );
  }
  return (
    <span className="gradient-blue grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-foreground sm:size-11">
      {name.trim().charAt(0).toUpperCase() || "💙"}
    </span>
  );
}

export function AppShell({
  children,
  showFooter = false,
}: {
  children: React.ReactNode;
  showFooter?: boolean;
}) {
  const { isAdmin, isMember, signOut, profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: live } = useQuery({ ...activeLiveQuery, enabled: isMember });

  const pill =
    "flex items-center gap-1.5 rounded-full border border-glass-border px-2.5 py-1.5 text-[10px] font-semibold transition-transform active:scale-95 sm:text-[11px]";

  return (
    <div className="flex min-h-[100dvh] w-full flex-col overflow-x-clip">
      {/* TOP NAVIGATION — solid, never transparent, never overlapping content */}
      <header className="sticky top-0 z-40 w-full border-b border-glass-border bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-3 py-2.5 sm:px-4 sm:py-3 md:max-w-3xl md:px-6 xl:max-w-5xl 2xl:max-w-6xl">
          {/* row 1 — photo + brand, row 2 — tagline */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {isMember ? (
              <Link to="/settings" aria-label="Profile & settings" className="active:scale-95">
                <Avatar name={profile?.full_name ?? "💙"} url={profile?.avatar_url} />
              </Link>
            ) : (
              <Avatar name="💙" url={null} />
            )}
            <Link to="/" className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] leading-tight font-extrabold tracking-tight sm:text-2xl md:text-3xl">
                <span aria-hidden>💙</span>{" "}
                <span className="text-gradient-blue">Blue Heart Guys</span>
              </h1>
              <p className="tamil truncate text-[11px] leading-tight text-muted-foreground sm:text-sm md:text-base">
                சூறாவளி சுற்றுப்பயணம்
              </p>
            </Link>

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
          </div>

          {/* row 3 — date • time • live • settings • logout */}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <LiveClock />
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Link
                to="/live"
                aria-label="Live Trip"
                className={cn(pill, live ? "border-live/60 text-live" : "text-muted-foreground")}
              >
                <Radio className={cn("size-3.5", live && "animate-pulse")} />
                {live ? "LIVE" : "OFF"}
              </Link>
              {isAdmin ? (
                <Link to="/admin" aria-label="Admin panel" className={cn(pill, "text-primary")}>
                  🛡 <span className="hidden sm:inline">Admin</span>
                </Link>
              ) : null}
              {isMember ? (
                <>
                  <NotificationBell pill={pill} />
                  <CalendarButton pill={pill} />
                  <Link
                    to="/settings"
                    aria-label="Settings"
                    className={cn(pill, "text-muted-foreground")}
                  >
                    <Settings className="size-3.5" />
                    <span className="hidden sm:inline">Settings</span>
                  </Link>
                  <button
                    onClick={() => void signOut()}
                    aria-label="Sign out"
                    className={cn(pill, "text-destructive")}
                  >
                    <LogOut className="size-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] md:max-w-3xl md:pb-10 xl:max-w-5xl 2xl:max-w-6xl">
        <main className="min-w-0 flex-1 space-y-4 px-3 pt-4 sm:px-4 md:px-6 md:pt-6">
          {children}
        </main>
        {showFooter ? <KuralFooter /> : null}
      </div>

      {/* BOTTOM NAVIGATION (mobile / tablet) — full bottom width, no gap below */}
      <nav className="fixed inset-x-0 bottom-0 z-50 w-full border-t border-glass-border bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-1 px-2 py-2 sm:px-3">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[9px] leading-none font-medium transition-all",
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
