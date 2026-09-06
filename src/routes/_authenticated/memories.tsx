import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Play } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { favouriteVideosQuery, profilesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/memories")({
  head: () => ({
    meta: [
      { title: "▶️ YouTube – பாடல்கள் – BLUE HEART GUYS" },
      {
        name: "description",
        content: "BLUE HEART GUYS நண்பர்களின் favourite பாடல்கள் மற்றும் videos ஒரே இடத்தில்.",
      },
      { property: "og:title", content: "▶️ YouTube – Favourite Songs / Videos" },
      { property: "og:description", content: "BLUE HEART GUYS favourite songs and videos." },
    ],
  }),
  component: YouTubePage,
});

const inField =
  "min-w-0 flex-1 rounded-2xl border border-glass-border bg-secondary/50 px-3 py-2 text-xs outline-none";

/** Extract the 11-char YouTube video id from any common YouTube URL form. */
export function youtubeId(input: string): string | null {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*\bv=)([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = value.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-yt-api]");
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.dataset["ytApi"] = "1";
      document.head.appendChild(script);
    }
  });
}

function YouTubePage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: videos } = useQuery(favouriteVideosQuery);
  const { data: profiles } = useQuery(profilesQuery);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const indexRef = useRef(0);
  const listRef = useRef<{ video_id: string }[]>([]);

  const list = videos ?? [];
  listRef.current = list;
  indexRef.current = currentIndex;

  const currentId = list[currentIndex]?.video_id ?? "";

  // Create the single main player once, then only load new videos into it.
  useEffect(() => {
    let disposed = false;
    void loadYouTubeApi().then((YT) => {
      if (disposed || !holderRef.current || playerRef.current) return;
      playerRef.current = new YT.Player(holderRef.current, {
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (event: any) => {
            if (event.data === YT.PlayerState.ENDED) {
              const total = listRef.current.length;
              if (total > 1) setCurrentIndex((i) => (i + 1) % total);
            }
          },
        },
      });
    });
    return () => {
      disposed = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!currentId || !playerRef.current?.loadVideoById) return;
    playerRef.current.loadVideoById(currentId);
  }, [currentId]);

  const add = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const name = title.trim();
      const videoId = youtubeId(url);
      if (!name) throw new Error("Song / Video பெயரை உள்ளிடுங்கள்");
      if (!videoId) throw new Error("சரியான YouTube URL உள்ளிடுங்கள்");
      if (list.some((v) => v.video_id === videoId)) throw new Error("இந்த video ஏற்கனவே உள்ளது");
      const { error } = await supabase.from("favourite_videos").insert({
        user_id: user.id,
        title: name,
        url: url.trim(),
        video_id: videoId,
      });
      if (error) {
        if (error.code === "23505" || /duplicate/i.test(error.message))
          throw new Error("இந்த video ஏற்கனவே உள்ளது");
        throw error;
      }
    },
    onSuccess: () => {
      setTitle("");
      setUrl("");
      void qc.invalidateQueries({ queryKey: ["favourite-videos"] });
      toast.success("சேர்க்கப்பட்டது 💙");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("favourite_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["favourite-videos"] });
      toast.success("நீக்கப்பட்டது");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const friendName = (userId: string) =>
    profiles?.find((p) => p.id === userId)?.full_name || "Friend";

  return (
    <AppShell>
      <GlassCard>
        <CardTitle
          icon="▶️"
          title="YOUTUBE"
          subtitle="நண்பர்களின் favourite பாடல்கள் & videos"
        />
        <div className="overflow-hidden rounded-2xl border border-glass-border bg-black">
          <div className="aspect-video w-full">
            <div ref={holderRef} className="size-full" />
          </div>
        </div>
        {list.length === 0 ? (
          <p className="tamil mt-2 text-xs text-muted-foreground">
            கீழே ஒரு YouTube link சேர்த்தால் இங்கே play ஆகும்.
          </p>
        ) : (
          <p className="tamil mt-2 truncate text-xs font-semibold">
            ▶ {list[currentIndex]?.title} •{" "}
            <span className="text-primary">{friendName(list[currentIndex]?.user_id ?? "")}</span>
          </p>
        )}
      </GlassCard>

      <GlassCard>
        <CardTitle icon="🎵" title="Favourite Songs / Videos" subtitle={`${list.length} videos`} />

        <div className="mb-3 flex flex-wrap gap-2">
          <input
            className={inField}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song / Video Name"
          />
          <input
            className={inField}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube URL"
          />
          <button
            onClick={() => add.mutate()}
            disabled={add.isPending}
            className="gradient-blue tamil flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="size-3.5" /> சேர்
          </button>
        </div>

        {list.length === 0 ? (
          <p className="tamil text-xs text-muted-foreground">இன்னும் videos சேர்க்கப்படவில்லை.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((v, i) => (
              <li
                key={v.id}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border border-glass-border bg-secondary/30 p-2",
                  i === currentIndex && "border-primary",
                )}
              >
                <button
                  onClick={() => setCurrentIndex(i)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="gradient-blue grid size-8 shrink-0 place-items-center rounded-full text-primary-foreground">
                    <Play className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="tamil block truncate text-xs font-semibold">{v.title}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {friendName(v.user_id)}
                    </span>
                  </span>
                </button>
                {isAdmin || v.user_id === user?.id ? (
                  <button
                    onClick={() => remove.mutate(v.id)}
                    className="shrink-0 text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </AppShell>
  );
}
