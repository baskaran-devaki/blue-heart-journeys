import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/bhg/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { aiThreadsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "BLUE HEART AI – BLUE HEART GUYS" },
      { name: "description", content: "BLUE HEART GUYS நண்பர்களுக்கான தனிப்பட்ட தமிழ் AI உதவியாளர்." },
      { property: "og:title", content: "BLUE HEART AI – BLUE HEART GUYS" },
      { property: "og:description", content: "Private Tamil-first AI conversations for BLUE HEART GUYS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatLanding,
});

function ChatLanding() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: threads = [], isLoading } = useQuery(aiThreadsQuery);
  const started = useRef(false);
  const createThread = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const { data, error } = await supabase
        .from("ai_threads")
        .insert({ title: "புதிய உரையாடல்", user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
      void navigate({ to: "/chat/$threadId", params: { threadId: id }, replace: true });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (pathname !== "/chat") return;
    if (isLoading || started.current) return;
    started.current = true;
    const latest = threads[0];
    if (latest) {
      void navigate({ to: "/chat/$threadId", params: { threadId: latest.id }, replace: true });
    } else {
      createThread.mutate();
    }
  }, [createThread, isLoading, navigate, pathname, threads]);

  if (pathname !== "/chat") return <Outlet />;

  return (
    <AppShell>
      <div className="grid min-h-[24rem] place-items-center text-center">
        <div>
          <div className="animate-pulse text-4xl">🤖</div>
          <p className="tamil mt-3 text-sm text-muted-foreground">BLUE HEART AI திறக்கிறது...</p>
        </div>
      </div>
    </AppShell>
  );
}