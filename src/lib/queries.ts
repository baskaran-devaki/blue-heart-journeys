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
    const [{ data, error }, { data: invites }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, avatar_url, last_seen, dob, blood_group, address, active",
        )
        .order("full_name"),
      supabase
        .from("member_invites")
        .select("id, full_name, email, phone, avatar_url, dob, blood_group, address, active")
        .eq("active", true),
    ]);
    if (error) throw error;
    const rows = data ?? [];
    const seen = new Set(rows.map((r) => (r.email || "").toLowerCase()));
    const pending = (invites ?? [])
      .filter((i) => !seen.has((i.email || "").toLowerCase()))
      .map((i) => ({
        id: i.id,
        full_name: i.full_name,
        email: i.email,
        phone: i.phone,
        avatar_url: i.avatar_url,
        last_seen: new Date(0).toISOString(),
        dob: i.dob,
        blood_group: i.blood_group,
        address: i.address,
        active: i.active,
      }));
    return [...rows, ...pending].sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || ""),
    );
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

export const memberInvitesQuery = queryOptions({
  queryKey: ["member_invites"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("member_invites")
      .select("*")
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  },
});

export function tripSongsQuery(tripId?: string | null) {
  return queryOptions({
    queryKey: ["trip-songs", tripId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("trip_songs").select("*").order("created_at", { ascending: false });
      if (tripId) q = q.eq("trip_id", tripId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function liveViewersQuery(sessionId?: string | null) {
  return queryOptions({
    queryKey: ["live-viewers", sessionId],
    enabled: !!sessionId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 90_000).toISOString();
      const { data, error } = await supabase
        .from("live_viewers")
        .select("*")
        .eq("session_id", sessionId!)
        .gt("last_seen", since)
        .order("last_seen", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  refetchInterval: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return data ?? [];
  },
});

export const tripFinancialsQuery = queryOptions({
  queryKey: ["trip-financials"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("trip_financials")
      .select("*")
      .order("archived_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const favouriteVideosQuery = queryOptions({
  queryKey: ["favourite-videos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("favourite_videos")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});
