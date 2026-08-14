import { Redis } from '@upstash/redis';

// Supports both the legacy Vercel KV env var names and the current Upstash-via-Marketplace names,
// since which one is present depends on how the Redis store was connected in the Vercel dashboard.
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error(
    'Missing Redis connection env vars. Connect a Redis (Upstash) store to this project in the Vercel dashboard ' +
      'so KV_REST_API_URL/KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN) are set.'
  );
}

export const redis = new Redis({ url, token });

export const projectKey = (id: string) => `project:${id}`;
