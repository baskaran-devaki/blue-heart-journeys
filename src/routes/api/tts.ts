import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type TtsBody = {
  text?: unknown;
};

const MOBILE_APP_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !MOBILE_APP_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
}

function response(request: Request, body: BodyInit | null, status: number, extraHeaders?: HeadersInit) {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });
}

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
        headers.set("apikey", key);
        headers.set("Authorization", authorization);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(request),
        }),

      POST: async ({ request }) => {
        try {
          const supabase = memberClient(request);
          if (!supabase) return response(request, "Sign in required", 401);

          const token =
            request.headers.get("authorization")?.replace("Bearer ", "") ?? "";

          const { data: claims, error: authError } =
            await supabase.auth.getClaims(token);

          const userId = claims?.claims?.sub;
          if (authError || !userId) {
            return response(request, "Sign in required", 401);
          }

          const body = (await request.json()) as TtsBody;
          const text = typeof body.text === "string" ? body.text.trim() : "";

          if (!text) {
            return response(request, "Text is required", 400);
          }

          if (text.length > 4000) {
            return response(request, "Text is too long", 400);
          }

          const apiKey = process.env["OPENAI_API_KEY"];
          if (!apiKey) {
            return response(request, "Blue Heart AI is not configured", 500);
          }

          const openaiResponse = await fetch(
            "https://api.openai.com/v1/audio/speech",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-4o-mini-tts",
                voice: "coral",
                input: text,
                response_format: "mp3",
                instructions:
                  "Speak naturally in Tamil with a warm, friendly, clear female-presenting voice. Use natural Tamil pronunciation, gentle pacing, and conversational expression.",
              }),
              signal: request.signal,
            },
          );

          if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error("OpenAI TTS error:", errorText);
            return response(request, "Voice generation failed", 502);
          }

          const audio = await openaiResponse.arrayBuffer();

          return response(request, audio, 200, {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return response(request, "Cancelled", 499);
          }

          console.error("Blue Heart TTS route error", error);
          return response(
            request,
            error instanceof Error ? error.message : "Voice generation failed",
            500,
          );
        }
      },
    },
  },
});