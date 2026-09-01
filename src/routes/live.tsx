import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Eye } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { activeLiveQuery, currentTripQuery, liveViewersQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { dateTime } from "@/lib/bhg";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "🔴 Live Trip – BLUE HEART GUYS" },
      {
        name: "description",
        content: "சூறாவளி சுற்றுப்பயணம் நேரலை – YouTube Live ஒளிபரப்பு மற்றும் பயண நிலவரம்.",
      },
      { property: "og:title", content: "🔴 Live Trip – BLUE HEART GUYS" },
      { property: "og:description", content: "Watch the BLUE HEART GUYS trip live." },
    ],
  }),
  component: LivePage,
});

function embedUrl(raw: string) {
  const id =
    raw.match(/[?&]v=([\w-]{6,})/)?.[1] ??
    raw.match(/youtu\.be\/([\w-]{6,})/)?.[1] ??
    raw.match(/live\/([\w-]{6,})/)?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : raw;
}

function LivePage() {
  const { data: live } = useQuery(activeLiveQuery);
  const { data: trip } = useQuery(currentTripQuery);
  const { user, profile, isMember } = useAuth();
  const { data: viewers } = useQuery({
    ...liveViewersQuery(live?.id),
    enabled: !!live?.id && isMember,
  });
  const qc = useQueryClient();

  // presence heartbeat — each member counted once, stale viewers drop off
  useEffect(() => {
    if (!live?.id || !user) return;
    const beat = () => {
      void supabase
        .from("live_viewers")
        .upsert(
          {
            session_id: live.id,
            user_id: user.id,
            display_name: profile?.full_name ?? "Member",
            last_seen: new Date().toISOString(),
          },
          { onConflict: "session_id,user_id" },
        )
        .then(() => qc.invalidateQueries({ queryKey: ["live-viewers", live.id] }));
    };
    beat();
    const timer = window.setInterval(beat, 30_000);
    return () => {
      window.clearInterval(timer);
      void supabase
        .from("live_viewers")
        .delete()
        .eq("session_id", live.id)
        .eq("user_id", user.id);
    };
  }, [live?.id, user, profile?.full_name, qc]);

  return (
    <AppShell>
      <GlassCard>
        <CardTitle icon="🔴" title="LIVE TRIP" subtitle={trip?.name ?? "சூறாவளி சுற்றுப்பயணம்"} />
        {live?.stream_url ? (
          <>
            <div className="overflow-hidden rounded-2xl border border-glass-border">
              <iframe
                src={embedUrl(live.stream_url)}
                title="BLUE HEART GUYS Live"
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full"
              />
            </div>
            <p className="tamil mt-2 text-xs text-muted-foreground">
              நேரலை தொடங்கியது: {dateTime(live.started_at)}
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-glass-border bg-secondary/30 p-6 text-center">
            <p className="tamil text-sm font-semibold">தற்போது நேரலை இல்லை</p>
            <p className="tamil mt-1 text-xs text-muted-foreground">
              பயணம் தொடங்கும் போது Admin நேரலையை இணைப்பார் 💙
            </p>
          </div>
        )}
      </GlassCard>

      {live && isMember ? (
        <GlassCard>
          <CardTitle
            icon="👀"
            title="இப்போது பார்ப்பவர்கள்"
            subtitle={`${viewers?.length ?? 0} watching now`}
          />
          <div className="flex flex-wrap gap-2">
            {(viewers ?? []).map((v) => (
              <span
                key={`${v.session_id}-${v.user_id}`}
                className="tamil flex items-center gap-1.5 rounded-full border border-glass-border bg-secondary/30 px-3 py-1.5 text-[11px]"
              >
                <Eye className="size-3.5 text-live" />
                {v.display_name || "Member"}
              </span>
            ))}
            {(viewers ?? []).length === 0 ? (
              <p className="tamil text-xs text-muted-foreground">யாரும் இல்லை.</p>
            ) : null}
          </div>
        </GlassCard>
      ) : null}
    </AppShell>
  );
}
