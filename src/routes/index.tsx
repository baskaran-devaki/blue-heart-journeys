import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/bhg/AppShell";
import { TripHeroCard } from "@/components/bhg/TripHeroCard";
import { useAuth } from "@/lib/auth";
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

function HomePage() {
  const { isMember, status, profile } = useAuth();

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
    </AppShell>
  );
}
