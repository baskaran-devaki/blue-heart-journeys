import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { activeLiveQuery, currentTripQuery, paymentsQuery, profilesQuery } from "@/lib/queries";
import { money } from "@/lib/bhg";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "🛡 Admin Panel – BLUE HEART GUYS" },
      {
        name: "description",
        content: "Admin panel – phone approvals, payment verification, wallet entries and live control.",
      },
      { property: "og:title", content: "🛡 Admin Panel – BLUE HEART GUYS" },
      { property: "og:description", content: "Manage members, payments, wallet and live stream." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: trip } = useQuery(currentTripQuery);
  const { data: payments } = useQuery(paymentsQuery(trip?.id));
  const { data: profiles } = useQuery(profilesQuery);
  const { data: live } = useQuery(activeLiveQuery);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [expense, setExpense] = useState({ amount: "", note: "" });

  const { data: allowed } = useQuery({
    queryKey: ["allowed_phones"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_phones")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addPhone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("allowed_phones")
        .insert({ phone: phone.trim(), full_name: name.trim() || "Member" });
      if (error) throw error;
    },
    onSuccess: () => {
      setPhone("");
      setName("");
      void qc.invalidateQueries({ queryKey: ["allowed_phones"] });
      toast.success("எண் அனுமதிக்கப்பட்டது");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyPayment = useMutation({
    mutationFn: async (p: { id: string; user_id: string; amount: number }) => {
      const { error } = await supabase
        .from("payments")
        .update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("id", p.id);
      if (error) throw error;
      const { error: wErr } = await supabase.from("wallet_transactions").insert({
        trip_id: trip?.id ?? null,
        type: "income",
        amount: p.amount,
        category: "member_payment",
        note: profiles?.find((x) => x.id === p.user_id)?.full_name ?? "Member payment",
      });
      if (wErr) throw wErr;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Payment verified ✅");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("wallet_transactions").insert({
        trip_id: trip?.id ?? null,
        type: "expense",
        amount: Number(expense.amount),
        category: "trip_expense",
        note: expense.note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setExpense({ amount: "", note: "" });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("செலவு பதிவானது");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setLive = useMutation({
    mutationFn: async (action: "start" | "stop") => {
      if (action === "stop") {
        const { error } = await supabase
          .from("live_sessions")
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq("is_active", true);
        if (error) throw error;
        return;
      }
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("live_sessions").insert({
        trip_id: trip?.id ?? null,
        title: trip?.name ?? "BLUE HEART GUYS Live",
        stream_url: streamUrl.trim(),
        host_id: userRes.user!.id,
        host_name: profiles?.find((p) => p.id === userRes.user?.id)?.full_name ?? "Admin",
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["live"] });
      toast.success("Live நிலை மாற்றப்பட்டது");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <AppShell>
        <GlassCard>
          <p className="tamil text-sm">இந்த பகுதி Admin-க்கு மட்டும் 🔒</p>
        </GlassCard>
      </AppShell>
    );
  }

  const pending = (payments ?? []).filter((p) => p.status === "pending");

  return (
    <AppShell>
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
      <GlassCard>
        <CardTitle icon="📱" title="Approved Phones" subtitle="அனுமதிக்கப்பட்ட எண்கள்" />
        <div className="flex flex-wrap gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91XXXXXXXXXX"
            className="min-w-[9rem] flex-1 rounded-2xl border border-glass-border bg-secondary/40 px-3 py-2 text-xs outline-none"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="பெயர்"
            className="w-full min-w-0 sm:w-24 rounded-2xl border border-glass-border bg-secondary/40 px-3 py-2 text-xs outline-none"
          />
          <button
            onClick={() => addPhone.mutate()}
            disabled={phone.trim().length < 10}
            className="gradient-blue rounded-2xl px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {(allowed ?? []).map((a) => (
            <p key={a.phone} className="tamil truncate text-[11px] text-muted-foreground">
              {a.full_name} — {a.phone}
            </p>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <CardTitle icon="✅" title="Payment Verification" subtitle={`${pending.length} pending`} />
        {pending.length === 0 ? (
          <p className="tamil text-xs text-muted-foreground">நிலுவையில் எதுவும் இல்லை.</p>
        ) : null}
        <div className="space-y-2">
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-glass-border bg-secondary/25 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="tamil truncate text-xs font-semibold">
                  {profiles?.find((x) => x.id === p.user_id)?.full_name ?? "Member"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {money(Number(p.amount))} • UTR {p.utr}
                </p>
              </div>
              <button
                onClick={() => verifyPayment.mutate({ id: p.id, user_id: p.user_id, amount: Number(p.amount) })}
                className="gradient-blue shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
              >
                Verify
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <CardTitle icon="🧾" title="Add Expense" subtitle="செலவு பதிவு" />
        <div className="flex flex-wrap gap-2">
          <input
            value={expense.amount}
            onChange={(e) => setExpense((s) => ({ ...s, amount: e.target.value }))}
            inputMode="numeric"
            placeholder="₹ தொகை"
            className="w-full min-w-0 sm:w-24 rounded-2xl border border-glass-border bg-secondary/40 px-3 py-2 text-xs outline-none"
          />
          <input
            value={expense.note}
            onChange={(e) => setExpense((s) => ({ ...s, note: e.target.value }))}
            placeholder="விவரம்"
            className="min-w-[9rem] flex-1 rounded-2xl border border-glass-border bg-secondary/40 px-3 py-2 text-xs outline-none"
          />
          <button
            onClick={() => addExpense.mutate()}
            disabled={!Number(expense.amount)}
            className="gradient-blue rounded-2xl px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <CardTitle icon="🔴" title="Live Control" subtitle={live ? "நேரலை இயங்குகிறது" : "நேரலை இல்லை"} />
        {live ? (
          <button
            onClick={() => setLive.mutate("stop")}
            className="tamil w-full rounded-2xl border border-destructive/50 py-2.5 text-xs font-semibold text-destructive"
          >
            நேரலையை நிறுத்து
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="YouTube Live URL"
              className="min-w-[9rem] flex-1 rounded-2xl border border-glass-border bg-secondary/40 px-3 py-2 text-xs outline-none"
            />
            <button
              onClick={() => setLive.mutate("start")}
              disabled={streamUrl.trim().length < 8}
              className="gradient-blue rounded-2xl px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              Go Live
            </button>
          </div>
        )}
      </GlassCard>
      </div>
    </AppShell>
  );
}
