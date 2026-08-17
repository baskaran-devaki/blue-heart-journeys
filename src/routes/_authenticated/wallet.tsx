import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, IndianRupee } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { currentTripQuery, paymentsQuery, walletQuery, walletTotals } from "@/lib/queries";
import { dateTime, money, upiLink, UPI_ID } from "@/lib/bhg";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "💰 Wallet – BLUE HEART GUYS" },
      {
        name: "description",
        content: "குழு wallet – மொத்த வரவு, செலவு, இருப்பு மற்றும் பண பரிவர்த்தனை வரலாறு.",
      },
      { property: "og:title", content: "💰 Wallet – BLUE HEART GUYS" },
      { property: "og:description", content: "Total collection, expenses, balance and history." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();
  const { data: trip } = useQuery(currentTripQuery);
  const { data: txns } = useQuery(walletQuery(null));
  const { data: payments } = useQuery(paymentsQuery(trip?.id));
  const [showPay, setShowPay] = useState(false);
  const totals = walletTotals(txns ?? []);
  const amount = Number(trip?.budget_per_person ?? 0);
  const myPending = (payments ?? []).filter(
    (p) => p.user_id === user?.id && p.status === "pending",
  );

  return (
    <AppShell>
      <GlassCard>
        <CardTitle icon="💰" title="WALLET" subtitle="குழு நிதி நிலவரம்" />
        <div className="gradient-blue glow-sm rounded-3xl p-4 text-primary-foreground">
          <p className="tamil text-[11px] opacity-80">Available Amount</p>
          <p className="text-3xl font-bold">{money(totals.balance)}</p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">Total Collection</p>
            <p className="text-sm font-bold text-success">{money(totals.income)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">Total Expenses</p>
            <p className="text-sm font-bold text-destructive">{money(totals.expense)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">Current Balance</p>
            <p className="text-sm font-bold text-primary">{money(totals.balance)}</p>
          </div>
        </div>

        <button
          onClick={() => setShowPay((v) => !v)}
          className="gradient-blue tamil mt-3 w-full rounded-2xl py-3 text-sm font-semibold text-primary-foreground"
        >
          <IndianRupee className="mr-1 inline size-4" /> Add Money
        </button>

        {showPay ? (
          <div className="mt-3 space-y-2 rounded-2xl border border-glass-border bg-secondary/30 p-3">
            <p className="tamil text-xs">
              UPI ID: <span className="font-semibold">{UPI_ID}</span>
            </p>
            {trip ? (
              <a
                href={upiLink(amount, `BHG ${trip.name}`)}
                className="tamil block rounded-2xl border border-glass-border py-2.5 text-center text-xs font-semibold text-primary"
              >
                {money(amount)} செலுத்த UPI செயலியை திற
              </a>
            ) : null}
            <p className="tamil text-[10px] text-muted-foreground">
              பணம் செலுத்திய பின் Members பக்கத்தில் UTR / Reference எண்ணை சமர்ப்பிக்கவும். Admin
              சரிபார்த்த பிறகே ✅ Payment Done ஆகும்.
            </p>
            {myPending.length ? (
              <p className="tamil text-[11px] text-warning">
                ⏳ {myPending.length} payment verification pending
              </p>
            ) : null}
          </div>
        ) : null}
      </GlassCard>

      <GlassCard>
        <CardTitle icon="🧾" title="Transaction History" subtitle="பரிவர்த்தனை வரலாறு" />
        <div className="space-y-2">
          {(txns ?? []).length === 0 ? (
            <p className="tamil text-xs text-muted-foreground">இன்னும் பரிவர்த்தனைகள் இல்லை.</p>
          ) : null}
          {(txns ?? []).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-2xl border border-glass-border bg-secondary/25 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                {t.type === "income" ? (
                  <ArrowDownLeft className="size-4 shrink-0 text-success" />
                ) : (
                  <ArrowUpRight className="size-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0">
                  <p className="tamil truncate text-xs">{t.note || t.category}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.category} • {dateTime(t.created_at)}
                  </p>
                </div>
              </div>
              <p
                className={
                  t.type === "income"
                    ? "shrink-0 text-sm font-bold text-success"
                    : "shrink-0 text-sm font-bold text-destructive"
                }
              >
                {t.type === "income" ? "+" : "-"}
                {money(t.amount)}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}
