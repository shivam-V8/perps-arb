/**
 * Worker entry: OpenNext's generated Next.js handler, plus a cron trigger that
 * runs the weekly Pro digests (see src/app/api/cron/digest).
 */
// @ts-expect-error generated at build time by `opennextjs-cloudflare build`
import { default as handler } from "./.open-next/worker.js";

interface Env {
  CRON_SECRET?: string;
  [key: string]: unknown;
}

export default {
  fetch: handler.fetch,
  async scheduled(_controller: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    if (!env.CRON_SECRET) return;
    const req = new Request("https://chainmatch.ai/api/cron/digest", {
      method: "POST",
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    ctx.waitUntil(handler.fetch(req, env, ctx));
  },
};

// @ts-expect-error generated at build time
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
