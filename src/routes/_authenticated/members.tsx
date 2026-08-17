import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, IndianRupee, Clock } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { currentTripQuery, participationQuery, paymentsQuery, profilesQuery } from "@/lib/queries";
import { money, upiLink, UPI_ID } from "@/lib/bhg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({
    meta: [
      { title: "👥 Members – BLUE HEART GUYS" },
      {
        name: "description",
        content: "BLUE HEART GUYS உறுப்பினர்கள், பயண உறுதிப்படுத்தல் மற்றும் பணம் செலுத்தும் நிலை.",
      },
      { property: "og:title", content: "👥 Members – BLUE HEART GUYS" },
      { property: "og:description", content: "உறுப்பினர் உறுதி மற்றும் payment நிலை." },
    ],
  }),
  component: MembersPage,
});

function MembersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: trip } = useQuery(currentTripQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const { data: participation } = useQuery(participationQuery(trip?.id));
  const { data: payments } = useQuery(paymentsQuery(trip?.id));
  const [utr, setUtr] = useState("");

  const amount = Number(trip?.budget_per_person ?? 0);

  const setStatus = useMutation({
    mutationFn: async (status: "confirmed" | "not_interested") => {
      if (!trip || !user) throw new Error("No active trip");
      const { error } = await supabase
        .from("trip_participation")
        .upsert(
          { trip_id: trip.id, user_id: user.id, status, updated_at: new Date().toISOString() },
          { onConflict: "trip_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["participation"] });
      toast.success("பதிவு செய்யப்பட்டது");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitUtr = useMutation({
    mutationFn: async () => {
      if (!trip || !user) throw new Error("No active trip");
      const { error } = await supabase.from("payments").insert({
        trip_id: trip.id,
        user_id: user.id,
        amount,
        utr: utr.trim(),
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setUtr("");
      void qc.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment Verification Pending");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const myPart = participation?.find((p) => p.user_id === user?.id);
  const myPayments = (payments ?? []).filter((p) => p.user_id === user?.id);
  const myVerified = myPayments.some((p) => p.status === "verified");
  const myPending = myPayments.some((p) => p.status === "pending");

  const online = (lastSeen: string) => Date.now() - new Date(lastSeen).getTime() < 90_000;

  return (
    <AppShell>
      <GlassCard>
        <CardTitle
          icon="👥"
          title="MEMBERS"
          subtitle={trip ? `${trip.name} – ${money(amount)} / நபர்` : "தற்போது பயணம் இல்லை"}
        />

        {trip ? (
          <div className="mb-4 rounded-2xl border border-glass-border bg-secondary/30 p-3">
            <p className="tamil text-xs font-semibold">உங்கள் முடிவு</p>
            {myVerified ? (
              <p className="tamil mt-2 text-sm font-semibold text-success">✅ Payment Done</p>
            ) : myPart?.status === "not_interested" ? (
              <p className="tamil mt-2 text-sm font-semibold text-destructive">❌ Not Interested</p>
            ) : myPart?.status === "confirmed" ? (
              <div className="mt-2 space-y-2">
                <p className="tamil text-xs">
                  செலுத்த வேண்டிய தொகை: <span className="font-bold">{money(amount)}</span>
                </p>
                <a
                  href={upiLink(amount, `BHG ${trip.name}`)}
                  className="gradient-blue tamil flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <IndianRupee className="size-4" /> Pay via UPI ({UPI_ID})
                </a>
                {myPending ? (
                  <p className="tamil flex items-center gap-1.5 text-xs text-warning">
                    <Clock className="size-3.5" /> Payment Verification Pending
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      placeholder="UTR / Reference No"
                      className="min-w-[10rem] flex-1 rounded-2xl border border-glass-border bg-secondary/50 px-3 py-2 text-xs outline-none"
                    />
                    <button
                      onClick={() => submitUtr.mutate()}
                      disabled={utr.trim().length < 4 || submitUtr.isPending}
                      className="tamil rounded-2xl border border-glass-border px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"
                    >
                      சமர்ப்பி
                    </button>
                  </div>
                )}
                <p className="tamil text-[10px] text-muted-foreground">
                  Admin சரிபார்த்த பிறகு ✅ Payment Done காட்டப்படும்.
                </p>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setStatus.mutate("confirmed")}
                  className="gradient-blue tamil flex-1 rounded-2xl py-2.5 text-xs font-semibold text-primary-foreground"
                >
                  <Check className="mr-1 inline size-3.5" /> Confirm
                </button>
                <button
                  onClick={() => setStatus.mutate("not_interested")}
                  className="tamil flex-1 rounded-2xl border border-glass-border py-2.5 text-xs font-semibold text-muted-foreground"
                >
                  <X className="mr-1 inline size-3.5" /> Not Interested
                </button>
              </div>
            )}
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-2">
          {(profiles ?? []).map((m) => {
            const part = participation?.find((p) => p.user_id === m.id);
            const pay = (payments ?? []).filter((p) => p.user_id === m.id);
            const verified = pay.some((p) => p.status === "verified");
            const pending = pay.some((p) => p.status === "pending");
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-glass-border bg-secondary/25 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      online(m.last_seen) ? "bg-success" : "bg-muted-foreground/40",
                    )}
                  />
                  <p className="tamil truncate text-sm">{m.full_name}</p>
                </div>
                <span className="tamil shrink-0 text-[11px]">
                  {verified ? (
                    <span className="text-success">✅ Payment Done</span>
                  ) : pending ? (
                    <span className="text-warning">⏳ Verification Pending</span>
                  ) : part?.status === "confirmed" ? (
                    <span className="text-primary">✔ Confirm</span>
                  ) : part?.status === "not_interested" ? (
                    <span className="text-destructive">❌ Not Interested</span>
                  ) : (
                    <span className="text-muted-foreground">— காத்திருப்பு</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </AppShell>
  );
}
