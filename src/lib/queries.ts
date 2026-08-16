import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const currentTripQuery = queryOptions({
  queryKey: ["trip", "current"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .in("status", ["live", "upcoming"])
      .order("start_date", { ascending: true, nullsFirst: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },
});

export const allTripsQuery = queryOptions({
  queryKey: ["trips", "all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("start_date", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  },
});

export function tripImagesQuery(tripId?: string | null) {
  return queryOptions({
    queryKey: ["trip-images", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_images")
        .select("*")
        .eq("trip_id", tripId!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function itineraryQuery(tripId?: string | null) {
  return queryOptions({
    queryKey: ["itinerary", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itinerary_days")
        .select("*")
        .eq("trip_id", tripId!)
        .order("day_no");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url, last_seen")
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  },
});

export function participationQuery(tripId?: string | null) {
  return queryOptions({
    queryKey: ["participation", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_participation")
        .select("*")
        .eq("trip_id", tripId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function paymentsQuery(tripId?: string | null) {
  return queryOptions({
    queryKey: ["payments", tripId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("payments").select("*").order("created_at", { ascending: false });
      if (tripId) q = q.eq("trip_id", tripId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function walletQuery(tripId?: string | null) {
  return queryOptions({
    queryKey: ["wallet", tripId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (tripId) q = q.eq("trip_id", tripId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function memoriesQuery(tripId?: string | null) {
  return queryOptions({
    queryKey: ["memories", tripId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("memories").select("*").order("created_at", { ascending: false });
      if (tripId) q = q.eq("trip_id", tripId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export const activeLiveQuery = queryOptions({
  queryKey: ["live", "active"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },
  refetchInterval: 15_000,
});

export function walletTotals(
  txns: { type: string; amount: number }[],
): { income: number; expense: number; balance: number } {
  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  return { income, expense, balance: income - expense };
}
