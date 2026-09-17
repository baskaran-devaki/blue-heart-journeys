import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Database } from "@/integrations/supabase/types";
import {
  createLovableResponsesProvider,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

type ChatBody = { id?: unknown; messages?: unknown };

const messageText = (message: UIMessage) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();

function memberClient(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const authorization = request.headers.get("authorization");
  if (!url || !key) throw new Error("App authentication is not configured");
  if (!authorization?.startsWith("Bearer ")) return null;

  return createClient<Database>(url, key, {
    global: {
      headers: { Authorization: authorization },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        headers.set("Authorization", authorization);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const supabase = memberClient(request);
          if (!supabase) return new Response("Sign in required", { status: 401 });

          const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
          const { data: claims, error: authError } = await supabase.auth.getClaims(token);
          const userId = claims?.claims?.sub;
          if (authError || !userId) return new Response("Sign in required", { status: 401 });

          const body = (await request.json()) as ChatBody;
          if (typeof body.id !== "string" || !Array.isArray(body.messages)) {
            return new Response("Conversation and messages are required", { status: 400 });
          }

          const { data: thread, error: threadError } = await supabase
            .from("ai_threads")
            .select("id, title")
            .eq("id", body.id)
            .eq("user_id", userId)
            .maybeSingle();
          if (threadError || !thread) return new Response("Conversation not found", { status: 404 });

          const incoming = body.messages as UIMessage[];
          const newestUser = [...incoming].reverse().find((message) => message.role === "user");
          const newestText = newestUser ? messageText(newestUser) : "";
          if (!newestUser || !newestText) return new Response("Message is required", { status: 400 });

          const { error: saveUserError } = await supabase.from("ai_messages").upsert(
            {
              id: newestUser.id,
              thread_id: thread.id,
              user_id: userId,
              role: "user",
              content: newestText,
              parts: newestUser.parts as Database["public"]["Tables"]["ai_messages"]["Insert"]["parts"],
            },
            { onConflict: "id", ignoreDuplicates: true },
          );
          if (saveUserError) return new Response(saveUserError.message, { status: 400 });

          const [{ data: savedRows, error: rowsError }, { data: trip }] = await Promise.all([
            supabase
              .from("ai_messages")
              .select("id, role, parts, content")
              .eq("thread_id", thread.id)
              .order("created_at", { ascending: true }),
            supabase
              .from("trips")
              .select("name, destination, start_location, start_date, end_date, details, budget_per_person, journey_places, total_budget, status")
              .in("status", ["live", "active", "upcoming"])
              .order("start_date", { ascending: true, nullsFirst: false })
              .limit(1)
              .maybeSingle(),
          ]);
          if (rowsError) return new Response(rowsError.message, { status: 400 });

          const history: UIMessage[] = (savedRows ?? []).map((row) => ({
            id: row.id,
            role: row.role === "assistant" ? "assistant" : "user",
            parts: Array.isArray(row.parts)
              ? (row.parts as UIMessage["parts"])
              : [{ type: "text" as const, text: row.content }],
          }));

          if (thread.title === "புதிய உரையாடல்") {
            const title = newestText.replace(/\s+/g, " ").slice(0, 48);
            await supabase.from("ai_threads").update({ title }).eq("id", thread.id);
          }

          const apiKey = process.env["LOVABLE_API_KEY"];
          if (!apiKey) return new Response("Blue Heart AI is not configured", { status: 500 });

          const initialRunId = getLovableAiGatewayRunId(request);
          const { provider, runIdFetch } = createLovableResponsesProvider(apiKey, initialRunId);
          const tripContext = trip
            ? `Current trip plan: ${JSON.stringify(trip)}`
            : "There is no current or upcoming trip plan.";

          const result = streamText({
            model: provider.responses("openai/gpt-6-astra"),
            system:
              "You are BLUE HEART AI, the private assistant for the BLUE HEART GUYS friends group. Reply naturally in Tamil first, while keeping code, technical terms, place names, and requested languages accurate. Help with general questions, coding, travel, places, routes, schedules, and budgets. Be warm, practical, concise, and honest. Use the supplied trip plan only when relevant; never invent missing trip facts. " +
              tripContext,
            messages: await convertToModelMessages(history),
            abortSignal: request.signal,
            providerOptions: {
              openai: {
                forceReasoning: true,
                reasoningEffort: "medium",
                reasoningSummary: "auto",
                store: false,
                include: ["reasoning.encrypted_content"],
              },
            },
          });

          const response = result.toUIMessageStreamResponse({
            originalMessages: history,
            sendReasoning: true,
            onError: (error) =>
              error instanceof Error ? error.message : "Blue Heart AI could not answer right now",
            onFinish: async ({ responseMessage, isAborted }) => {
              if (isAborted) return;
              const content = messageText(responseMessage);
              if (!content) return;
              const { error } = await supabase.from("ai_messages").upsert(
                {
                  id: responseMessage.id,
                  thread_id: thread.id,
                  user_id: userId,
                  role: "assistant",
                  content,
                  parts: responseMessage.parts as Database["public"]["Tables"]["ai_messages"]["Insert"]["parts"],
                },
                { onConflict: "id", ignoreDuplicates: true },
              );
              if (error) console.error("Failed to save AI message", error.message);
            },
          });

          return withLovableAiGatewayRunIdHeader(response, runIdFetch);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return new Response("Cancelled", { status: 499 });
          }
          console.error("Blue Heart AI route error", error);
          return new Response(error instanceof Error ? error.message : "Blue Heart AI failed", {
            status: 500,
          });
        }
      },
    },
  },
});