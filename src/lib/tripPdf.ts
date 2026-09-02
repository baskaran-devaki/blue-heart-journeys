import { money, tamilDate } from "@/lib/bhg";

export type TripReport = {
  trip_name: string;
  start_date: string | null;
  end_date: string | null;
  total_budget: number;
  amount_per_member: number;
  total_collection: number;
  total_expenses: number;
  final_balance: number;
  snapshot: {
    payments?: {
      member?: string;
      amount?: number;
      utr?: string;
      status?: string;
      created_at?: string;
    }[];
    transactions?: {
      type?: string;
      title?: string;
      category?: string;
      amount?: number;
      txn_date?: string;
    }[];
  } | null;
};

function esc(v: unknown) {
  return String(v ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

function reportHtml(r: TripReport) {
  const pays = r.snapshot?.payments ?? [];
  const txns = r.snapshot?.transactions ?? [];
  const rows = (arr: string[][]) =>
    arr.map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");

  return `<!doctype html><html lang="ta"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(r.trip_name)} – Trip Financial Report</title>
<style>
  *{box-sizing:border-box}
  body{font-family:"Noto Sans Tamil",system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:24px;background:#f4f7fb;color:#0b1a33}
  .sheet{max-width:820px;margin:0 auto;background:#fff;border-radius:18px;padding:28px;box-shadow:0 10px 30px rgba(10,30,70,.08)}
  h1{margin:0;font-size:22px;color:#0b3fa8}
  h2{margin:26px 0 8px;font-size:15px;color:#0b3fa8}
  .sub{color:#5b6b86;font-size:13px;margin-top:4px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-top:18px}
  .box{border:1px solid #e2e9f5;border-radius:12px;padding:12px}
  .box span{display:block;font-size:11px;color:#5b6b86}
  .box b{font-size:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border-bottom:1px solid #e8eef8;padding:7px 6px;text-align:left}
  th{background:#f0f5ff;color:#0b3fa8}
  .foot{margin-top:24px;font-size:11px;color:#7a8aa5;text-align:center}
  @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border-radius:0}}
</style></head><body><div class="sheet">
  <h1>💙 BLUE HEART GUYS — ${esc(r.trip_name)}</h1>
  <p class="sub">சூறாவளி சுற்றுப்பயணம் • ${esc(tamilDate(r.start_date))} → ${esc(tamilDate(r.end_date))}</p>
  <div class="grid">
    <div class="box"><span>Total Budget</span><b>${esc(money(r.total_budget))}</b></div>
    <div class="box"><span>Amount / Member</span><b>${esc(money(r.amount_per_member))}</b></div>
    <div class="box"><span>Verified Collection</span><b>${esc(money(r.total_collection))}</b></div>
    <div class="box"><span>Total Expenses</span><b>${esc(money(r.total_expenses))}</b></div>
    <div class="box"><span>Final Balance</span><b>${esc(money(r.final_balance))}</b></div>
  </div>
  <h2>Member Payments</h2>
  <table><thead><tr><th>Member</th><th>Amount</th><th>UTR</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>${
    pays.length
      ? rows(
          pays.map((p) => [
            esc(p.member),
            esc(money(p.amount ?? 0)),
            esc(p.utr),
            esc(p.status),
            esc(tamilDate(p.created_at ?? null)),
          ]),
        )
      : `<tr><td colspan="5">No payments recorded</td></tr>`
  }</tbody></table>
  <h2>Expenses & Transactions</h2>
  <table><thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Type</th><th>Amount</th></tr></thead>
  <tbody>${
    txns.length
      ? rows(
          txns.map((t) => [
            esc(tamilDate(t.txn_date ?? null)),
            esc(t.title),
            esc(t.category),
            esc(t.type),
            esc(money(t.amount ?? 0)),
          ]),
        )
      : `<tr><td colspan="5">No transactions recorded</td></tr>`
  }</tbody></table>
  <p class="foot">💙 BLUE HEART GUYS • நட்பு • பயணம் • நினைவுகள் • ஒற்றுமை</p>
</div></body></html>`;
}

export function openTripReport(r: TripReport, print = false) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(reportHtml(r));
  w.document.close();
  w.document.title = `${r.trip_name} – Trip Financial Report`;
  if (print) w.setTimeout(() => w.print(), 400);
  return true;
}
