import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  activeLiveQuery,
  allTripsQuery,
  currentTripQuery,
  memberInvitesQuery,
  paymentsQuery,
  profilesQuery,
  walletQuery,
} from "@/lib/queries";
import { money, tamilDate } from "@/lib/bhg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "🛡 Admin Panel – BLUE HEART GUYS" },
      {
        name: "description",
        content:
          "Admin panel – member invitations, trip management, payment verification, expenses and live control.",
      },
      { property: "og:title", content: "🛡 Admin Panel – BLUE HEART GUYS" },
      {
        property: "og:description",
        content: "Manage members, trips, payments, expenses and the live stream.",
      },
    ],
  }),
  component: AdminPage,
});

const field =
  "w-full min-w-0 rounded-2xl border border-glass-border bg-secondary/40 px-3 py-2 text-xs outline-none";

type MemberForm = {
  id?: string;
  email: string;
  full_name: string;
  phone: string;
  dob: string;
  blood_group: string;
  address: string;
  role: "member" | "admin";
  active: boolean;
};

const emptyMember: MemberForm = {
  email: "",
  full_name: "",
  phone: "",
  dob: "",
  blood_group: "",
  address: "",
  role: "member",
  active: true,
};

type TripForm = {
  id?: string;
  name: string;
  destination: string;
  start_location: string;
  journey_places: string;
  start_date: string;
  end_date: string;
  details: string;
  budget_per_person: string;
  total_budget: string;
  status: "coming_soon" | "upcoming" | "active" | "live" | "completed" | "closed";
  maps_url: string;
  cover_image: string;
};

const emptyTrip: TripForm = {
  name: "",
  destination: "",
  start_location: "",
  journey_places: "",
  start_date: "",
  end_date: "",
  details: "",
  budget_per_person: "",
  total_budget: "",
  status: "upcoming",
  maps_url: "",
  cover_image: "",
};

const TAB_LIST = ["members", "trips", "payments", "expenses", "live"] as const;
type Tab = (typeof TAB_LIST)[number];
const TAB_LABEL: Record<Tab, string> = {
  members: "👥 Members",
  trips: "🧭 Trips",
  payments: "✅ Payments",
  expenses: "🧾 Expenses",
  live: "🔴 Live",
};

function AdminPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("members");
  const { data: trip } = useQuery(currentTripQuery);
  const { data: trips } = useQuery(allTripsQuery);
  const { data: payments } = useQuery(paymentsQuery(null));
  const { data: profiles } = useQuery(profilesQuery);
  const { data: live } = useQuery(activeLiveQuery);
  const { data: invites } = useQuery({ ...memberInvitesQuery, enabled: isAdmin });
  const { data: txns } = useQuery(walletQuery(null));

  const [member, setMember] = useState<MemberForm>(emptyMember);
  const [tripForm, setTripForm] = useState<TripForm>(emptyTrip);
  const [streamUrl, setStreamUrl] = useState("");
  const [expense, setExpense] = useState({
    id: "",
    title: "",
    amount: "",
    txn_date: new Date().toISOString().slice(0, 10),
    note: "",
    trip_id: "",
  });

  const saveMember = useMutation({
    mutationFn: async () => {
      const row = {
        email: member.email.trim().toLowerCase(),
        full_name: member.full_name.trim(),
        phone: member.phone.trim(),
        dob: member.dob ? member.dob : null,
        blood_group: member.blood_group.trim(),
        address: member.address.trim(),
        role: member.role,
        active: member.active,
        invited_at: new Date().toISOString(),
      };
      if (member.id) {
        const { error } = await supabase.from("member_invites").update(row).eq("id", member.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("member_invites").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setMember(emptyMember);
      void qc.invalidateQueries({ queryKey: ["member_invites"] });
      toast.success("உறுப்பினர் சேமிக்கப்பட்டது ✅");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("member_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["member_invites"] });
      toast.success("நீக்கப்பட்டது");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTrip = useMutation({
    mutationFn: async () => {
      const row = {
        name: tripForm.name.trim(),
        destination: tripForm.destination.trim(),
        start_location: tripForm.start_location.trim(),
        journey_places: tripForm.journey_places.trim(),
        start_date: tripForm.start_date || null,
        end_date: tripForm.end_date || null,
        details: tripForm.details.trim(),
        budget_per_person: Number(tripForm.budget_per_person || 0),
        total_budget: Number(tripForm.total_budget || 0),
        status: tripForm.status,
        maps_url: tripForm.maps_url.trim() || null,
        cover_image: tripForm.cover_image.trim() || null,
      };
      if (tripForm.id) {
        const { error } = await supabase.from("trips").update(row).eq("id", tripForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trips").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setTripForm(emptyTrip);
      void qc.invalidateQueries({ queryKey: ["trips"] });
      void qc.invalidateQueries({ queryKey: ["trip"] });
      toast.success("பயணம் சேமிக்கப்பட்டது ✅");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTrip = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["trips"] });
      void qc.invalidateQueries({ queryKey: ["trip"] });
      toast.success("பயணம் நீக்கப்பட்டது");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decidePayment = useMutation({
    mutationFn: async (p: { id: string; status: "verified" | "rejected" }) => {
      // wallet income is added automatically when a payment is verified
      const { error } = await supabase.from("payments").update({ status: p.status }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Payment நிலை மாற்றப்பட்டது");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveExpense = useMutation({
    mutationFn: async () => {
      const row = {
        trip_id: expense.trip_id || trip?.id || null,
        type: "expense" as const,
        title: expense.title.trim(),
        amount: Number(expense.amount || 0),
        txn_date: expense.txn_date,
        category: "trip_expense",
        note: expense.note.trim(),
      };
      if (expense.id) {
        const { error } = await supabase
          .from("wallet_transactions")
          .update(row)
          .eq("id", expense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wallet_transactions").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setExpense({
        id: "",
        title: "",
        amount: "",
        txn_date: new Date().toISOString().slice(0, 10),
        note: "",
        trip_id: "",
      });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("செலவு சேமிக்கப்பட்டது ✅");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wallet_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("நீக்கப்பட்டது");
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
      setStreamUrl("");
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
  const expenses = (txns ?? []).filter((t) => t.type === "expense");

  return (
    <AppShell>
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-glass-border bg-secondary/30 p-1">
        {TAB_LIST.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "tamil shrink-0 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all",
              tab === t ? "gradient-blue glow-sm text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === "members" ? (
        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          <GlassCard>
            <CardTitle
              icon="👥"
              title={member.id ? "உறுப்பினரை திருத்து" : "உறுப்பினர் சேர் / அழைப்பு"}
              subtitle="Email = login identity"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={field}
                placeholder="email@example.com"
                value={member.email}
                onChange={(e) => setMember({ ...member, email: e.target.value })}
              />
              <input
                className={field}
                placeholder="முழு பெயர்"
                value={member.full_name}
                onChange={(e) => setMember({ ...member, full_name: e.target.value })}
              />
              <input
                className={field}
                placeholder="கைபேசி"
                value={member.phone}
                onChange={(e) => setMember({ ...member, phone: e.target.value })}
              />
              <input
                className={field}
                type="date"
                value={member.dob}
                onChange={(e) => setMember({ ...member, dob: e.target.value })}
              />
              <input
                className={field}
                placeholder="இரத்த வகை"
                value={member.blood_group}
                onChange={(e) => setMember({ ...member, blood_group: e.target.value })}
              />
              <select
                className={field}
                value={member.role}
                onChange={(e) =>
                  setMember({ ...member, role: e.target.value as MemberForm["role"] })
                }
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <textarea
                className={cn(field, "sm:col-span-2")}
                rows={2}
                placeholder="முகவரி"
                value={member.address}
                onChange={(e) => setMember({ ...member, address: e.target.value })}
              />
              <label className="tamil flex items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={member.active}
                  onChange={(e) => setMember({ ...member, active: e.target.checked })}
                />
                கணக்கு இயக்கத்தில் (active)
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => saveMember.mutate()}
                disabled={saveMember.isPending || !member.email.includes("@")}
                className="gradient-blue tamil flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Plus className="size-4" /> சேமி
              </button>
              {member.id ? (
                <button
                  onClick={() => setMember(emptyMember)}
                  className="tamil rounded-2xl border border-glass-border px-3 text-xs"
                >
                  ரத்து
                </button>
              ) : null}
            </div>
            <p className="tamil mt-2 text-[10px] text-muted-foreground">
              உறுப்பினர் இதே email + password மூலம் உள்நுழைந்தால் அவரது கணக்கு தானாக இணைக்கப்படும்.
            </p>
          </GlassCard>

          <GlassCard>
            <CardTitle icon="📋" title="உறுப்பினர் பட்டியல்" subtitle={`${invites?.length ?? 0} members`} />
            <div className="space-y-2">
              {(invites ?? []).map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-glass-border bg-secondary/25 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="tamil truncate text-xs font-semibold">
                      {m.full_name || m.email}{" "}
                      {m.role === "admin" ? <span className="text-primary">• admin</span> : null}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {m.email} • {m.phone || "—"} • {m.blood_group || "—"} •{" "}
                      {m.invitation_status}
                      {m.active ? "" : " • disabled"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() =>
                        setMember({
                          id: m.id,
                          email: m.email,
                          full_name: m.full_name,
                          phone: m.phone,
                          dob: m.dob ?? "",
                          blood_group: m.blood_group,
                          address: m.address,
                          role: m.role,
                          active: m.active,
                        })
                      }
                      className="grid size-8 place-items-center rounded-full border border-glass-border text-primary"
                      aria-label="Edit member"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMember.mutate(m.id)}
                      className="grid size-8 place-items-center rounded-full border border-glass-border text-destructive"
                      aria-label="Delete member"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      ) : null}

      {tab === "trips" ? (
        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          <GlassCard>
            <CardTitle
              icon="🧭"
              title={tripForm.id ? "பயணத்தை திருத்து" : "புதிய பயணம்"}
              subtitle="Trip plan"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={field}
                placeholder="பயண பெயர்"
                value={tripForm.name}
                onChange={(e) => setTripForm({ ...tripForm, name: e.target.value })}
              />
              <input
                className={field}
                placeholder="இடம் / destination"
                value={tripForm.destination}
                onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
              />
              <input
                className={field}
                placeholder="தொடங்கும் இடம்"
                value={tripForm.start_location}
                onChange={(e) => setTripForm({ ...tripForm, start_location: e.target.value })}
              />
              <input
                className={field}
                placeholder="செல்லும் இடங்கள் (comma)"
                value={tripForm.journey_places}
                onChange={(e) => setTripForm({ ...tripForm, journey_places: e.target.value })}
              />
              <input
                className={field}
                type="date"
                value={tripForm.start_date}
                onChange={(e) => setTripForm({ ...tripForm, start_date: e.target.value })}
              />
              <input
                className={field}
                type="date"
                value={tripForm.end_date}
                onChange={(e) => setTripForm({ ...tripForm, end_date: e.target.value })}
              />
              <input
                className={field}
                inputMode="numeric"
                placeholder="₹ per person"
                value={tripForm.budget_per_person}
                onChange={(e) => setTripForm({ ...tripForm, budget_per_person: e.target.value })}
              />
              <input
                className={field}
                inputMode="numeric"
                placeholder="₹ மொத்த பட்ஜெட்"
                value={tripForm.total_budget}
                onChange={(e) => setTripForm({ ...tripForm, total_budget: e.target.value })}
              />
              <select
                className={field}
                value={tripForm.status}
                onChange={(e) =>
                  setTripForm({ ...tripForm, status: e.target.value as TripForm["status"] })
                }
              >
                <option value="coming_soon">Coming soon</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
              <input
                className={field}
                placeholder="Google Maps URL"
                value={tripForm.maps_url}
                onChange={(e) => setTripForm({ ...tripForm, maps_url: e.target.value })}
              />
              <input
                className={cn(field, "sm:col-span-2")}
                placeholder="Cover image URL"
                value={tripForm.cover_image}
                onChange={(e) => setTripForm({ ...tripForm, cover_image: e.target.value })}
              />
              <textarea
                className={cn(field, "sm:col-span-2")}
                rows={3}
                placeholder="பயண விவரம் / plan"
                value={tripForm.details}
                onChange={(e) => setTripForm({ ...tripForm, details: e.target.value })}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => saveTrip.mutate()}
                disabled={saveTrip.isPending || !tripForm.name.trim()}
                className="gradient-blue tamil flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Check className="size-4" /> சேமி
              </button>
              {tripForm.id ? (
                <button
                  onClick={() => setTripForm(emptyTrip)}
                  className="tamil rounded-2xl border border-glass-border px-3 text-xs"
                >
                  ரத்து
                </button>
              ) : null}
            </div>
          </GlassCard>

          <GlassCard>
            <CardTitle icon="📚" title="அனைத்து பயணங்கள்" subtitle={`${trips?.length ?? 0} trips`} />
            <div className="space-y-2">
              {(trips ?? []).map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-glass-border bg-secondary/25 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="tamil truncate text-xs font-semibold">{t.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {t.destination || "—"} • {t.status} • {tamilDate(t.start_date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() =>
                        setTripForm({
                          id: t.id,
                          name: t.name,
                          destination: t.destination,
                          start_location: t.start_location,
                          journey_places: t.journey_places ?? "",
                          start_date: t.start_date ?? "",
                          end_date: t.end_date ?? "",
                          details: t.details,
                          budget_per_person: String(t.budget_per_person ?? ""),
                          total_budget: String(t.total_budget ?? ""),
                          status: t.status as TripForm["status"],
                          maps_url: t.maps_url ?? "",
                          cover_image: t.cover_image ?? "",
                        })
                      }
                      className="grid size-8 place-items-center rounded-full border border-glass-border text-primary"
                      aria-label="Edit trip"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTrip.mutate(t.id)}
                      className="grid size-8 place-items-center rounded-full border border-glass-border text-destructive"
                      aria-label="Delete trip"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      ) : null}

      {tab === "payments" ? (
        <GlassCard>
          <CardTitle icon="✅" title="Payment Verification" subtitle={`${pending.length} pending`} />
          {pending.length === 0 ? (
            <p className="tamil text-xs text-muted-foreground">நிலுவையில் எதுவும் இல்லை.</p>
          ) : null}
          <div className="grid gap-2 lg:grid-cols-2">
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
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => decidePayment.mutate({ id: p.id, status: "verified" })}
                    className="gradient-blue rounded-full px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => decidePayment.mutate({ id: p.id, status: "rejected" })}
                    className="rounded-full border border-destructive/50 px-3 py-1.5 text-[11px] font-semibold text-destructive"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      {tab === "expenses" ? (
        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          <GlassCard>
            <CardTitle
              icon="🧾"
              title={expense.id ? "செலவை திருத்து" : "செலவு பதிவு"}
              subtitle="Trip expenses"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={field}
                placeholder="தலைப்பு"
                value={expense.title}
                onChange={(e) => setExpense({ ...expense, title: e.target.value })}
              />
              <input
                className={field}
                inputMode="numeric"
                placeholder="₹ தொகை"
                value={expense.amount}
                onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
              />
              <input
                className={field}
                type="date"
                value={expense.txn_date}
                onChange={(e) => setExpense({ ...expense, txn_date: e.target.value })}
              />
              <select
                className={field}
                value={expense.trip_id}
                onChange={(e) => setExpense({ ...expense, trip_id: e.target.value })}
              >
                <option value="">பயணம் (current)</option>
                {(trips ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <textarea
                className={cn(field, "sm:col-span-2")}
                rows={2}
                placeholder="விவரம்"
                value={expense.note}
                onChange={(e) => setExpense({ ...expense, note: e.target.value })}
              />
            </div>
            <button
              onClick={() => saveExpense.mutate()}
              disabled={saveExpense.isPending || !Number(expense.amount)}
              className="gradient-blue tamil mt-3 w-full rounded-2xl py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              சேமி
            </button>
          </GlassCard>

          <GlassCard>
            <CardTitle icon="📉" title="செலவு பட்டியல்" subtitle={`${expenses.length} entries`} />
            <div className="space-y-2">
              {expenses.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-glass-border bg-secondary/25 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="tamil truncate text-xs font-semibold">
                      {t.title || t.note || "செலவு"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {money(Number(t.amount))} • {tamilDate(t.txn_date ?? t.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() =>
                        setExpense({
                          id: t.id,
                          title: t.title ?? "",
                          amount: String(t.amount ?? ""),
                          txn_date: t.txn_date ?? new Date().toISOString().slice(0, 10),
                          note: t.note ?? "",
                          trip_id: t.trip_id ?? "",
                        })
                      }
                      className="grid size-8 place-items-center rounded-full border border-glass-border text-primary"
                      aria-label="Edit expense"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => deleteExpense.mutate(t.id)}
                      className="grid size-8 place-items-center rounded-full border border-glass-border text-destructive"
                      aria-label="Delete expense"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      ) : null}

      {tab === "live" ? (
        <GlassCard>
          <CardTitle
            icon="🔴"
            title="Live Control"
            subtitle={live ? "நேரலை இயங்குகிறது" : "நேரலை இல்லை"}
          />
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
      ) : null}
    </AppShell>
  );
}
