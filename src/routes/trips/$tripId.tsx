import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { allTripsQuery, itineraryQuery, tripImagesQuery } from "@/lib/queries";
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
        <div className="grid grid-cols-2 gap-2 text-center">
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
    </AppShell>
  );
}
