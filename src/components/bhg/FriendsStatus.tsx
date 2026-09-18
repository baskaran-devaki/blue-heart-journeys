import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Heart, Play, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { activeFriendStatusesQuery, profilesQuery } from "@/lib/queries";
import { parseSharedVideoUrl } from "@/lib/status-utils";

export function FriendsStatus() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { data = { statuses: [], likes: [] } } = useQuery(activeFriendStatusesQuery);
  const { data: profiles = [] } = useQuery(profilesQuery);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const activeStatuses = data.statuses.filter((status) => new Date(status.expires_at).getTime() > now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const shareVideo = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const parsed = parseSharedVideoUrl(videoUrl);
      if (!parsed) throw new Error("YouTube, Instagram அல்லது Facebook video link மட்டும் சேர்க்கவும்");
      const { error } = await supabase.from("friend_statuses").insert({
        status_type: "video",
        content: title.trim() || `${parsed.platform} video`,
        original_url: parsed.originalUrl,
        platform: parsed.platform,
        preview_title: title.trim() || null,
        thumbnail_url: parsed.thumbnailUrl,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setVideoUrl("");
      setTitle("");
      await queryClient.invalidateQueries({ queryKey: ["friend-statuses"] });
      toast.success("Video 24 மணி நேரம் பகிரப்பட்டது 💙");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("friend_statuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friend-statuses"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ statusId, liked }: { statusId: string; liked: boolean }) => {
      if (!user) throw new Error("Sign in required");
      const result = liked
        ? await supabase.from("friend_status_likes").delete().eq("status_id", statusId).eq("user_id", user.id)
        : await supabase.from("friend_status_likes").insert({ status_id: statusId, user_id: user.id });
      if (result.error) throw result.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friend-statuses"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="mt-5 space-y-3" aria-label="Friends status">
      <CardTitle icon="💙" title="FRIENDS STATUS" subtitle="24 மணி நேர நண்பர்கள் பகிர்வுகள்" />
      <GlassCard className="p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Video title (optional)" />
          <Input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="YouTube / Instagram / Facebook URL" />
          <Button className="gap-2" onClick={() => shareVideo.mutate()} disabled={!videoUrl.trim() || shareVideo.isPending}>
            <Send className="size-4" /> Share Video
          </Button>
        </div>
      </GlassCard>

      {activeStatuses.length === 0 ? (
        <GlassCard className="p-6 text-center text-sm text-muted-foreground">இப்போது active status எதுவும் இல்லை.</GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {activeStatuses.map((status) => {
            const profile = profilesById.get(status.user_id);
            const likes = data.likes.filter((like) => like.status_id === status.id);
            const liked = !!user && likes.some((like) => like.user_id === user.id);
            const canDelete = status.user_id === user?.id || isAdmin;
            return (
              <GlassCard key={status.id} className="overflow-hidden p-0">
                {status.thumbnail_url && (
                  <a href={status.original_url ?? "#"} target="_blank" rel="noreferrer" className="relative block aspect-video overflow-hidden bg-secondary">
                    <img src={status.thumbnail_url} alt={status.preview_title ?? "Shared video"} className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute inset-0 grid place-items-center bg-background/25"><Play className="size-10 text-primary-foreground" /></span>
                  </a>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <img
                        src={profile?.avatar_url || "/placeholder.svg"}
                        alt={profile?.full_name ?? "Friend"}
                        className="size-10 shrink-0 rounded-full border border-glass-border object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{profile?.full_name ?? "Friend"}</p>
                        <p className="text-xs uppercase text-muted-foreground">{status.status_type === "ai" ? "BLUE HEART AI" : status.platform}</p>
                      </div>
                    </div>
                    {canDelete && (
                      <Button variant="ghost" size="icon-sm" title="Delete status" onClick={() => removeStatus.mutate(status.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{status.content}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-glass-border pt-2">
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => toggleLike.mutate({ statusId: status.id, liked })}>
                      <Heart className={`size-4 ${liked ? "fill-current text-destructive" : ""}`} /> {likes.length}
                    </Button>
                    {status.original_url && (
                      <a href={status.original_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        Watch <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </section>
  );
}