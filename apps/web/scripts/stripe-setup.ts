/**
 * Creates ChainMatch's products and prices in the Stripe account behind
 * STRIPE_SECRET_KEY (use a sandbox / test key first). Safe to re-run: prices are
 * found by lookup key and only created when missing.
 *   pnpm stripe:setup
 * Prints the env lines to copy into .env.development.local / `wrangler secret put`.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("Set STRIPE_SECRET_KEY (a test/sandbox key) first");
const stripe = new Stripe(key);
const live = key.startsWith("sk_live") || key.startsWith("rk_live");

const PRODUCTS = [
  {
    product: { name: "ChainMatch Pro", description: "Every match unlocked, daily searches, weekly job email with cover notes, résumé fixes." },
    prices: [
      { env: "STRIPE_PRICE_PRO_MONTHLY", lookup_key: "chainmatch_pro_monthly", unit_amount: 1099, recurring: { interval: "month" as const }, nickname: "Pro monthly" },
      { env: "STRIPE_PRICE_PRO_YEARLY", lookup_key: "chainmatch_pro_yearly", unit_amount: 7900, recurring: { interval: "year" as const }, nickname: "Pro yearly" },
    ],
  },
  {
    product: { name: "ChainMatch 5 job unlocks", description: "Unlock any 5 matched jobs. One-off, no expiry." },
    prices: [{ env: "STRIPE_PRICE_PACK", lookup_key: "chainmatch_pack_5", unit_amount: 499, recurring: undefined, nickname: "5 unlocks" }],
  },
];

async function main() {
  console.log(`Stripe ${live ? "LIVE" : "test"} mode\n`);
  const lines: string[] = [];
  for (const p of PRODUCTS) {
    const existing = await stripe.prices.list({ lookup_keys: p.prices.map((x) => x.lookup_key), expand: ["data.product"], limit: 10 });
    let productId = (existing.data[0]?.product as Stripe.Product | undefined)?.id;
    if (!productId) {
      productId = (await stripe.products.create(p.product)).id;
      console.log(`created product ${p.product.name}`);
    }
    for (const price of p.prices) {
      let found = existing.data.find((x) => x.lookup_key === price.lookup_key);
      if (!found) {
        found = await stripe.prices.create({
          product: productId,
          currency: "usd",
          unit_amount: price.unit_amount,
          lookup_key: price.lookup_key,
          nickname: price.nickname,
          ...(price.recurring ? { recurring: price.recurring } : {}),
        });
        console.log(`created price ${price.nickname}`);
      }
      lines.push(`${price.env}=${found.id}`);
    }
  }
  console.log(`\n${lines.join("\n")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
