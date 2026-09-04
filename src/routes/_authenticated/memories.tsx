import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, EyeOff, Eye, FolderPlus, Lock } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { allTripsQuery, currentTripQuery, memoriesQuery, profilesQuery } from "@/lib/queries";
import { dateTime, signedUrls, tamilDate } from "@/lib/bhg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/memories")({
  head: () => ({
    meta: [
      { title: "📸 Memories – நினைவுகள் – BLUE HEART GUYS" },
      {
        name: "description",
        content: "பயண நினைவுகள் – trip வாரியாக folder-களில் ஒழுங்கமைக்கப்பட்ட புகைப்படங்கள்.",
      },
      { property: "og:title", content: "📸 Memories – நினைவுகள்" },
      { property: "og:description", content: "BLUE HEART GUYS trip photo folders." },
    ],
  }),
  component: MemoriesPage,
});

const inField =
  "min-w-0 flex-1 rounded-2xl border border-glass-border bg-secondary/50 px-3 py-2 text-xs outline-none";

/** Upload window = the actual trip dates (Asia/Kolkata), same rule the database enforces. */
function uploadOpen(start?: string | null, end?: string | null) {
  if (!start || !end) return false;
  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  return today >= start && today <= end;
}

function MemoriesPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [tripId, setTripId] = useState<string>("");
  const [folder, setFolder] = useState("General");
  const [newFolder, setNewFolder] = useState("");
  const [extraFolders, setExtraFolders] = useState<string[]>([]);

  const { data: current } = useQuery(currentTripQuery);
  const { data: trips } = useQuery(allTripsQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const { data: items } = useQuery(memoriesQuery(null));

  const activeTripId = tripId || current?.id || "";
  const activeTrip = (trips ?? []).find((t) => t.id === activeTripId);
  const canUpload = isAdmin || uploadOpen(activeTrip?.start_date, activeTrip?.end_date);

  const photos = useMemo(
    () => (items ?? []).filter((i) => i.media_type === "photo"),
    [items],
  );

  const folders = useMemo(() => {
    const set = new Set<string>(["General", ...extraFolders]);
    photos.filter((p) => p.trip_id === activeTripId).forEach((p) => set.add(p.folder || "General"));
    return Array.from(set);
  }, [photos, activeTripId, extraFolders]);

  const { data: urls } = useQuery({
    queryKey: ["memory-urls", photos.map((i) => i.storage_path).join(",")],
    enabled: photos.length > 0,
    queryFn: async () => {
      const map = await signedUrls(
        "memories",
        photos.map((i) => i.storage_path),
      );
      return Object.fromEntries(map);
    },
    staleTime: 30 * 60_000,
  });

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      if (!user) throw new Error("Not signed in");
      if (!activeTripId) throw new Error("Select a trip first");
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) throw new Error("Photos only");
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("memories").upload(path, file);
        if (upErr) throw upErr;
        const { error } = await supabase.from("memories").insert({
          trip_id: activeTripId,
          user_id: user.id,
          media_type: "photo",
          storage_path: path,
          folder: folder || "General",
        });
        if (error) {
          await supabase.storage.from("memories").remove([path]);
          throw error;
        }
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

  const tripPhotos = photos.filter((p) => p.trip_id === activeTripId);
  const grouped = folders
    .map((f) => ({ folder: f, list: tripPhotos.filter((p) => (p.folder || "General") === f) }))
    .filter((g) => g.list.length > 0 || g.folder === folder);

  return (
    <AppShell>
      <GlassCard>
        <CardTitle
          icon="📸"
          title="MEMORIES – நினைவுகள்"
          subtitle="Trip → Folder வாரியாக புகைப்படங்கள் மட்டும்"
          action={
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !canUpload || !activeTripId}
              className="gradient-blue glow-sm tamil flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Upload className="size-3.5" /> {uploading ? "..." : "Upload"}
            </button>
          }
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) upload.mutate(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <select
              className={inField}
              value={activeTripId}
              onChange={(e) => setTripId(e.target.value)}
            >
              <option value="">-- பயணத்தை தேர்ந்தெடுங்கள் --</option>
              {(trips ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select className={inField} value={folder} onChange={(e) => setFolder(e.target.value)}>
              {folders.map((f) => (
                <option key={f} value={f}>
                  📁 {f}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className={inField}
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="புதிய folder பெயர்"
            />
            <button
              onClick={() => {
                const name = newFolder.trim();
                if (!name) return;
                setExtraFolders((prev) => Array.from(new Set([...prev, name])));
                setFolder(name);
                setNewFolder("");
              }}
              className="tamil flex items-center gap-1.5 rounded-2xl border border-glass-border px-3 py-2 text-xs font-semibold text-primary"
            >
              <FolderPlus className="size-3.5" /> Folder உருவாக்கு
            </button>
          </div>

          {activeTrip ? (
            <p
              className={cn(
                "tamil flex items-start gap-1.5 text-[11px]",
                canUpload ? "text-success" : "text-warning",
              )}
            >
              {canUpload ? null : <Lock className="mt-0.5 size-3.5 shrink-0" />}
              {canUpload
                ? "Upload திறந்திருக்கிறது 💙"
                : `Upload பயண நாட்களில் மட்டுமே: ${tamilDate(activeTrip.start_date)} – ${tamilDate(activeTrip.end_date)}`}
            </p>
          ) : null}
        </div>
      </GlassCard>

      {!activeTripId ? (
        <GlassCard>
          <p className="tamil text-xs text-muted-foreground">
            புகைப்படங்களை பார்க்க ஒரு பயணத்தை தேர்ந்தெடுங்கள்.
          </p>
        </GlassCard>
      ) : null}

      {grouped.map((group) => (
        <GlassCard key={group.folder}>
          <CardTitle icon="📁" title={group.folder} subtitle={`${group.list.length} படங்கள்`} />
          {group.list.length === 0 ? (
            <p className="tamil text-xs text-muted-foreground">இந்த folder காலியாக உள்ளது.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {group.list.map((item) => {
                const url = (urls as Record<string, string> | undefined)?.[item.storage_path];
                const owner = profiles?.find((p) => p.id === item.user_id)?.full_name ?? "Member";
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
                        <img
                          src={url}
                          alt={item.caption || "நினைவு"}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full animate-pulse bg-muted/60" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="tamil truncate text-[11px] font-semibold">{owner}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {dateTime(item.created_at)}
                      </p>
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
                              {item.hidden ? (
                                <Eye className="size-3.5" />
                              ) : (
                                <EyeOff className="size-3.5" />
                              )}
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
      ))}
    </AppShell>
  );
}
