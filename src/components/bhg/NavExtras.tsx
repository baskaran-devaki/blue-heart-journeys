import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notificationsQuery, allTripsQuery } from "@/lib/queries";
import { dateTime, tamilDate } from "@/lib/bhg";
import { cn } from "@/lib/utils";

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center bg-background/70 px-3 pt-[7.75rem] pb-4 backdrop-blur-sm sm:pt-[8.5rem]">
      <div className="glass flex max-h-[calc(100dvh-10rem)] w-full max-w-md flex-col rounded-3xl border border-glass-border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="tamil text-sm font-semibold">{title}</p>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function NotificationBell({ pill }: { pill: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: items } = useQuery(notificationsQuery);
  const unread = (items ?? []).filter((n) => !n.read).length;

  useEffect(() => {
    const ch = supabase
      .channel("bhg-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        void qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const markAll = async () => {
    const ids = (items ?? []).filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Notifications"
        className={cn(pill, "relative text-muted-foreground")}
      >
        <Bell className="size-3.5" />
        <span className="hidden sm:inline">Alerts</span>
        {unread ? (
          <span className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <Sheet title={`🔔 Notifications${unread ? ` • ${unread} new` : ""}`} onClose={() => setOpen(false)}>
          {unread ? (
            <button
              onClick={() => void markAll()}
              className="tamil mb-2 w-full rounded-2xl border border-glass-border py-2 text-[11px] font-semibold text-primary"
            >
              🧹 Clear • எல்லாவற்றையும் படித்ததாக குறி
            </button>
          ) : null}
          <div className="space-y-2">
            {(items ?? []).length === 0 ? (
              <p className="tamil py-6 text-center text-xs text-muted-foreground">
                இன்னும் அறிவிப்புகள் இல்லை.
              </p>
            ) : null}
            {(items ?? []).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read) void markOne(n.id);
                }}
                className={cn(
                  "block w-full rounded-2xl border p-3 text-left",
                  n.read
                    ? "border-glass-border bg-secondary/20"
                    : "border-primary/50 bg-primary/10",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="tamil min-w-0 flex-1 text-xs font-semibold break-words">{n.title}</p>
                  {!n.read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /> : null}
                </div>
                {n.body ? (
                  <p className="tamil mt-1 text-[11px] break-words text-muted-foreground">{n.body}</p>
                ) : null}
                <p className="mt-1 text-[10px] text-muted-foreground">{dateTime(n.created_at)}</p>
              </div>
            ))}
          </div>
        </Sheet>
      ) : null}
    </>
  );
}

const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarButton({ pill }: { pill: string }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());
  const { data: trips } = useQuery({ ...allTripsQuery, enabled: open });

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const list: (number | null)[] = Array.from({ length: first }, () => null);
    for (let d = 1; d <= days; d += 1) list.push(d);
    return list;
  }, [cursor]);

  const iso = (d: number) =>
    `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const tripOn = (d: number) =>
    (trips ?? []).find(
      (t) => t.start_date && t.end_date && iso(d) >= t.start_date && iso(d) <= t.end_date,
    );

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === cursor.getFullYear() &&
    today.getMonth() === cursor.getMonth() &&
    today.getDate() === d;

  const monthTrips = (trips ?? []).filter(
    (t) => t.start_date && t.start_date.slice(0, 7) === iso(1).slice(0, 7),
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Calendar"
        className={cn(pill, "text-muted-foreground")}
      >
        <CalendarDays className="size-3.5" />
        <span className="hidden sm:inline">Calendar</span>
      </button>

      {open ? (
        <Sheet title="📅 Trip Calendar" onClose={() => setOpen(false)}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="rounded-full border border-glass-border px-3 py-1 text-xs"
            >
              ‹
            </button>
            <p className="text-sm font-semibold">
              {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </p>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="rounded-full border border-glass-border px-3 py-1 text-xs"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK.map((w, i) => (
              <span key={`${w}-${i}`} className="text-[10px] text-muted-foreground">
                {w}
              </span>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <span key={`e-${i}`} />
              ) : (
                <span
                  key={d}
                  title={tripOn(d)?.name ?? ""}
                  className={cn(
                    "grid aspect-square place-items-center rounded-xl text-[11px]",
                    isToday(d)
                      ? "gradient-blue font-bold text-primary-foreground"
                      : tripOn(d)
                        ? "border border-primary/50 bg-primary/15 text-primary"
                        : "bg-secondary/30 text-muted-foreground",
                  )}
                >
                  {d}
                </span>
              ),
            )}
          </div>
          <div className="mt-4 space-y-2">
            {monthTrips.length === 0 ? (
              <p className="tamil text-center text-[11px] text-muted-foreground">
                இந்த மாதம் பயணங்கள் இல்லை.
              </p>
            ) : null}
            {monthTrips.map((t) => (
              <div key={t.id} className="rounded-2xl border border-glass-border bg-secondary/25 p-3">
                <p className="tamil text-xs font-semibold">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {tamilDate(t.start_date)} → {tamilDate(t.end_date)} • {t.status}
                </p>
              </div>
            ))}
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
