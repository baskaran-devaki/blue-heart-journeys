import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { allTripsQuery } from "@/lib/queries";
import { money, tamilDate, STATUS_META } from "@/lib/bhg";

export const Route = createFileRoute("/trips/")({
  head: () => ({
    meta: [
      { title: "🗺 All Trips – BLUE HEART GUYS" },
      {
        name: "description",
        content: "BLUE HEART GUYS குழுவின் அனைத்து பயணங்கள் மற்றும் பயண வரலாறு.",
      },
      { property: "og:title", content: "🗺 All Trips – BLUE HEART GUYS" },
      { property: "og:description", content: "Every BLUE HEART GUYS trip, past and upcoming." },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const { data: trips } = useQuery(allTripsQuery);

  return (
    <AppShell>
      <GlassCard>
        <CardTitle icon="🗺" title="ALL TRIPS" subtitle="பயண வரலாறு" />
        <div className="grid gap-2 md:grid-cols-2">
          {(trips ?? []).length === 0 ? (
            <p className="tamil text-xs text-muted-foreground">இன்னும் பயணங்கள் இல்லை.</p>
          ) : null}
          {(trips ?? []).map((t) => {
            const meta = STATUS_META[t.status] ?? STATUS_META["upcoming"]!;
            return (
              <Link
                key={t.id}
                to="/trips/$tripId"
                params={{ tripId: t.id }}
                className="block rounded-2xl border border-glass-border bg-secondary/25 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="tamil truncate text-sm font-semibold">{t.name}</p>
                    <p className="tamil truncate text-[11px] text-muted-foreground">
                      {t.destination} • {tamilDate(t.start_date)}
                    </p>
                  </div>
                  <span className={`tamil shrink-0 rounded-full px-2 py-1 text-[10px] ${meta.badge}`}>
                    {meta.label}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-primary">
                  {money(Number(t.budget_per_person ?? 0))} / நபர்
                </p>
              </Link>
            );
          })}
        </div>
      </GlassCard>
    </AppShell>
  );
}
