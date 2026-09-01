import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { allTripsQuery, itineraryQuery, tripImagesQuery, tripSongsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Music, Plus, Trash2 } from "lucide-react";
import { money, tamilDate, totalDays, FALLBACK_IMAGES } from "@/lib/bhg";

export const Route = createFileRoute("/trips/$tripId")({
  head: () => ({
    meta: [
      { title: "🧭 Trip Details – BLUE HEART GUYS" },
      {
        name: "description",
        content: "பயண விவரங்கள் – இடம், தேதி, நாட்கள், பட்ஜெட் மற்றும் நாள்வாரி பயணத் திட்டம்.",
      },
      { property: "og:title", content: "🧭 Trip Details – BLUE HEART GUYS" },
      { property: "og:description", content: "Destination, dates, budget and day-wise itinerary." },
    ],
  }),
  component: TripDetail,
  errorComponent: ({ error }) => (
    <AppShell>
      <GlassCard>
        <p className="tamil text-sm" role="alert">
          {error.message}
        </p>
      </GlassCard>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <GlassCard>
        <p className="tamil text-sm">பயணம் கிடைக்கவில்லை.</p>
      </GlassCard>
    </AppShell>
  ),
});

function TripDetail() {
  const { tripId } = Route.useParams();
  const { data: trips } = useQuery(allTripsQuery);
  const { data: images } = useQuery(tripImagesQuery(tripId));
  const { data: days } = useQuery(itineraryQuery(tripId));
  const { user, isAdmin, isMember } = useAuth();
  const qc = useQueryClient();
  const [song, setSong] = useState({ title: "", url: "" });
  const { data: songs } = useQuery({ ...tripSongsQuery(tripId), enabled: isMember });

  const addSong = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("trip_songs").insert({
        trip_id: tripId,
        title: song.title.trim(),
        url: song.url.trim(),
        added_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSong({ title: "", url: "" });
      void qc.invalidateQueries({ queryKey: ["trip-songs"] });
      toast.success("பாடல் சேர்க்கப்பட்டது 🎵");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSong = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_songs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["trip-songs"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const trip = trips?.find((t) => t.id === tripId);

  const urls = (images ?? []).map((i) => i.url).filter(Boolean) as string[];
  const gallery = urls.length ? urls : FALLBACK_IMAGES;

  return (
    <AppShell>
      <GlassCard>
        <CardTitle
          icon="🧭"
          title={trip?.name ?? "பயணம்"}
          subtitle={trip?.destination ?? ""}
        />
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">தொடக்கம்</p>
            <p className="tamil text-xs font-semibold">{tamilDate(trip?.start_date)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">முடிவு</p>
            <p className="tamil text-xs font-semibold">{tamilDate(trip?.end_date)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">மொத்த நாட்கள்</p>
            <p className="text-xs font-semibold">{totalDays(trip?.start_date, trip?.end_date)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground">ஒரு நபர்</p>
            <p className="text-xs font-semibold text-primary">
              {money(Number(trip?.budget_per_person ?? 0))}
            </p>
          </div>
        </div>
        {trip?.journey_places ? (
          <p className="tamil mt-3 text-xs">
            <span className="text-muted-foreground">செல்லும் இடங்கள்: </span>
            {trip.journey_places}
          </p>
        ) : null}
        {Number(trip?.total_budget ?? 0) > 0 ? (
          <p className="tamil mt-1 text-xs">
            <span className="text-muted-foreground">மொத்த பட்ஜெட்: </span>
            <span className="font-semibold text-primary">{money(Number(trip?.total_budget))}</span>
          </p>
        ) : null}
        {trip?.details ? (
          <p className="tamil mt-3 text-xs text-muted-foreground">{trip.details}</p>
        ) : null}
      </GlassCard>

      <GlassCard>
        <CardTitle icon="🖼" title="Destination" subtitle="இடங்கள்" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((src, i) => (
            <img
              key={`${src}-${i}`}
              src={src}
              alt={`${trip?.destination ?? "destination"} ${i + 1}`}
              loading="lazy"
              className="h-32 w-44 shrink-0 rounded-2xl object-cover"
            />
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <CardTitle icon="📅" title="Itinerary" subtitle="நாள்வாரி திட்டம்" />
        <div className="space-y-2">
          {(days ?? []).length === 0 ? (
            <p className="tamil text-xs text-muted-foreground">திட்டம் விரைவில் பதிவேற்றப்படும்.</p>
          ) : null}
          {(days ?? []).map((d) => (
            <div key={d.id} className="rounded-2xl border border-glass-border bg-secondary/25 p-3">
              <p className="tamil text-xs font-semibold text-primary">
                Day {d.day_no} — {d.title}
              </p>
              {d.description ? (
                <p className="tamil mt-1 text-[11px] text-muted-foreground">{d.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      </GlassCard>

      {isMember ? (
        <GlassCard>
          <CardTitle icon="🎵" title="Favourite Songs" subtitle="பயண பாடல்கள்" />
          <div className="flex flex-wrap gap-2">
            <input
              value={song.title}
              onChange={(e) => setSong({ ...song, title: e.target.value })}
              placeholder="பாடல் பெயர்"
              className="min-w-[8rem] flex-1 rounded-2xl border border-glass-border bg-secondary/40 px-3 py-2 text-xs outline-none"
            />
            <input
              value={song.url}
              onChange={(e) => setSong({ ...song, url: e.target.value })}
              placeholder="YouTube / link"
              className="min-w-[8rem] flex-1 rounded-2xl border border-glass-border bg-secondary/40 px-3 py-2 text-xs outline-none"
            />
            <button
              onClick={() => addSong.mutate()}
              disabled={addSong.isPending || !song.title.trim()}
              className="gradient-blue grid size-9 place-items-center rounded-2xl text-primary-foreground disabled:opacity-50"
              aria-label="Add song"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(songs ?? []).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-glass-border bg-secondary/25 px-3 py-2"
              >
                <a
                  href={s.url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="tamil flex min-w-0 items-center gap-2 text-xs"
                >
                  <Music className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{s.title}</span>
                </a>
                {isAdmin ? (
                  <button
                    onClick={() => removeSong.mutate(s.id)}
                    className="shrink-0 text-destructive"
                    aria-label="Delete song"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
            {(songs ?? []).length === 0 ? (
              <p className="tamil text-xs text-muted-foreground">இன்னும் பாடல்கள் இல்லை.</p>
            ) : null}
          </div>
        </GlassCard>
      ) : null}
    </AppShell>
  );
}
