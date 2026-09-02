export type PaymentRow = {
  id: string;
  user_id: string;
  amount: number;
  utr: string;
  status: string;
  instalment_no?: number | null;
  created_at: string;
  verified_at?: string | null;
};

/** Split the trip amount into 4 instalments (40% / 30% / 20% / 10%). */
export function instalmentPlan(total: number): number[] {
  const t = Math.max(0, Number(total) || 0);
  if (!t) return [0, 0, 0, 0];
  const parts = [0.4, 0.3, 0.2, 0.1].map((p) => Math.round(t * p));
  const diff = t - parts.reduce((s, v) => s + v, 0);
  parts[0] = (parts[0] ?? 0) + diff;
  return parts;
}

export type PayState = {
  verified: number;
  pending: number;
  remaining: number;
  status: "none" | "pending" | "partial" | "done" | "rejected";
  label: string;
  tone: string;
};

export function memberPayState(
  payments: PaymentRow[],
  userId: string | undefined,
  tripAmount: number,
): PayState {
  const mine = payments.filter((p) => p.user_id === userId);
  const verified = mine
    .filter((p) => p.status === "verified")
    .reduce((s, p) => s + Number(p.amount), 0);
  const pending = mine
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Number(tripAmount || 0) - verified);

  if (tripAmount > 0 && verified >= tripAmount) {
    return {
      verified,
      pending,
      remaining: 0,
      status: "done",
      label: "✅ Payment Done",
      tone: "text-success",
    };
  }
  if (pending > 0) {
    return {
      verified,
      pending,
      remaining,
      status: "pending",
      label: verified > 0 ? "🟡 Partially Paid • verification pending" : "⏳ Pending verification",
      tone: "text-warning",
    };
  }
  if (verified > 0) {
    return {
      verified,
      pending,
      remaining,
      status: "partial",
      label: "🟡 Partially Paid",
      tone: "text-warning",
    };
  }
  if (mine.length && mine.every((p) => p.status === "rejected")) {
    return {
      verified,
      pending,
      remaining,
      status: "rejected",
      label: "❌ Rejected",
      tone: "text-destructive",
    };
  }
  return { verified, pending, remaining, status: "none", label: "⏳ Pending", tone: "text-warning" };
}
