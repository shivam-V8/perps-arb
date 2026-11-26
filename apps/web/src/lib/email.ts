import "server-only";

/**
 * Transactional email through Resend's HTTP API (no SDK, works on Workers).
 * Without RESEND_API_KEY (local dev) the message is printed to the server log
 * instead, so sign-in links and digests can still be tested.
 */
export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** e.g. a List-Unsubscribe URL for digests */
  headers?: Record<string, string>;
}

const FROM = process.env.EMAIL_FROM || "ChainMatch <hello@chainmatch.ai>";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(m: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY is not set; not sending", m.subject);
      return false;
    }
    console.log(`\n[email:dev] to=${m.to}\nsubject: ${m.subject}\n${m.text}\n`);
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers }),
    signal: AbortSignal.timeout(15_000),
  }).catch((e: unknown) => {
    console.error("[email] send failed", e);
    return null;
  });
  if (!res?.ok) {
    console.error("[email] Resend error", res?.status, res ? (await res.text().catch(() => "")).slice(0, 300) : "");
    return false;
  }
  return true;
}

/** Minimal HTML escaping for values placed in email templates. */
export function esc(x: string): string {
  return x.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Shared email frame: plain, readable, works in every client. */
export function layout(title: string, body: string, footer = ""): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f4;font-family:Inter,Arial,sans-serif;color:#16181d">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<p style="font-weight:700;font-size:18px;margin:0 0 20px">Chain<span style="color:#059669">Match</span></p>
<div style="background:#fff;border-radius:16px;padding:24px;border:1px solid #ececea">
<h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
${body}
</div>
<p style="font-size:12px;color:#8a8f98;margin:16px 4px 0">${footer}</p>
</div></body></html>`;
}
