import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Smartphone } from "lucide-react";
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
          "BLUE HEART GUYS குழு உறுப்பினர்களுக்கான தனிப்பட்ட உள்நுழைவு. Admin அனுமதித்த கைபேசி எண்கள் மட்டுமே.",
      },
      { property: "og:title", content: "உள்நுழைவு – BLUE HEART GUYS" },
      {
        property: "og:description",
        content: "Admin அனுமதித்த உறுப்பினர்களுக்கான தனிப்பட்ட நட்பு பயண செயலி.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { status, isMember } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isMember) void navigate({ to: "/", replace: true });
  }, [isMember, navigate]);

  const sendOtp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("OTP அனுப்பப்பட்டது");
  };

  const verify = async () => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: code.trim(),
      type: "sms",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("வரவேற்கிறோம் 💙");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <img
        src={friendsTrip}
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-20"
      />
      <div className="glass relative w-full max-w-sm rounded-3xl p-6">
        <div className="text-center">
          <div className="gradient-blue glow mx-auto grid size-14 place-items-center rounded-2xl text-2xl">
            💙
          </div>
          <h1 className="tamil mt-4 text-lg font-bold">BLUE HEART GUYS</h1>
          <p className="tamil text-xs text-muted-foreground">சூறாவளி சுற்றுப்பயணம்</p>
        </div>

        {status === "not_approved" ? (
          <div className="tamil mt-5 rounded-2xl border border-glass-border bg-destructive/15 p-3 text-xs">
            உங்கள் எண் Admin ஆல் இன்னும் அனுமதிக்கப்படவில்லை. Admin-ஐ தொடர்பு கொள்ளுங்கள்.
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <label className="tamil block text-xs text-muted-foreground">கைபேசி எண்</label>
          <div className="flex items-center gap-2 rounded-2xl border border-glass-border bg-secondary/40 px-3">
            <Smartphone className="size-4 text-primary" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="+919876543210"
              disabled={sent}
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
          </div>

          {sent ? (
            <>
              <label className="tamil block text-xs text-muted-foreground">OTP குறியீடு</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={8}
                placeholder="123456"
                className="w-full rounded-2xl border border-glass-border bg-secondary/40 py-3 text-center text-lg tracking-[0.4em] outline-none"
              />
              <button
                onClick={() => void verify()}
                disabled={busy || code.length < 4}
                className="gradient-blue glow-sm tamil w-full rounded-2xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                உள்நுழை
              </button>
              <button
                onClick={() => {
                  setSent(false);
                  setCode("");
                }}
                className="tamil w-full text-xs text-muted-foreground"
              >
                எண்ணை மாற்று
              </button>
            </>
          ) : (
            <button
              onClick={() => void sendOtp()}
              disabled={busy || phone.trim().length < 8}
              className="gradient-blue glow-sm tamil w-full rounded-2xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              OTP அனுப்பு
            </button>
          )}
        </div>

        <p className="tamil mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" />
          Admin அனுமதித்த எண்கள் மட்டுமே உள்நுழைய முடியும்.
        </p>
        <Link to="/live" className="tamil mt-3 block text-center text-xs text-primary">
          🔴 Live பயணத்தை பார்க்க
        </Link>
      </div>
    </div>
  );
}
