import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { aiEnabled, getClient, MODEL } from "./claude";

/**
 * Research loop: Claude uses the web_search server tool, then hands back its
 * findings by calling a strict "report" tool, which we validate with Zod.
 * Handles pause_turn (server-side search loop limit) and one nudge if Claude
 * finishes without reporting. Returns null on any failure so callers can fall back.
 */

/** JSON Schema for strict tool use: every object closed, every property required. */
export function strictSchema(schema: z.ZodType): Anthropic.Beta.BetaTool["input_schema"] {
  const json = z.toJSONSchema(schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "object" && n.properties) {
      n.additionalProperties = false;
      n.required = Object.keys(n.properties as object);
    }
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) v.forEach(walk);
      else walk(v);
    }
  };
  walk(json);
  delete json.$schema;
  return json as Anthropic.Beta.BetaTool["input_schema"];
}

export async function runResearch<S extends z.ZodType>({
  system,
  prompt,
  report,
  schema,
  maxSearches = 8,
  blockedDomains,
  effort = "medium",
  tag = "research",
}: {
  system: string;
  prompt: string;
  /** name + description of the strict tool Claude calls with its final answer */
  report: { name: string; description: string };
  schema: S;
  maxSearches?: number;
  blockedDomains?: string[];
  effort?: "low" | "medium" | "high";
  tag?: string;
}): Promise<z.infer<S> | null> {
  if (!aiEnabled()) return null;
  const client = getClient();

  const reportTool: Anthropic.Beta.BetaTool = {
    name: report.name,
    description: report.description,
    strict: true,
    input_schema: strictSchema(schema),
  };
  const search: Anthropic.Beta.BetaToolUnion = {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: maxSearches,
    ...(blockedDomains?.length ? { blocked_domains: blockedDomains } : {}),
  };
  const tools: Anthropic.Beta.BetaToolUnion[] = [search, reportTool];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];

  let nudged = false;
  for (let turn = 0; turn < 6; turn++) {
    let msg: Anthropic.Beta.BetaMessage;
    try {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort },
        system,
        tools,
        messages,
      });
      msg = await stream.finalMessage();
    } catch (err) {
      if (err instanceof Anthropic.APIError) console.warn(`[${tag}] API error ${err.status}: ${err.message}`);
      else console.warn(`[${tag}] request failed`, err);
      return null;
    }

    if (process.env.RESEARCH_DEBUG === "1" || process.env.NODE_ENV === "development") logTurn(tag, msg);
    if (msg.stop_reason === "refusal" || msg.stop_reason === "max_tokens") return null;

    const call = msg.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === report.name,
    );
    if (call) {
      const parsed = schema.safeParse(call.input);
      if (!parsed.success) console.warn(`[${tag}] report failed validation`);
      return parsed.success ? parsed.data : null;
    }

    messages.push({ role: "assistant", content: msg.content });
    if (msg.stop_reason === "pause_turn") continue; // server-side search loop hit its limit; resume
    if (nudged) return null;
    nudged = true;
    messages.push({ role: "user", content: `Now call ${report.name} with what you found.` });
  }
  return null;
}

/** Dev diagnostics: what Claude searched for, what came back, and why it stopped. */
function logTurn(tag: string, msg: Anthropic.Beta.BetaMessage) {
  for (const b of msg.content) {
    if (b.type === "server_tool_use") console.log(`[${tag}] search:`, JSON.stringify(b.input));
    else if (b.type === "web_search_tool_result") {
      const c = b.content as unknown;
      if (Array.isArray(c)) console.log(`[${tag}]   ${c.length} results:`, c.slice(0, 6).map((r: { url?: string }) => r.url).join("  "));
      else console.log(`[${tag}]   search error:`, JSON.stringify(c));
    } else if (b.type === "tool_use") {
      const i = b.input as Record<string, unknown>;
      console.log(`[${tag}] report: matched=${String(i.matched)} sources=${Array.isArray(i.sources) ? i.sources.length : "-"} missing=${JSON.stringify(i.missing ?? "")}`);
    }
  }
  console.log(`[${tag}] stop_reason=${msg.stop_reason}`);
}
