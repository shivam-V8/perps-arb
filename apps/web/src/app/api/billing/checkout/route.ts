import { NextResponse } from "next/server";
import { billingEnabled, getStripe, isProductId, PRODUCTS, priceFor } from "@/lib/billing/stripe";
import { sendSignInLink, siteOrigin } from "@/server/auth";
import { isPro, normEmail, setStripeCustomer, stripeCustomerFor, userIdByEmail, validEmail } from "@/server/data";
import { currentViewer } from "@/server/session";

const letters = () => Array.from({ length: 8 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

/**
 * Starts a Stripe Checkout for Pro (monthly/yearly) or a 5-unlock pack.
 * The email becomes the account: if it already belongs to another identity,
 * we email a sign-in link instead of charging twice.
 */
export async function POST(req: Request) {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!billingEnabled()) return NextResponse.json({ error: "Payments aren't open yet. Check back soon." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { product?: unknown; email?: unknown } | null;
  if (!isProductId(body?.product)) return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  const product = body.product;
  const email = typeof body.email === "string" ? normEmail(body.email) : "";
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const origin = siteOrigin(req);
  const owner = await userIdByEmail(email);
  if (owner && owner !== viewer.id) {
    await sendSignInLink(email, origin, "You already have a ChainMatch account with this email. Sign in to pick up where you left off.");
    return NextResponse.json({ signIn: true });
  }
  if (PRODUCTS[product].mode === "subscription" && (await isPro(viewer.id))) {
    return NextResponse.json({ error: "You're already on Pro." }, { status: 409 });
  }

  const stripe = getStripe();
  // one Stripe Customer per user, reused for every purchase
  let customer = await stripeCustomerFor(viewer.id);
  if (!customer) {
    const c = await stripe.customers.create({ email, metadata: { user_id: viewer.id } });
    await setStripeCustomer(viewer.id, c.id);
    customer = (await stripeCustomerFor(viewer.id)) ?? c.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: PRODUCTS[product].mode,
    customer,
    client_reference_id: viewer.id,
    line_items: [{ price: priceFor(product)!, quantity: 1 }],
    metadata: { product },
    allow_promotion_codes: true,
    customer_update: { name: "auto", address: "auto" },
    success_url: `${origin}/jobs?paid=${product}`,
    cancel_url: `${origin}/jobs?checkout=cancelled`,
    integration_identifier: `chainmatch_${product}_${letters()}`,
  });
  if (!session.url) return NextResponse.json({ error: "Couldn't start checkout." }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
