import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "கடவுச்சொல் மீட்டமைப்பு – BLUE HEART GUYS" },
      {
        name: "description",
        content: "BLUE HEART GUYS உறுப்பினர் கணக்கிற்கு புதிய கடவுச்சொல் அமைக்கவும்.",
      },
      { property: "og:title", content: "கடவுச்சொல் மீட்டமைப்பு – BLUE HEART GUYS" },
      { property: "og:description", content: "Set a new password for your member account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("புதிய கடவுச்சொல் அமைக்கப்பட்டது 💙");
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-3 py-10">
      <form
        onSubmit={(e) => void submit(e)}
        className="glass w-full max-w-sm rounded-3xl p-5 sm:max-w-md sm:p-6"
      >
        <h1 className="tamil text-base font-bold">புதிய கடவுச்சொல்</h1>
        <p className="tamil mt-1 text-xs text-muted-foreground">
          குறைந்தது 6 எழுத்துகள் கொண்ட புதிய கடவுச்சொல்லை அமைக்கவும்.
        </p>
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-glass-border bg-secondary/40 px-3">
          <Lock className="size-4 shrink-0 text-primary" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="w-full min-w-0 bg-transparent py-3 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || password.length < 6}
          className="gradient-blue glow-sm tamil mt-4 w-full rounded-2xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          சேமி / Save
        </button>
      </form>
    </div>
  );
}
