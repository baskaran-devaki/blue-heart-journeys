import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, RotateCcw, FileText, Download } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import {
  allTripsQuery,
  currentTripQuery,
  paymentsQuery,
  profilesQuery,
  tripFinancialsQuery,
  walletQuery,
  walletTotals,
} from "@/lib/queries";
import { dateTime, money, tamilDate } from "@/lib/bhg";
import { memberPayState, type PaymentRow } from "@/lib/payments";
import { openTripReport, type TripReport } from "@/lib/tripPdf";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "💰 Wallet – BLUE HEART GUYS" },
      {
        name: "description",
        content: "குழு wallet – Available Amount, total collection, expenses மற்றும் பரிவர்த்தனை வரலாறு.",
      },
      { property: "og:title", content: "💰 Wallet – BLUE HEART GUYS" },
      { property: "og:description", content: "Verified collection, expenses and trip financial reports." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [confirmReset, setConfirmReset] = useState<string | null>(null);

  const { data: trip } = useQuery(currentTripQuery);
  const { data: trips } = useQuery(allTripsQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const { data: allTxns } = useQuery(walletQuery(null));
  const { data: allPayments } = useQuery(paymentsQuery(null));
  const { data: archives } = useQuery(tripFinancialsQuery);

  const tripId = trip?.id ?? null;
  const txns = (allTxns ?? []).filter((t) => !tripId || t.trip_id === tripId);
  const payments = ((allPayments ?? []) as PaymentRow[]).filter(
    (p) => !tripId || (p as unknown as { trip_id: string }).trip_id === tripId,
  );
  const totals = walletTotals(txns);
  const perMember = Number(trip?.budget_per_person ?? 0);
  const mine = memberPayState(payments, user?.id, perMember);

  const contributionName = (t: { category: string; note: string | null }) => {
    if (t.category !== "member_contribution") return null;
    const m = /UTR:\s*([^)]+)\)/.exec(t.note ?? "");
    const pay = (allPayments ?? []).find((p) => m && p.utr === m[1].trim());
    return pay ? (profiles?.find((pr) => pr.id === pay.user_id)?.full_name ?? null) : null;
  };

  const reset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("reset_trip_wallet", { _trip_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmReset(null);
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["trip-financials"] });
      toast.success("Wallet reset • financial records archived");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reportFor = (t: NonNullable<typeof trips>[number]): TripReport => {
    const archived = (archives ?? []).find((a) => a.trip_id === t.id);
    if (archived) {
      return {
        trip_name: archived.trip_name,
        start_date: archived.start_date,
        end_date: archived.end_date,
        total_budget: Number(archived.total_budget),
        amount_per_member: Number(archived.amount_per_member),
        total_collection: Number(archived.total_collection),
        total_expenses: Number(archived.total_expenses),
        final_balance: Number(archived.final_balance),
        snapshot: archived.snapshot as TripReport["snapshot"],
      };
    }
    const tTxns = (allTxns ?? []).filter((x) => x.trip_id === t.id);
    const tPays = (allPayments ?? []).filter((x) => x.trip_id === t.id);
    const tot = walletTotals(tTxns);
    return {
      trip_name: t.name,
      start_date: t.start_date,
      end_date: t.end_date,
      total_budget: Number(t.total_budget ?? 0),
      amount_per_member: Number(t.budget_per_person ?? 0),
      total_collection: tot.income,
      total_expenses: tot.expense,
      final_balance: tot.balance,
      snapshot: {
        payments: tPays.map((p) => ({
          member: profiles?.find((pr) => pr.id === p.user_id)?.full_name ?? "Member",
          amount: Number(p.amount),
          utr: p.utr,
          status: p.status,
          created_at: p.created_at,
        })),
        transactions: tTxns.map((x) => ({
          type: x.type,
          title: x.title,
          category: x.category,
          amount: Number(x.amount),
          txn_date: x.txn_date,
        })),
      },
    };
  };

  const completed = (trips ?? []).filter((t) => t.status === "completed" || t.status === "closed");

  return (
    <AppShell>
      <GlassCard>
        <CardTitle
          icon="💰"
          title="WALLET"
          subtitle={trip ? `${trip.name} • குழு நிதி நிலவரம்` : "குழு நிதி நிலவரம்"}
          action={
            isAdmin && tripId ? (
              <button
                onClick={() => setConfirmReset(tripId)}
                className="tamil flex shrink-0 items-center gap-1.5 rounded-full border border-destructive/60 px-3 py-2 text-[11px] font-semibold text-destructive"
              >
                <RotateCcw className="size-3.5" /> Reset Wallet
              </button>
            ) : null
          }
        />
        <div className="gradient-blue glow-sm rounded-3xl p-4 text-primary-foreground">
          <p className="tamil text-[11px] opacity-80">Available Amount</p>
          <p className="text-2xl font-bold break-words sm:text-3xl">{money(totals.balance)}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">Total Collection</p>
            <p className="text-sm font-bold text-success">{money(totals.income)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">Total Expenses</p>
            <p className="text-sm font-bold text-destructive">{money(totals.expense)}</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-secondary/40 p-2 sm:col-span-1">
            <p className="text-[10px] text-muted-foreground">Amount / Member</p>
            <p className="text-sm font-bold text-primary">{money(perMember)}</p>
          </div>
        </div>

        {confirmReset ? (
          <div className="mt-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-3">
            <p className="tamil text-[11px] break-words">
              இந்த பயணத்தின் wallet முழுவதும் ZERO ஆக்கப்படும் (collection, expenses, payments,
              transaction history). முழு நிதி விவரம் trip history/PDF-ல் நிரந்தரமாக சேமிக்கப்படும்.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => reset.mutate(confirmReset)}
                disabled={reset.isPending}
                className="rounded-2xl bg-destructive px-3 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-60"
              >
                Archive & Reset
              </button>
              <button
                onClick={() => setConfirmReset(null)}
                className="rounded-2xl border border-glass-border px-3 py-2 text-[11px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {trip ? (
          <div className="mt-3 space-y-2 rounded-2xl border border-glass-border bg-secondary/30 p-3">
            <p className="tamil text-[11px] text-muted-foreground">
              வரவு = Admin சரிபார்த்த உறுப்பினர் பணம் மட்டுமே. பணம் செலுத்த{" "}
              <span className="font-semibold text-primary">Friends</span> பக்கத்தை பயன்படுத்துங்கள்.
            </p>
            <p className={cn("tamil text-xs font-semibold", mine.tone)}>
              உங்கள் நிலை: {mine.label}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Paid {money(mine.verified)} / {money(perMember)}
              {mine.pending ? ` • ${money(mine.pending)} awaiting verification` : ""}
              {mine.remaining ? ` • Balance ${money(mine.remaining)}` : ""}
            </p>
          </div>
        ) : null}
      </GlassCard>

      {isAdmin && trip ? (
        <GlassCard>
          <CardTitle icon="🧮" title="Friend Payment Status" subtitle="verified பணத்தின் அடிப்படையில்" />
          <div className="space-y-2">
            {(profiles ?? []).map((m) => {
              const st = memberPayState(payments, m.id, perMember);
              return (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-glass-border bg-secondary/25 px-3 py-2"
                >
                  <p className="tamil min-w-0 flex-1 truncate text-xs font-semibold">{m.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {money(st.verified)} / {money(perMember)}
                  </p>
                  <p className={cn("text-[11px] font-semibold", st.tone)}>{st.label}</p>
                </div>
              );
            })}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard>
        <CardTitle icon="🧾" title="Transaction History" subtitle="பரிவர்த்தனை வரலாறு" />
        <div className="space-y-2">
          {txns.length === 0 ? (
            <p className="tamil text-xs text-muted-foreground">இன்னும் பரிவர்த்தனைகள் இல்லை.</p>
          ) : null}
          {txns.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-glass-border bg-secondary/25 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                {t.type === "income" ? (
                  <ArrowDownLeft className="size-4 shrink-0 text-success" />
                ) : (
                  <ArrowUpRight className="size-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0">
                  <p className="tamil truncate text-xs font-semibold">
                    {contributionName(t) ?? (t.title || t.category)}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {t.note || t.category} • {dateTime(t.created_at)}
                  </p>
                </div>
              </div>
              <p
                className={cn(
                  "text-sm font-bold",
                  t.type === "income" ? "text-success" : "text-destructive",
                )}
              >
                {t.type === "income" ? "+" : "−"}
                {money(t.amount)}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <CardTitle icon="📄" title="Completed Trip Reports" subtitle="நிரந்தர நிதி பதிவுகள் • PDF" />
        <div className="space-y-2">
          {completed.length === 0 ? (
            <p className="tamil text-xs text-muted-foreground">
              முடிந்த பயணங்கள் இன்னும் இல்லை.
            </p>
          ) : null}
          {completed.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-glass-border bg-secondary/25 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="tamil truncate text-xs font-semibold">{t.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {tamilDate(t.start_date)} → {tamilDate(t.end_date)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => openTripReport(reportFor(t))}
                  className="flex items-center gap-1 rounded-xl border border-glass-border px-2.5 py-1.5 text-[10px] font-semibold text-primary"
                >
                  <FileText className="size-3.5" /> View PDF
                </button>
                <button
                  onClick={() => openTripReport(reportFor(t), true)}
                  className="flex items-center gap-1 rounded-xl border border-glass-border px-2.5 py-1.5 text-[10px] font-semibold text-success"
                >
                  <Download className="size-3.5" /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}
