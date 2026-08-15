<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# RightVibe

**RightVibe is where app developers and sound/haptics producers build UI sound effects and
haptic feedback together, without the producer needing the app's real codebase.**

A developer uploads screenshots of their app and marks up hotspots over the interactive bits —
buttons, menus, screen transitions, in-app video, popups, error states — then shares a link. A
producer opens that link, clicks a hotspot, uploads an SFX file, and can layer on haptic feedback:
hand-built, AI-generated from the SFX itself, or haptics-only with no sound at all. They can test
the interaction live — real vibration on Android via the Web Vibration API, or a `.AHAP` download
for iOS, since Safari has no vibration API at all.

## Features

- **No app build required** — screenshots + hotspots stand in for the real UI.
- **Per-hotspot SFX** — upload, audition, and swap sound effects per interaction.
- **Haptics editor** — a draggable intensity/sharpness visualizer plus a numeric event table for
  fine control over taps and holds.
- **AI-assisted haptics** — generate a starting pattern from the SFX audio itself (Gemini), then
  edit it by hand.
- **Live device testing** — real vibration on Android Chrome; `.AHAP` export for iOS.
- **Shareable projects** — one link, no accounts, autosaves as the producer works.

## How it works

**Developer**
1. Go to `/new`, name the project, upload one or more screenshots.
2. Drag out a rectangle over each interactive element and tag its type (button, menu, screen
   enter, video, popup, error, custom).
3. Save to get a share link — send it to your producer.

**Producer**
1. Open the link, click a hotspot.
2. Upload an SFX file, or skip it for haptics-only.
3. Toggle haptic feedback on and either build a pattern by hand, or generate one from the SFX
   with AI and refine it.
4. Hit **Test** to feel it — live vibration on Android, or download the `.AHAP` to test on iPhone.

## Tech stack

- **Frontend**: Vite + React + TypeScript, client-routed with `react-router-dom` (`HashRouter`, so
  no server rewrite is needed and nothing can shadow `/api/*`).
- **Backend**: Vercel serverless functions under `api/`.
  - `api/projects` (POST) / `api/projects/[id]` (GET, PUT) — project + hotspot CRUD, stored as
    JSON in Redis.
  - `api/blob/upload` — issues client upload tokens for Vercel Blob (screenshots + SFX audio).
  - `api/generate-haptics` — calls Gemini server-side to generate an AHAP pattern from an
    uploaded SFX file. The Gemini key never reaches the browser.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and fill in the values (see below).
3. Run the frontend only:
   `npm run dev`

   The `/api/*` routes are Vercel serverless functions, not part of the Vite dev server. To
   exercise uploads, project save/load, or AI haptic generation locally, run `npx vercel dev`
   instead (requires `vercel login` and `vercel link` once, so it can pull your project's env vars).

## Deploy to Vercel

1. Import this repository into [Vercel](https://vercel.com/new). `vercel.json` already declares
   the Vite framework, build command, and output directory.
2. **Connect a Blob store**: Project → Storage → Create Database → Blob. This provisions
   `BLOB_READ_WRITE_TOKEN` automatically.
3. **Connect a Redis store**: Project → Storage → Create Database → pick a Redis option from the
   Marketplace (Upstash). This provisions either `KV_REST_API_URL`/`KV_REST_API_TOKEN` or
   `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` — `api/_lib/redis.ts` reads either naming.
4. **Set `GEMINI_API_KEY`**: Settings → Environment Variables. This is read only in
   `api/generate-haptics.ts`, server-side — it is never bundled into the client.
5. Deploy.

See [.env.example](.env.example) for the full list of env vars needed to run everything locally
via `vercel dev`.

## Platform notes

- **iOS Safari has no Web Vibration API** — there is no way for a web page to trigger real haptic
  feedback on iPhone. The `.AHAP` export is the intended path for testing/integrating on iOS.
- **Android Chrome** supports `navigator.vibrate()`, which RightVibe uses for a live on-device
  preview — it's an on/off approximation of the AHAP pattern (duration only, no intensity or
  sharpness), not a byte-for-byte reproduction.
