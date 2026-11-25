import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

/**
 * Server-only Claude access. Every AI feature calls `generate`, which returns
 * schema-validated JSON (structured outputs) or null — callers fall back to
 * the local heuristics when it does, so the app works without a key.
 */

export const MODEL = "claude-opus-5-5";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
export function getClient() {
  return (client ??= new Anthropic());
}

type Effort = "low" | "medium" | "high";

export async function generate<S extends z.ZodType>({
  system,
  prompt,
  schema,
  effort = "low",
}: {
  system: string;
  /** plain text, or content blocks (e.g. a PDF document followed by text) */
  prompt: string | Anthropic.Beta.BetaContentBlockParam[];
  schema: S;
  effort?: Effort;
}): Promise<z.infer<S> | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // on a safety decline, the API re-runs the request on a fallback model
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: { effort, format: betaZodOutputFormat(schema) },
    });
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
    return (res.parsed_output as z.infer<S> | null) ?? null;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) console.warn("[ai] rate limited");
    else if (err instanceof Anthropic.AuthenticationError) console.warn("[ai] invalid ANTHROPIC_API_KEY");
    else if (err instanceof Anthropic.APIError) console.warn(`[ai] API error ${err.status}: ${err.message}`);
    else console.warn("[ai] request failed", err);
    return null;
  }
}

/** Untrusted text from users goes inside tags so the model treats it as data. */
export function quote(tag: string, text: string, max = 6000): string {
  return `<${tag}>\n${text.slice(0, max)}\n</${tag}>`;
}
