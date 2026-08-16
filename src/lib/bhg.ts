import { supabase } from "@/integrations/supabase/client";
import destHills from "@/assets/dest-hills.jpg";
import destBeach from "@/assets/dest-beach.jpg";
import friendsTrip from "@/assets/friends-trip.jpg";

export const UPI_ID = "asalbaskar@sbi";
export const UPI_PAYEE = "BLUE HEART GUYS";

export const FALLBACK_IMAGES = [destHills, destBeach, friendsTrip];

export function money(value: number | null | undefined) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function tamilDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function totalDays(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function upiLink(amount: number, note: string) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_PAYEE,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note.slice(0, 60),
  });
  return `upi://pay?${params.toString()}`;
}

export const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  upcoming: { label: "🟢 Upcoming", dot: "bg-success", badge: "text-success" },
  live: { label: "🔴 Live", dot: "bg-live", badge: "text-live" },
  completed: { label: "🔵 Completed", dot: "bg-primary", badge: "text-primary" },
  coming_soon: { label: "🟡 Coming Soon", dot: "bg-warning", badge: "text-warning" },
};

/** Signed URL for a private storage object (buckets are private by design). */
export async function signedUrl(bucket: string, path: string, seconds = 3600) {
  if (/^https?:\/\//.test(path)) return path;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? "";
}

export async function signedUrls(bucket: string, paths: string[], seconds = 3600) {
  const remote = paths.filter((p) => !/^https?:\/\//.test(p));
  const map = new Map<string, string>();
  paths.filter((p) => /^https?:\/\//.test(p)).forEach((p) => map.set(p, p));
  if (remote.length) {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(remote, seconds);
    data?.forEach((item) => {
      if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
    });
  }
  return map;
}

/** Kural of the day: same kural for the whole calendar day, scheduled ones win. */
export function pickKuralOfDay<T extends { scheduled_date: string | null }>(rows: T[]): T | null {
  if (!rows.length) return null;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  const scheduled = rows.find((r) => r.scheduled_date === iso);
  if (scheduled) return scheduled;
  const pool = rows.filter((r) => !r.scheduled_date);
  const list = pool.length ? pool : rows;
  const dayNumber = Math.floor(new Date(iso).getTime() / 86_400_000);
  return list[dayNumber % list.length] ?? null;
}
