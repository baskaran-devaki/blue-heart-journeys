import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { activeLiveQuery, currentTripQuery } from "@/lib/queries";
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

  return (
    <AppShell>
      <GlassCard>
        <CardTitle
          icon="🔴"
          title="LIVE TRIP"
          subtitle={trip?.name ?? "சூறாவளி சுற்றுப்பயணம்"}
        />
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
    </AppShell>
  );
}
