import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Paperclip, Pin, Trash2 } from "lucide-react";
import { AppShell } from "@/components/bhg/AppShell";
import { GlassCard, CardTitle } from "@/components/bhg/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { profilesQuery } from "@/lib/queries";
import { dateTime } from "@/lib/bhg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "💬 Members Chat – BLUE HEART GUYS" },
      {
        name: "description",
        content: "BLUE HEART GUYS உறுப்பினர்களுக்கான தனிப்பட்ட realtime குழு அரட்டை.",
      },
      { property: "og:title", content: "💬 Members Chat – BLUE HEART GUYS" },
      { property: "og:description", content: "Private realtime group chat for approved members." },
    ],
  }),
  component: ChatPage,
});

const EMOJIS = ["💙", "😂", "🔥", "🎉", "❤️", "👍", "😍", "🙏"];

function ChatPage() {
  const { user, isAdmin, profile } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [online, setOnline] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profiles } = useQuery(profilesQuery);

  const { data: messages } = useQuery({
    queryKey: ["chat"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("deleted", false)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reactions } = useQuery({
    queryKey: ["chat-reactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("message_reactions").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("bhg-chat")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        void qc.invalidateQueries({ queryKey: ["chat"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        void qc.invalidateQueries({ queryKey: ["chat-reactions"] });
      })
      .on("presence", { event: "sync" }, () => {
        setOnline(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && user) {
          void channel.track({ user_id: user.id, name: profile?.full_name ?? "Member" });
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, user, profile?.full_name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const send = useMutation({
    mutationFn: async (payload: { body: string; media_url?: string; media_kind?: "photo" | "video" }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        body: payload.body,
        media_url: payload.media_url ?? null,
        media_kind: payload.media_kind ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => setText(""),
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMedia = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not signed in");
      const kind = file.type.startsWith("video") ? "video" : "photo";
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("chat-media").upload(path, file);
      if (upErr) throw upErr;
      const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
      await send.mutateAsync({ body: "", media_url: data?.signedUrl ?? path, media_kind: kind });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const react = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error("Not signed in");
      const existing = reactions?.find(
        (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji,
      );
      if (existing) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        await supabase
          .from("message_reactions")
          .insert({ message_id: messageId, user_id: user.id, emoji });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moderate = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "pin" | "delete"; pinned?: boolean }) => {
      if (action === "delete") {
        const { error } = await supabase.from("chat_messages").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const msg = messages?.find((m) => m.id === id);
      const { error } = await supabase
        .from("chat_messages")
        .update({ pinned: !msg?.pinned })
        .eq("id", id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nameOf = (id: string) =>
    profiles?.find((p) => p.id === id)?.full_name ?? (id === user?.id ? "நான்" : "Member");

  const pinned = useMemo(() => (messages ?? []).filter((m) => m.pinned), [messages]);

  return (
    <AppShell showFooter={false}>
      <GlassCard className="flex h-[calc(100vh-13rem)] flex-col">
        <CardTitle
          icon="💬"
          title="MEMBERS CHAT"
          subtitle={`${online} online`}
        />

        {pinned.length ? (
          <div className="mb-2 rounded-2xl border border-warning/40 bg-warning/10 p-2">
            {pinned.map((m) => (
              <p key={m.id} className="tamil text-[11px]">
                📌 {m.body}
              </p>
            ))}
          </div>
        ) : null}

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {(messages ?? []).map((m) => {
            const mine = m.user_id === user?.id;
            const mReactions = (reactions ?? []).filter((r) => r.message_id === m.id);
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2",
                    mine
                      ? "gradient-blue text-primary-foreground"
                      : "border border-glass-border bg-secondary/40",
                  )}
                >
                  {!mine ? (
                    <p className="tamil text-[10px] font-semibold opacity-80">{nameOf(m.user_id)}</p>
                  ) : null}
                  {m.media_url ? (
                    m.media_kind === "video" ? (
                      <video
                        src={m.media_url}
                        controls
                        preload="metadata"
                        className="mt-1 max-h-52 rounded-xl"
                      />
                    ) : (
                      <img
                        src={m.media_url}
                        alt="chat media"
                        loading="lazy"
                        className="mt-1 max-h-52 rounded-xl object-cover"
                      />
                    )
                  ) : null}
                  {m.body ? <p className="tamil text-sm break-words">{m.body}</p> : null}
                  <p className="mt-0.5 text-[9px] opacity-70">{dateTime(m.created_at)}</p>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {EMOJIS.slice(0, 4).map((e) => {
                    const count = mReactions.filter((r) => r.emoji === e).length;
                    return (
                      <button
                        key={e}
                        onClick={() => react.mutate({ messageId: m.id, emoji: e })}
                        className={cn(
                          "rounded-full border border-glass-border px-1.5 text-[10px]",
                          count ? "bg-primary/20" : "opacity-50",
                        )}
                      >
                        {e}
                        {count ? ` ${count}` : ""}
                      </button>
                    );
                  })}
                  {isAdmin ? (
                    <>
                      <button
                        onClick={() => moderate.mutate({ id: m.id, action: "pin" })}
                        className="text-warning"
                        aria-label="Pin"
                      >
                        <Pin className="size-3" />
                      </button>
                      <button
                        onClick={() => moderate.mutate({ id: m.id, action: "delete" })}
                        className="text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setText((t) => t + e)}
              className="rounded-full border border-glass-border px-2 py-1 text-sm"
            >
              {e}
            </button>
          ))}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMedia.mutate(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-glass-border text-primary"
            aria-label="Attach media"
          >
            <Paperclip className="size-4" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) send.mutate({ body: text.trim() });
            }}
            placeholder="செய்தி எழுதுங்கள்..."
            className="tamil flex-1 rounded-full border border-glass-border bg-secondary/40 px-4 py-2.5 text-sm outline-none"
          />
          <button
            onClick={() => text.trim() && send.mutate({ body: text.trim() })}
            className="gradient-blue grid size-10 shrink-0 place-items-center rounded-full text-primary-foreground"
            aria-label="Send"
          >
            <Send className="size-4" />
          </button>
        </div>
      </GlassCard>
    </AppShell>
  );
}
