import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Images, Wallet, MessageCircle, Users, Library, Radio } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { TripHeroCard } from "@/components/bhg/TripHeroCard";
import { useAuth } from "@/lib/auth";
import { activeLiveQuery, walletQuery, walletTotals } from "@/lib/queries";
import { money } from "@/lib/bhg";
import friendsTrip from "@/assets/friends-trip.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BLUE HEART GUYS – சூறாவளி சுற்றுப்பயணம்" },
      {
        name: "description",
        content:
          "BLUE HEART GUYS நண்பர்கள் குழுவின் தனிப்பட்ட பயண செயலி – பயணங்கள், நினைவுகள், wallet, chat மற்றும் live trip.",
      },
      { property: "og:title", content: "💙 BLUE HEART GUYS – சூறாவளி சுற்றுப்பயணம்" },
      {
        property: "og:description",
        content: "நட்பு • பயணம் • நினைவுகள் • ஒற்றுமை — our private friendship travel app.",
      },
    ],
  }),
  component: HomePage,
});

const SHORTCUTS = [
  { to: "/memories", icon: Images, label: "📸 நினைவுகள்", hint: "Photos & Videos" },
  { to: "/wallet", icon: Wallet, label: "💰 Wallet", hint: "Collection & Expenses" },
  { to: "/chat", icon: MessageCircle, label: "💬 Chat", hint: "Group realtime chat" },
  { to: "/members", icon: Users, label: "👥 Members", hint: "Confirm / Payment" },
] as const;

function HomePage() {
  const { isMember, status, profile } = useAuth();
  const { data: live } = useQuery(activeLiveQuery);
  const { data: txns } = useQuery({ ...walletQuery(null), enabled: isMember });
  const totals = walletTotals(txns ?? []);

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="animate-pulse text-4xl">💙</div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <img
          src={friendsTrip}
          alt="BLUE HEART GUYS friends trip"
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-25"
        />
        <div className="glass relative w-full max-w-sm rounded-3xl p-7">
          <div className="animate-float text-5xl">💙</div>
          <h1 className="tamil mt-3 text-xl font-bold">BLUE HEART GUYS</h1>
          <p className="tamil text-sm text-gradient-blue">சூறாவளி சுற்றுப்பயணம்</p>
          <p className="tamil mt-4 text-xs leading-relaxed text-muted-foreground">
            நட்பு • பயணம் • நினைவுகள் • ஒற்றுமை
            <br />
            இது நமது தனிப்பட்ட குழு செயலி. Admin அனுமதித்த உறுப்பினர்கள் மட்டுமே உள்நுழைய முடியும்.
          </p>
          <Link
            to="/auth"
            className="gradient-blue glow tamil mt-6 block rounded-2xl py-3 text-sm font-semibold text-primary-foreground"
          >
            உள்நுழைவு / Sign in
          </Link>
          <div className="mt-3 flex gap-2">
            <Link
              to="/live"
              className="tamil flex-1 rounded-2xl border border-glass-border py-2.5 text-xs text-live"
            >
              🔴 Live பார்க்க
            </Link>
            <Link
              to="/trips"
              className="tamil flex-1 rounded-2xl border border-glass-border py-2.5 text-xs"
            >
              📚 பயணங்கள்
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <p className="tamil px-1 text-xs text-muted-foreground">
        வணக்கம், <span className="font-semibold text-foreground">{profile?.full_name}</span> 💙
      </p>

      <TripHeroCard />

      <Link to="/live" className="block">
        <GlassCard
          className={live ? "border-live/60 animate-pulse-glow" : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="tamil flex items-center gap-2 text-sm font-semibold">
                <Radio className={live ? "size-4 text-live" : "size-4 text-muted-foreground"} />
                {live ? "🔴 LIVE TRIP நடக்கிறது" : "⚪ LIVE OFFLINE"}
              </p>
              <p className="tamil mt-1 text-[11px] text-muted-foreground">
                {live ? `Host: ${live.host_name} • ${live.title}` : "Live தொடங்க இங்கே அழுத்துங்கள்"}
              </p>
            </div>
            <span className="tamil rounded-full border border-glass-border px-3 py-1.5 text-[11px]">
              பார்க்க
            </span>
          </div>
        </GlassCard>
      </Link>

      <GlassCard>
        <CardTitle icon="💰" title="Wallet சுருக்கம்" subtitle="மொத்த நிலவரம்" />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">Collection</p>
            <p className="text-sm font-bold text-success">{money(totals.income)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">Expenses</p>
            <p className="text-sm font-bold text-destructive">{money(totals.expense)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">Balance</p>
            <p className="text-sm font-bold text-primary">{money(totals.balance)}</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to}>
            <GlassCard className="h-full">
              <s.icon className="size-5 text-primary" />
              <p className="tamil mt-2 text-sm font-semibold">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.hint}</p>
            </GlassCard>
          </Link>
        ))}
      </div>

      <Link to="/trips" className="block">
        <GlassCard className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Library className="size-5 text-primary" />
            <div>
              <p className="tamil text-sm font-semibold">📚 ALL TRIPS – அனைத்து பயணங்கள்</p>
              <p className="tamil text-[10px] text-muted-foreground">
                கடந்த, நடப்பு மற்றும் வரவிருக்கும் பயணங்கள்
              </p>
            </div>
          </div>
          <span className="text-lg">›</span>
        </GlassCard>
      </Link>
    </AppShell>
  );
}
