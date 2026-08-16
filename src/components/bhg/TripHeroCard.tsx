import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { GlassCard, CardTitle } from "./GlassCard";
import {
  currentTripQuery,
  tripImagesQuery,
  participationQuery,
  paymentsQuery,
  profilesQuery,
} from "@/lib/queries";
import { FALLBACK_IMAGES, STATUS_META, money, tamilDate, totalDays } from "@/lib/bhg";
import { useAuth } from "@/lib/auth";

function Slideshow({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % images.length), 4500);
    return () => window.clearInterval(t);
  }, [images.length]);

  return (
    <div className="absolute inset-0">
      {images.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt=""
          loading={i === 0 ? "eager" : "lazy"}
          className="absolute inset-0 size-full object-cover transition-opacity duration-1000"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
    </div>
  );
}

export function TripHeroCard() {
  const { isMember } = useAuth();
  const { data: trip, isLoading } = useQuery(currentTripQuery);
  const { data: images } = useQuery(tripImagesQuery(trip?.id));
  const { data: participation } = useQuery({ ...participationQuery(trip?.id), enabled: !!trip && isMember });
  const { data: payments } = useQuery({ ...paymentsQuery(trip?.id), enabled: !!trip && isMember });
  const { data: profiles } = useQuery({ ...profilesQuery, enabled: isMember });

  const slides = useMemo(() => {
    const urls = (images ?? []).map((i) => i.url).filter(Boolean);
    if (trip?.cover_image) urls.unshift(trip.cover_image);
    return urls.length ? urls : FALLBACK_IMAGES;
  }, [images, trip?.cover_image]);

  const officialMembers = useMemo(() => {
    if (!participation || !payments || !profiles) return [];
    const verified = new Set(payments.filter((p) => p.status === "verified").map((p) => p.user_id));
    return participation
      .filter((p) => p.status === "confirmed" && verified.has(p.user_id))
      .map((p) => profiles.find((m) => m.id === p.user_id)?.full_name ?? "Member");
  }, [participation, payments, profiles]);

  if (isLoading) {
    return <GlassCard className="h-56 animate-pulse" />;
  }

  if (!trip) {
    return (
      <GlassCard className="relative overflow-hidden p-0">
        <div className="relative h-64">
          <Slideshow images={FALLBACK_IMAGES} />
          <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="animate-float text-4xl">🌴</p>
            <h2 className="tamil mt-2 text-xl font-bold text-gradient-blue">Coming Soon</h2>
            <p className="tamil mt-1 text-sm font-semibold">💙 விரைவில் அடுத்த பயணம்</p>
            <p className="tamil mt-2 text-xs text-muted-foreground">
              “நம் அடுத்த நினைவுக்காக காத்திருக்கிறோம்...”
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  const meta = STATUS_META[trip.status] ?? STATUS_META["upcoming"]!;

  return (
    <GlassCard className="relative overflow-hidden p-0">
      <div className="relative min-h-72">
        <Slideshow images={slides} />
        <div className="relative p-4">
          <CardTitle icon="🌴" title="சுற்றுலா விவரம்" subtitle={meta.label} />
          <h3 className="tamil text-xl leading-tight font-bold">{trip.name}</h3>
          <div className="tamil mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" /> {trip.destination || "—"}
              {trip.start_location ? ` • புறப்பாடு: ${trip.start_location}` : ""}
            </p>
            <p className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-primary" /> {tamilDate(trip.start_date)} –{" "}
              {tamilDate(trip.end_date)} ({totalDays(trip.start_date, trip.end_date)} நாட்கள்)
            </p>
            <p className="flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" /> ஒருவருக்கு:{" "}
              {money(trip.budget_per_person)}
            </p>
          </div>
          {trip.details ? (
            <p className="tamil mt-3 line-clamp-3 text-xs leading-relaxed">{trip.details}</p>
          ) : null}

          {isMember ? (
            <div className="mt-3 rounded-2xl border border-glass-border bg-secondary/30 p-3">
              <p className="tamil text-[11px] font-semibold text-success">
                ✅ உறுப்பினர்கள் ({officialMembers.length})
              </p>
              <p className="tamil mt-1 text-[11px] text-muted-foreground">
                {officialMembers.length
                  ? officialMembers.join(" • ")
                  : "இன்னும் யாரும் உறுதி + பணம் செலுத்தவில்லை"}
              </p>
            </div>
          ) : null}

          <Link
            to="/trips/$tripId"
            params={{ tripId: trip.id }}
            className="gradient-blue glow-sm tamil mt-4 inline-flex w-full items-center justify-center rounded-2xl py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            முழுவிவரம்
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}
