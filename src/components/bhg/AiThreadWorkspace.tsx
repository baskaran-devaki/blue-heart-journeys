import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, Menu, Plus, Share2, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { aiMessagesQuery, aiThreadsQuery } from "@/lib/queries";

type AiMessageRow = Database["public"]["Tables"]["ai_messages"]["Row"];

function toMessage(row: AiMessageRow): UIMessage {
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    parts: Array.isArray(row.parts)
      ? (row.parts as UIMessage["parts"])
      : [{ type: "text", text: row.content }],
  };
}

export function AiThreadWorkspace({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hydratedMessages = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const { data: threads = [] } = useQuery(aiThreadsQuery);
  const { data: rows = [], isLoading } = useQuery(aiMessagesQuery(threadId));
  const initialMessages = useMemo(() => rows.map(toMessage), [rows]);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
        prepareSendMessagesRequest: ({ messages, id }) => ({ body: { messages, id } }),
      }),
    [],
  );
  const { messages, setMessages, sendMessage, stop, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
      textareaRef.current?.focus();
    },
    onError: (chatError) => toast.error(chatError.message),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    if (isLoading || hydratedMessages.current) return;
    hydratedMessages.current = true;
    setMessages(initialMessages);
  }, [initialMessages, isLoading, setMessages]);

  const createThread = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const { data, error: createError } = await supabase
        .from("ai_threads")
        .insert({ title: "புதிய உரையாடல்", user_id: user.id })
        .select("id")
        .single();
      if (createError) throw createError;
      return data.id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
      setSidebarOpen(false);
      void navigate({ to: "/chat/$threadId", params: { threadId: id } });
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const deleteThread = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from("ai_threads").delete().eq("id", id);
      if (deleteError) throw deleteError;
    },
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
      if (id === threadId) void navigate({ to: "/chat" });
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const shareAnswer = useMutation({
    mutationFn: async (message: UIMessage) => {
      if (!user) throw new Error("Sign in required");
      const content = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("")
        .trim();
      if (!content) throw new Error("பகிர பதில் இல்லை");
      const { error: shareError } = await supabase.from("friend_statuses").insert({
        status_type: "ai",
        content,
        ai_message_id: message.id,
        user_id: user.id,
      });
      if (shareError) throw shareError;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friend-statuses"] });
      toast.success("Home-க்கு 24 மணி நேரம் பகிரப்பட்டது 💙");
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const sidebar = (
    <aside className="flex h-full min-h-0 flex-col border-r border-glass-border bg-card/95">
      <div className="flex items-center justify-between border-b border-glass-border p-3">
        <p className="font-bold text-foreground">உரையாடல்கள்</p>
        <Button size="icon-sm" onClick={() => createThread.mutate()} disabled={createThread.isPending} title="New conversation">
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {threads.map((thread) => (
          <div key={thread.id} className={`flex items-center rounded-lg ${thread.id === threadId ? "bg-primary/15" : "hover:bg-secondary/60"}`}>
            <Link
              to="/chat/$threadId"
              params={{ threadId: thread.id }}
              onClick={() => setSidebarOpen(false)}
              className="min-w-0 flex-1 px-3 py-2 text-sm font-medium text-foreground"
            >
              <span className="block truncate">{thread.title}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Delete conversation"
              onClick={() => deleteThread.mutate(thread.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </aside>
  );

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-12.5rem)] min-h-[32rem] max-w-7xl overflow-hidden rounded-2xl border border-glass-border bg-card/60 shadow-glass md:h-[calc(100dvh-10rem)]">
      <div className="hidden w-72 shrink-0 md:block">{sidebar}</div>
      {sidebarOpen && (
        <div className="absolute inset-0 z-30 flex md:hidden">
          <div className="w-[min(85vw,18rem)]">{sidebar}</div>
          <button aria-label="Close conversations" className="flex-1 bg-background/75" onClick={() => setSidebarOpen(false)}>
            <X className="ml-4 mt-4 size-5 text-foreground" />
          </button>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-glass-border px-3 sm:px-5">
          <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setSidebarOpen(true)} title="Conversations">
            <Menu className="size-5" />
          </Button>
          <Bot className="size-5 text-primary" />
          <div className="min-w-0">
            <h1 className="truncate font-bold text-foreground">BLUE HEART AI</h1>
            <p className="truncate text-xs text-muted-foreground">தமிழில் கேளுங்கள் · தனிப்பட்ட உரையாடல்</p>
          </div>
        </header>

        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-6">
            {!isLoading && messages.length === 0 && (
              <ConversationEmptyState
                icon={<Bot className="size-8 text-primary" />}
                title="வணக்கம்! நான் BLUE HEART AI"
                description="பயணம், இடங்கள், வழித்தடம், பட்ஜெட், coding அல்லது பொதுக் கேள்விகளை கேளுங்கள்."
              />
            )}
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") return <MessageResponse key={`${message.id}-text-${index}`}>{part.text}</MessageResponse>;
                    if (part.type === "reasoning") {
                      return (
                        <Reasoning key={`${message.id}-reasoning-${index}`} isStreaming={part.state === "streaming"}>
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    }
                    return null;
                  })}
                  {message.role === "assistant" && message.parts.some((part) => part.type === "text" && part.text.trim()) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 gap-1.5 text-xs text-muted-foreground"
                      onClick={() => shareAnswer.mutate(message)}
                      disabled={shareAnswer.isPending}
                    >
                      <Share2 className="size-3.5" /> Share to Home
                    </Button>
                  )}
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" && <Shimmer className="text-sm">சிந்திக்கிறேன்...</Shimmer>}
            {error && <p className="text-sm text-destructive">{error.message}</p>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="shrink-0 border-t border-glass-border bg-card/90 p-3 sm:p-4">
          <PromptInput
            className="mx-auto max-w-3xl"
            onSubmit={async ({ text }) => {
              const value = text.trim();
              if (!value || busy) return;
              setInput("");
              await sendMessage({ text: value });
              textareaRef.current?.focus();
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="தமிழில் கேளுங்கள்..."
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} onStop={stop} disabled={!input.trim() && !busy} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </section>
    </div>
  );
}