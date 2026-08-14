<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1BO3K4BPIeQj7VLEKQijbyWVaUTiGdsNq

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (see [.env.example](.env.example))
3. Run the app:
   `npm run dev`

## Deploy to Vercel

This is a static Vite app and deploys to Vercel out of the box.

1. Import this repository into [Vercel](https://vercel.com/new).
2. Vercel auto-detects the Vite framework (build command `npm run build`, output directory `dist`); a `vercel.json` is included to make this explicit.
3. In the Vercel project's **Settings → Environment Variables**, add `GEMINI_API_KEY` with your Gemini API key.
4. Deploy.

> Note: the Gemini API key is compiled into the client-side bundle at build time (via `vite.config.ts`), so it is visible to anyone who inspects the deployed site. Use a key that's restricted/rotatable, or move the Gemini call behind a server-side API route if you need to keep it secret.
