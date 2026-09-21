import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Database, Json } from "@/integrations/supabase/types";
import { createOpenAI } from "@ai-sdk/openai";

type ChatBody = { id?: unknown; messages?: unknown };

const MOBILE_APP_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
]);

function mobileCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !MOBILE_APP_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Lovable-AIG-Run-ID",
    "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
    Vary: "Origin",
  };
}

function chatResponse(request: Request, body: BodyInit | null, status: number) {
  return new Response(body, { status, headers: mobileCorsHeaders(request) });
}

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
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: mobileCorsHeaders(request) }),
      POST: async ({ request }) => {
        try {
          const supabase = memberClient(request);
          if (!supabase) return chatResponse(request, "Sign in required", 401);

          const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
          const { data: claims, error: authError } = await supabase.auth.getClaims(token);
          const userId = claims?.claims?.sub;
          if (authError || !userId) return chatResponse(request, "Sign in required", 401);

          const body = (await request.json()) as ChatBody;
          if (typeof body.id !== "string" || !Array.isArray(body.messages)) {
            return chatResponse(request, "Conversation and messages are required", 400);
          }

          const { data: thread, error: threadError } = await supabase
            .from("ai_threads")
            .select("id, title")
            .eq("id", body.id)
            .eq("user_id", userId)
            .maybeSingle();
          if (threadError || !thread) return chatResponse(request, "Conversation not found", 404);

          const incoming = body.messages as UIMessage[];
          const newestUser = [...incoming].reverse().find((message) => message.role === "user");
          const newestText = newestUser ? messageText(newestUser) : "";
          if (!newestUser || !newestText) return chatResponse(request, "Message is required", 400);

          const { error: saveUserError } = await supabase.from("ai_messages").upsert(
            {
              id: newestUser.id,
              thread_id: thread.id,
              user_id: userId,
              role: "user",
              content: newestText,
              parts: newestUser.parts as unknown as Json,
            },
            { onConflict: "id", ignoreDuplicates: true },
          );
          if (saveUserError) return chatResponse(request, saveUserError.message, 400);

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
          if (rowsError) return chatResponse(request, rowsError.message, 400);

          const history: UIMessage[] = (savedRows ?? []).map((row) => ({
            id: row.id,
            role: row.role === "assistant" ? "assistant" : "user",
            parts: Array.isArray(row.parts)
              ? (row.parts as UIMessage["parts"])
              : [{ type: "text" as const, text: row.content }],
          }));

          const threadUpdate = {
            updated_at: new Date().toISOString(),
            ...(thread.title === "புதிய உரையாடல்"
              ? { title: newestText.replace(/\s+/g, " ").slice(0, 48) }
              : {}),
          };
          await supabase.from("ai_threads").update(threadUpdate).eq("id", thread.id);

          const apiKey = process.env["OPENAI_API_KEY"];
          if (!apiKey) return chatResponse(request, "Blue Heart AI is not configured", 500);

          const openai = createOpenAI({ apiKey });
          const tripContext = trip
            ? `Current trip plan: ${JSON.stringify(trip)}`
            : "There is no current or upcoming trip plan.";

          const result = streamText({
            model: openai.responses("gpt-5.6-luna"),
            system:
              "You are BLUE HEART AI, the private assistant for the BLUE HEART GUYS friends group. Reply naturally in Tamil first, while keeping code, technical terms, place names, and requested languages accurate. Help with general questions, coding, travel, places, routes, schedules, and budgets. Be warm, practical, concise, and honest. Use the supplied trip plan only when relevant; never invent missing trip facts. " +
              tripContext,
            messages: await convertToModelMessages(history),
            abortSignal: request.signal,
          });
          const response = result.toUIMessageStreamResponse({
            originalMessages: history,
            sendReasoning: true,
            headers: mobileCorsHeaders(request),
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
                  parts: responseMessage.parts as unknown as Json,
                },
                { onConflict: "id", ignoreDuplicates: true },
              );
              if (error) console.error("Failed to save AI message", error.message);
              await supabase
                .from("ai_threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", thread.id);
            },
          });

          return response;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return chatResponse(request, "Cancelled", 499);
          }
          console.error("Blue Heart AI route error", error);
          return chatResponse(
            request,
            error instanceof Error ? error.message : "Blue Heart AI failed",
            500,
          );
        }
      },
    },
  },
});