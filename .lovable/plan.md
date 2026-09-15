# Blue Heart AI and 24-hour Friends Status

## Overview
Replace the existing group Chat screen with a private, Tamil-first Blue Heart AI experience. Each friend will have separate saved conversation threads. Add a 24-hour Friends Status feed to Home for shared AI answers and supported video links, without changing existing trips, wallet, YouTube, payments, TV mode, authentication, or member data.

## What will change

### 1. Private threaded Blue Heart AI
- Keep the existing `/chat` destination so current navigation continues to work, but change its visible label and screen to `BLUE HEART AI`.
- Add a thread list, new-chat action, and a dedicated `/chat/:threadId` page so every conversation has a stable URL and reloads correctly.
- Stream real responses from Lovable AI using the required OpenAI model, with Tamil-first instructions and natural support for general questions, coding, travel, routes, places, and budgets.
- Include the existing current/upcoming Trip Plan details in the server-side AI context when relevant.
- Save each friend’s threads and messages privately in the database. Friends can access only their own AI history; admins do not receive access to other friends’ private AI chats.
- Show streamed reasoning/loading state, markdown answers, stop controls, errors, and a focused mobile-friendly composer using installed AI Elements primitives.

### 2. Share AI answers and videos
- Add `Share to Home` only to completed assistant answers.
- Add a compact status composer on the AI screen for YouTube/Shorts, Instagram Reels, and Facebook Reels URLs.
- Store the original video URL only. Derive the platform and use safe public preview metadata or a platform thumbnail where available; never download or copy the media.
- Prevent users from sharing another friend’s private AI message.

### 3. Friends Status on Home
- Add a `FRIENDS STATUS` section below the existing trip card.
- Show active AI answers and video shares newest first, with the friend’s current name and profile photo.
- Hide expired rows in both database access rules and app queries using `expires_at > now()`, so refreshes and stale caches cannot restore them.
- Allow owners to remove their own status and admins to remove any status.
- Add one optional heart-like per friend, with an accurate count and toggle behavior.
- Keep every status for exactly 24 hours from creation; no existing app data is deleted or reset.

## Database and security
- Add only four new tables:
  - `ai_threads`: owner and title.
  - `ai_messages`: thread, owner, role, message parts/content.
  - `friend_statuses`: owner, AI/video type, shared content, original URL, platform, preview metadata, and expiry.
  - `friend_status_likes`: status and user.
- Grant authenticated access only, enable row-level security on every table, and keep privileged server access limited to authenticated request handling.
- AI thread/message rules remain owner-only. Statuses are readable only while active; status removal is owner-or-admin; likes are one per user and only on active statuses.
- Do not alter or migrate existing chat, trip, payment, wallet, member, memory, notification, or video records.

## Technical implementation
- Install the current AI SDK packages and AI Elements `conversation`, `message`, `prompt-input`, `reasoning`, and `shimmer` source components.
- Add a protected streaming TanStack server route for AI calls. The API key remains server-side and is never sent to the browser.
- Use the Responses API with streaming, reasoning summaries, full conversation replay, and run-ID propagation.
- Add small client query/mutation helpers for threads, messages, statuses, and likes using the existing authenticated browser client and cache conventions.
- Preserve the current blue/glass visual tokens and responsive shell; only the replaced Chat page and new Home status section receive new UI.

## Verification
- Run the project’s full build and lint checks.
- Verify signed-in flows at mobile and desktop widths: create two threads, send messages in each, reload both thread URLs, share an AI answer, share supported video URLs, toggle one like, delete as owner/admin, and confirm expired statuses are excluded.
- Confirm the AI key is absent from browser code/network payloads and that one friend cannot read another friend’s threads or messages.
