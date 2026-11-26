import "server-only";
import { esc, layout, sendEmail } from "@/lib/email";
import { createLoginToken, recentLoginTokens } from "@/server/data";

/** Max sign-in emails per address per hour. */
const LINKS_PER_HOUR = 5;

/** The site's public origin: configured URL in production, else the request's own origin. */
export function siteOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && process.env.NODE_ENV === "production") return configured.replace(/\/$/, "");
  return new URL(req.url).origin;
}

/**
 * Emails a one-time sign-in link. Returns "sent" even when it doesn't send
 * (rate limit), so callers never reveal whether an address has an account.
 */
export async function sendSignInLink(email: string, origin: string, reason?: string): Promise<"sent" | "failed"> {
  if ((await recentLoginTokens(email)) >= LINKS_PER_HOUR) return "sent";
  const token = await createLoginToken(email);
  const link = `${origin}/auth/verify?token=${encodeURIComponent(token)}`;
  const intro = reason ?? "Use this link to sign in to ChainMatch.";
  const ok = await sendEmail({
    to: email,
    subject: "Your ChainMatch sign-in link",
    text: `${intro}\n\n${link}\n\nThe link works once and expires in 20 minutes. If you didn't ask for it, ignore this email.`,
    html: layout(
      "Sign in to ChainMatch",
      `<p style="margin:0 0 18px;line-height:1.5">${esc(intro)}</p>
<p style="margin:0 0 18px"><a href="${esc(link)}" style="display:inline-block;background:#16181d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">Sign in</a></p>
<p style="margin:0;font-size:13px;color:#6b7079">The link works once and expires in 20 minutes.</p>`,
      "If you didn't ask for this, you can ignore it.",
    ),
  });
  return ok ? "sent" : "failed";
}
