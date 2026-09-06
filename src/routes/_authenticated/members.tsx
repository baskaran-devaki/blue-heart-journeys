import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, IndianRupee, Clock, Phone, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { currentTripQuery, participationQuery, paymentsQuery, profilesQuery } from "@/lib/queries";
import { money, tamilDate, upiLink, UPI_ID } from "@/lib/bhg";
import { instalmentPlan, memberPayState } from "@/lib/payments";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({
    meta: [
      { title: "👥 Friends – BLUE HEART GUYS" },
      {
        name: "description",
        content: "BLUE HEART GUYS உறுப்பினர்கள், பயண உறுதிப்படுத்தல் மற்றும் பணம் செலுத்தும் நிலை.",
      },
      { property: "og:title", content: "👥 Friends – BLUE HEART GUYS" },
      { property: "og:description", content: "உறுப்பினர் உறுதி மற்றும் payment நிலை." },
    ],
  }),
  component: MembersPage,
});

type MemberRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  last_seen: string;
  dob: string | null;
  blood_group: string;
  address: string;
  active: boolean;
};

const waNumber = (phone: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
};

function MemberAvatar({ m, size }: { m: MemberRow; size: string }) {
  return m.avatar_url ? (
    <img
      src={m.avatar_url}
      alt={m.full_name}
      className={cn(size, "shrink-0 rounded-full border border-glass-border object-cover")}
    />
  ) : (
    <span
      className={cn(
        size,
        "gradient-blue grid shrink-0 place-items-center rounded-full text-base font-bold text-primary-foreground",
      )}
    >
      {(m.full_name || "B").charAt(0).toUpperCase()}
    </span>
  );
}

function MembersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: trip } = useQuery(currentTripQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const { data: participation } = useQuery(participationQuery(trip?.id));
  const { data: payments } = useQuery(paymentsQuery(trip?.id));
  const [utr, setUtr] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [instalment, setInstalment] = useState(1);
  const [open, setOpen] = useState<MemberRow | null>(null);

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
      const value = Number(payAmount || 0);
      if (value <= 0) throw new Error("Enter the amount you paid");
      const { error } = await supabase.from("payments").insert({
        trip_id: trip.id,
        user_id: user.id,
        amount: value,
        utr: utr.trim(),
        status: "pending",
        instalment_no: instalment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setUtr("");
      setPayAmount("");
      void qc.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment Verification Pending");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const myPart = participation?.find((p) => p.user_id === user?.id);
  const myPayments = (payments ?? []).filter((p) => p.user_id === user?.id);
  const state = memberPayState(payments ?? [], user?.id, amount);
  const plan = instalmentPlan(amount);

  const online = (lastSeen: string) => Date.now() - new Date(lastSeen).getTime() < 90_000;

  return (
    <AppShell>
      <GlassCard>
        <CardTitle
          icon="👥"
          title="FRIENDS"
          subtitle={trip ? `${trip.name} – ${money(amount)} / நபர்` : "தற்போது பயணம் இல்லை"}
        />

        {trip ? (
          <div className="mb-4 rounded-2xl border border-glass-border bg-secondary/30 p-3">
            <p className="tamil text-xs font-semibold">உங்கள் முடிவு</p>
            {state.status === "done" ? (
              <p className="tamil mt-2 text-sm font-semibold text-success">
                ✅ Payment Done • {money(state.verified)}
              </p>
            ) : myPart?.status === "not_interested" ? (
              <p className="tamil mt-2 text-sm font-semibold text-destructive">❌ Not Interested</p>
            ) : myPart?.status === "confirmed" ? (
              <div className="mt-2 space-y-2">
                <p className="tamil text-xs">
                  மொத்த தொகை: <span className="font-bold">{money(amount)}</span> • Paid{" "}
                  <span className="font-bold text-success">{money(state.verified)}</span> • Balance{" "}
                  <span className="font-bold text-warning">{money(state.remaining)}</span>
                </p>
                <p className={cn("tamil text-xs font-semibold", state.tone)}>{state.label}</p>
                <div className="rounded-xl border border-glass-border px-3 py-2">
                  <p className="text-xs font-semibold">GPay or PhonePe: 8754745474</p>
                  <p className="text-xs font-semibold">Name: BASKARAN R</p>
                </div>
                <a
                  href="upi://pay"
                  className="gradient-blue tamil flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <IndianRupee className="size-4" /> Pay via UPI
                </a>
                {state.pending > 0 ? (
                  <p className="tamil flex items-center gap-1.5 text-xs text-warning">
                    <Clock className="size-3.5" /> {money(state.pending)} Verification Pending
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <input
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    inputMode="decimal"
                    placeholder="₹ செலுத்திய தொகை"
                    className="min-w-[8rem] flex-1 rounded-2xl border border-glass-border bg-secondary/50 px-3 py-2 text-xs outline-none"
                  />
                  <input
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="UTR / Reference No"
                    className="min-w-[10rem] flex-1 rounded-2xl border border-glass-border bg-secondary/50 px-3 py-2 text-xs outline-none"
                  />
                  <button
                    onClick={() => submitUtr.mutate()}
                    disabled={
                      utr.trim().length < 4 || Number(payAmount || 0) <= 0 || submitUtr.isPending
                    }
                    className="tamil rounded-2xl border border-glass-border px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"
                  >
                    சமர்ப்பி
                  </button>
                </div>
                {myPayments.length ? (
                  <div className="space-y-1">
                    {myPayments.map((p) => (
                      <p key={p.id} className="text-[10px] text-muted-foreground">
                        #{p.instalment_no} • {money(p.amount)} • UTR {p.utr} •{" "}
                        <span
                          className={
                            p.status === "verified"
                              ? "text-success"
                              : p.status === "rejected"
                                ? "text-destructive"
                                : "text-warning"
                          }
                        >
                          {p.status}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : null}
                <p className="tamil text-[10px] text-muted-foreground">
                  Admin சரிபார்த்த பிறகு மட்டுமே தொகை wallet-ல் சேரும்.
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

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {((profiles ?? []) as MemberRow[]).map((m) => (
            <button
              key={m.id}
              onClick={() => setOpen(m)}
              className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-glass-border bg-secondary/25 p-3 text-center transition-transform active:scale-[0.98]"
            >
              <MemberAvatar m={m} size="size-16" />
              <p className="tamil w-full truncate text-sm font-semibold">{m.full_name}</p>
              <p className="w-full truncate text-[11px] text-muted-foreground">{m.phone || "—"}</p>
              <div className="flex w-full gap-2">
                <a
                  href={m.phone ? `tel:${m.phone.replace(/\s/g, "")}` : undefined}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Call ${m.full_name}`}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-glass-border py-1.5 text-[10px] font-semibold text-primary"
                >
                  <Phone className="size-3.5" /> Call
                </a>
                <a
                  href={waNumber(m.phone) ? `https://wa.me/${waNumber(m.phone)}` : undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`WhatsApp ${m.full_name}`}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-glass-border py-1.5 text-[10px] font-semibold text-success"
                >
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
              </div>
            </button>
          ))}
        </div>
      </GlassCard>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 p-3 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(null)}
        >
          <div
            className="glass w-full max-w-md rounded-3xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-w-0 items-center gap-3">
              <MemberAvatar m={open} size="size-20" />
              <div className="min-w-0">
                <p className="tamil truncate text-base font-bold">{open.full_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{open.email || "—"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px]">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      online(open.last_seen) ? "bg-success" : "bg-muted-foreground/40",
                    )}
                  />
                  {online(open.last_seen) ? "Online" : "Offline"} •{" "}
                  {open.active ? (
                    <span className="text-success">Active account</span>
                  ) : (
                    <span className="text-destructive">Disabled</span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
              <p className="tamil truncate">📞 {open.phone || "—"}</p>
              <p className="tamil truncate">🩸 {open.blood_group || "—"}</p>
              <p className="tamil truncate">🎂 {open.dob ? tamilDate(open.dob) : "—"}</p>
              <p className="tamil break-words sm:col-span-2">📍 {open.address || "—"}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={open.phone ? `tel:${open.phone.replace(/\s/g, "")}` : undefined}
                className="gradient-blue flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold text-primary-foreground"
              >
                <Phone className="size-4" /> Call
              </a>
              <a
                href={waNumber(open.phone) ? `https://wa.me/${waNumber(open.phone)}` : undefined}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-glass-border py-2.5 text-xs font-semibold text-success"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <button
                onClick={() => setOpen(null)}
                className="tamil rounded-2xl border border-glass-border px-4 py-2.5 text-xs"
              >
                மூடு
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
