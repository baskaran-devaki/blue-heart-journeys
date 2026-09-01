import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import friendsTrip from "@/assets/friends-trip.jpg";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "உள்நுழைவு – BLUE HEART GUYS" },
      {
        name: "description",
        content:
          "BLUE HEART GUYS குழு உறுப்பினர்களுக்கான தனிப்பட்ட Email + Password உள்நுழைவு. Admin அழைத்த உறுப்பினர்கள் மட்டுமே.",
      },
      { property: "og:title", content: "உள்நுழைவு – BLUE HEART GUYS" },
      {
        property: "og:description",
        content: "Admin அழைத்த உறுப்பினர்களுக்கான தனிப்பட்ட நட்பு பயண செயலி.",
      },
    ],
  }),
  component: AuthPage,
});

const inputBase =
  "w-full min-w-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground";

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { status, isMember } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isMember) void navigate({ to: "/", replace: true });
  }, [isMember, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    toast.success("வரவேற்கிறோம் 💙");
  };

  const forgot = async () => {
    if (!email.trim()) {
      toast.error("Email எழுதுங்கள்");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reset link உங்கள் email-க்கு அனுப்பப்பட்டது");
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-x-clip px-3 py-8 sm:px-6 sm:py-10">
      <img
        src={friendsTrip}
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-20"
      />
      <div className="glass relative w-full max-w-sm min-w-0 rounded-3xl p-4 sm:max-w-md sm:p-6 md:max-w-lg">
        <div className="text-center">
          <div className="gradient-blue glow mx-auto grid size-12 place-items-center rounded-2xl text-2xl sm:size-14">
            💙
          </div>
          <h1 className="tamil mt-4 text-base font-bold sm:text-lg">BLUE HEART GUYS</h1>
          <p className="tamil text-xs text-muted-foreground">சூறாவளி சுற்றுப்பயணம்</p>
        </div>

        {status === "not_approved" ? (
          <div className="tamil mt-5 rounded-2xl border border-glass-border bg-destructive/15 p-3 text-xs break-words">
            உங்கள் கணக்கு Admin ஆல் இன்னும் அனுமதிக்கப்படவில்லை. Admin-ஐ தொடர்பு கொள்ளுங்கள்.
          </div>
        ) : null}

        <form className="mt-6 space-y-3" onSubmit={(e) => void signIn(e)}>
          <label className="tamil block text-xs text-muted-foreground">Email</label>
          <div className="flex items-center gap-2 rounded-2xl border border-glass-border bg-secondary/40 px-3">
            <Mail className="size-4 shrink-0 text-primary" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              className={inputBase}
            />
          </div>

          <label className="tamil block text-xs text-muted-foreground">Password</label>
          <div className="flex items-center gap-2 rounded-2xl border border-glass-border bg-secondary/40 px-3">
            <Lock className="size-4 shrink-0 text-primary" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputBase}
            />
          </div>

          <button
            type="submit"
            disabled={busy || !email.trim() || password.length < 6}
            className="gradient-blue glow-sm tamil w-full rounded-2xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            உள்நுழை / Sign in
          </button>
          <button
            type="button"
            onClick={() => void forgot()}
            disabled={busy}
            className="tamil w-full text-xs text-primary disabled:opacity-50"
          >
            கடவுச்சொல் மறந்துவிட்டதா?
          </button>
        </form>

        <p className="tamil mt-5 flex items-start gap-2 text-[11px] break-words text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
          Admin அழைத்த email கணக்குகள் மட்டுமே உள்நுழைய முடியும்.
        </p>
        <Link to="/live" className="tamil mt-3 block text-center text-xs text-primary">
          🔴 Live பயணத்தை பார்க்க
        </Link>
      </div>
    </div>
  );
}
