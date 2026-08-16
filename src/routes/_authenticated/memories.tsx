import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, EyeOff, Eye } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { allTripsQuery, currentTripQuery, memoriesQuery, profilesQuery } from "@/lib/queries";
import { dateTime, signedUrls } from "@/lib/bhg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/memories")({
  head: () => ({
    meta: [
      { title: "📸 Memories – நினைவுகள் – BLUE HEART GUYS" },
      {
        name: "description",
        content: "பயண நினைவுகள் – photos மற்றும் videos, உறுப்பினர் பெயர், தேதி மற்றும் பயண விவரத்துடன்.",
      },
      { property: "og:title", content: "📸 Memories – நினைவுகள்" },
      { property: "og:description", content: "BLUE HEART GUYS trip photos and videos gallery." },
    ],
  }),
  component: MemoriesPage,
});

function MemoriesPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"photo" | "video">("photo");
  const [uploading, setUploading] = useState(false);

  const { data: trip } = useQuery(currentTripQuery);
  const { data: trips } = useQuery(allTripsQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const { data: items } = useQuery(memoriesQuery(null));

  const { data: urls } = useQuery({
    queryKey: ["memory-urls", (items ?? []).map((i) => i.storage_path).join(",")],
    enabled: !!items?.length,
    queryFn: async () => {
      const map = await signedUrls(
        "memories",
        (items ?? []).map((i) => i.storage_path),
      );
      return Object.fromEntries(map);
    },
    staleTime: 30 * 60_000,
  });

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      if (!user) throw new Error("Not signed in");
      for (const file of Array.from(files)) {
        const kind = file.type.startsWith("video") ? "video" : "photo";
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("memories").upload(path, file);
        if (upErr) throw upErr;
        const { error } = await supabase.from("memories").insert({
          trip_id: trip?.id ?? null,
          user_id: user.id,
          media_type: kind,
          storage_path: path,
        });
        if (error) throw error;
      }
    },
    onMutate: () => setUploading(true),
    onSettled: () => setUploading(false),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["memories"] });
      toast.success("பதிவேற்றம் முடிந்தது 💙");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (item: { id: string; storage_path: string }) => {
      await supabase.storage.from("memories").remove([item.storage_path]);
      const { error } = await supabase.from("memories").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["memories"] });
      toast.success("நீக்கப்பட்டது");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleHide = useMutation({
    mutationFn: async (item: { id: string; hidden: boolean }) => {
      const { error } = await supabase
        .from("memories")
        .update({ hidden: !item.hidden })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["memories"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const shown = (items ?? []).filter((i) => i.media_type === tab);

  return (
    <AppShell>
      <GlassCard>
        <CardTitle
          icon="📸"
          title="MEMORIES – நினைவுகள்"
          subtitle="உங்கள் புகைப்படங்கள் & வீடியோக்கள்"
          action={
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="gradient-blue glow-sm tamil flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Upload className="size-3.5" /> {uploading ? "..." : "Upload"}
            </button>
          }
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) upload.mutate(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="mb-3 flex gap-2 rounded-2xl bg-secondary/40 p-1">
          {(["photo", "video"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "tamil flex-1 rounded-xl py-2 text-xs font-semibold transition-all",
                tab === t ? "gradient-blue text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {t === "photo" ? "🖼 Photos" : "🎬 Videos"}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="tamil py-6 text-center text-xs text-muted-foreground">
            இன்னும் {tab === "photo" ? "படங்கள்" : "வீடியோக்கள்"} இல்லை. Upload செய்யுங்கள் 💙
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {shown.map((item) => {
              const url = (urls as Record<string, string> | undefined)?.[item.storage_path];
              const owner = profiles?.find((p) => p.id === item.user_id)?.full_name ?? "Member";
              const tripName = trips?.find((t) => t.id === item.trip_id)?.name;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border border-glass-border bg-secondary/30",
                    item.hidden && "opacity-40",
                  )}
                >
                  <div className="relative aspect-square bg-muted/40">
                    {url ? (
                      item.media_type === "video" ? (
                        <video src={url} controls preload="metadata" className="size-full object-cover" />
                      ) : (
                        <img
                          src={url}
                          alt={item.caption || "நினைவு"}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      )
                    ) : (
                      <div className="size-full animate-pulse bg-muted/60" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="tamil truncate text-[11px] font-semibold">{owner}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {dateTime(item.created_at)}
                    </p>
                    {tripName ? (
                      <p className="tamil truncate text-[10px] text-primary">{tripName}</p>
                    ) : null}
                    {isAdmin || item.user_id === user?.id ? (
                      <div className="mt-1 flex gap-2">
                        <button
                          onClick={() => remove.mutate(item)}
                          className="text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                        {isAdmin ? (
                          <button
                            onClick={() => toggleHide.mutate(item)}
                            className="text-muted-foreground"
                            aria-label="Hide"
                          >
                            {item.hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
}
