import { createFileRoute } from "@tanstack/react-router";
import { AiThreadWorkspace } from "@/components/bhg/AiThreadWorkspace";
import { AppShell } from "@/components/bhg/AppShell";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "BLUE HEART AI Conversation – BLUE HEART GUYS" },
      { name: "description", content: "A private BLUE HEART AI conversation." },
      { property: "og:title", content: "BLUE HEART AI Conversation" },
      { property: "og:description", content: "Private Tamil-first AI conversation for BLUE HEART GUYS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  return (
    <AppShell>
      <AiThreadWorkspace key={threadId} threadId={threadId} />
    </AppShell>
  );
}