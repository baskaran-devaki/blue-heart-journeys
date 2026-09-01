import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, KeyRound, Save } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "⚙️ Profile & Settings – BLUE HEART GUYS" },
      {
        name: "description",
        content:
          "உங்கள் சுயவிவரம் – பெயர், கைபேசி, பிறந்த நாள், இரத்த வகை, முகவரி மற்றும் கடவுச்சொல் மாற்றம்.",
      },
      { property: "og:title", content: "⚙️ Profile & Settings – BLUE HEART GUYS" },
      { property: "og:description", content: "Manage your BLUE HEART GUYS member profile." },
    ],
  }),
  component: SettingsPage,
});

const field =
  "w-full min-w-0 rounded-2xl border border-glass-border bg-secondary/40 px-3 py-2.5 text-sm outline-none";

function SettingsPage() {
  const { profile, user, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    dob: "",
    blood_group: "",
    address: "",
  });
  const [pw, setPw] = useState({ current: "", next: "" });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      dob: profile.dob ?? "",
      blood_group: profile.blood_group ?? "",
      address: profile.address ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          dob: form.dob ? form.dob : null,
          blood_group: form.blood_group.trim(),
          address: form.address.trim(),
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("சுயவிவரம் சேமிக்கப்பட்டது ✅");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not signed in");
      const path = `${user.id}/avatar-${Date.now()}-${file.name.replace(/[^\w.-]/g, "")}`;
      const { error } = await supabase.storage.from("memories").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("memories").createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ avatar_url: data?.signedUrl ?? null })
        .eq("id", user.id);
      if (pErr) throw pErr;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("புகைப்படம் மாற்றப்பட்டது 💙");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({
        password: pw.next,
        ...({ current_password: pw.current } as Record<string, string>),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPw({ current: "", next: "" });
      toast.success("கடவுச்சொல் மாற்றப்பட்டது ✅");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <GlassCard>
        <CardTitle icon="⚙️" title="என் சுயவிவரம்" subtitle={profile?.email ?? user?.email ?? ""} />
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="size-16 rounded-2xl border border-glass-border object-cover"
            />
          ) : (
            <span className="gradient-blue grid size-16 place-items-center rounded-2xl text-xl font-bold text-primary-foreground">
              {(profile?.full_name ?? "B").charAt(0).toUpperCase()}
            </span>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="tamil flex items-center gap-2 rounded-2xl border border-glass-border px-3 py-2 text-xs disabled:opacity-50"
          >
            <Camera className="size-4 text-primary" /> புகைப்படம் மாற்று
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar.mutate(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="tamil text-xs text-muted-foreground">பெயர்</label>
            <input
              className={field}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="tamil text-xs text-muted-foreground">கைபேசி</label>
            <input
              className={field}
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="tamil text-xs text-muted-foreground">பிறந்த நாள்</label>
            <input
              className={field}
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
          </div>
          <div>
            <label className="tamil text-xs text-muted-foreground">இரத்த வகை</label>
            <input
              className={field}
              placeholder="O+"
              value={form.blood_group}
              onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="tamil text-xs text-muted-foreground">முகவரி</label>
            <textarea
              className={field}
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !form.full_name.trim()}
          className="gradient-blue glow-sm tamil mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Save className="size-4" /> சேமி / Save
        </button>
      </GlassCard>

      <GlassCard>
        <CardTitle icon="🔐" title="கடவுச்சொல் மாற்று" subtitle="Change password" />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className={field}
            type="password"
            autoComplete="current-password"
            placeholder="தற்போதைய கடவுச்சொல்"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
          />
          <input
            className={field}
            type="password"
            autoComplete="new-password"
            placeholder="புதிய கடவுச்சொல்"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
          />
        </div>
        <button
          onClick={() => changePassword.mutate()}
          disabled={changePassword.isPending || pw.next.length < 6 || pw.current.length < 6}
          className="tamil mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-glass-border py-3 text-sm font-semibold disabled:opacity-50"
        >
          <KeyRound className="size-4 text-primary" /> மாற்று / Update
        </button>
      </GlassCard>
    </AppShell>
  );
}
