<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# RightVibe

RightVibe is a collaboration tool for app developers and sound/haptics producers. A developer
uploads screenshots of their app and marks up hotspots (buttons, menus, screen transitions,
in-app video, popups, error states) over them, then shares a link. A producer opens that link,
clicks a hotspot, uploads an SFX file, and can add haptic feedback too - hand-built, AI-generated
from the SFX, or haptics-only with no sound at all. They can test the interaction live: real
vibration on Android (via the Web Vibration API), or a `.AHAP` download for iOS, since Safari has
no vibration API at all.

## Architecture

- **Frontend**: Vite + React + TypeScript, client-side routed with `react-router-dom` (`HashRouter`,
  so no server rewrite rules are needed and nothing can shadow `/api/*`).
- **Backend**: Vercel serverless functions under `api/`.
  - `api/projects` (POST) / `api/projects/[id]` (GET, PUT) - project + hotspot CRUD, stored as JSON
    in Redis.
  - `api/blob/upload` - issues client upload tokens for Vercel Blob (screenshots + SFX audio).
  - `api/generate-haptics` - calls Gemini server-side to generate an AHAP pattern from an uploaded
    SFX file. The Gemini key never reaches the browser.

## Run Locally

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

1. Import this repository into [Vercel](https://vercel.com/new). `vercel.json` already declares the
   Vite framework, build command, and output directory.
2. **Connect a Blob store**: Project → Storage → Create Database → Blob. This provisions
   `BLOB_READ_WRITE_TOKEN` automatically.
3. **Connect a Redis store**: Project → Storage → Create Database → pick a Redis option from the
   Marketplace (Upstash). This provisions either `KV_REST_API_URL`/`KV_REST_API_TOKEN` or
   `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` - `api/_lib/redis.ts` reads either naming.
4. **Set `GEMINI_API_KEY`**: Settings → Environment Variables. This is read only in
   `api/generate-haptics.ts`, server-side - it is never bundled into the client.
5. Deploy.

See [.env.example](.env.example) for the full list of env vars needed to run everything locally
via `vercel dev`.
