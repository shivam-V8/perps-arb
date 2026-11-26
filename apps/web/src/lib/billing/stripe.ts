import "server-only";
import Stripe from "stripe";

/** What can be bought. Prices live in Stripe; their ids come from env (see scripts/stripe-setup.ts). */
export const PRODUCTS = {
  pro_monthly: { mode: "subscription", env: "STRIPE_PRICE_PRO_MONTHLY", label: "Pro, monthly" },
  pro_yearly: { mode: "subscription", env: "STRIPE_PRICE_PRO_YEARLY", label: "Pro, yearly" },
  pack: { mode: "payment", env: "STRIPE_PRICE_PACK", label: "5 job unlocks" },
} as const;
export type ProductId = keyof typeof PRODUCTS;
export const isProductId = (x: unknown): x is ProductId => typeof x === "string" && x in PRODUCTS;

export function priceFor(p: ProductId): string | undefined {
  return process.env[PRODUCTS[p].env] || undefined;
}

/**
 * Payments are on only when explicitly enabled and configured, so production
 * never shows a checkout that can't complete.
 */
export function billingEnabled(): boolean {
  return (
    process.env.BILLING_ENABLED === "1" &&
    Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) &&
    (Object.keys(PRODUCTS) as ProductId[]).every((p) => priceFor(p))
  );
}

let client: Stripe | null = null;
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  // fetch-based client: works the same in Node and on Cloudflare Workers
  client ??= new Stripe(key, { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 });
  return client;
}

/** Verifies a webhook signature with Web Crypto (Workers have no Node crypto HMAC streaming). */
export async function verifyWebhook(payload: string, signature: string): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return Stripe.webhooks.constructEventAsync(payload, signature, secret, undefined, Stripe.createSubtleCryptoProvider());
}
