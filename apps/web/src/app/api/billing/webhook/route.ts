import { NextResponse } from "next/server";
import { getStripe, verifyWebhook } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/server/billing-events";
import { claimStripeEvent, releaseStripeEvent } from "@/server/data";

/** Stripe webhook: signature-checked, applied once per event id. */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const payload = await req.text();

  let event;
  try {
    event = await verifyWebhook(payload, signature);
  } catch {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  if (!(await claimStripeEvent(event.id, event.type))) return NextResponse.json({ received: true, duplicate: true });
  try {
    const stripe = getStripe();
    await handleStripeEvent(event, { getSubscription: (id) => stripe.subscriptions.retrieve(id) });
  } catch (e) {
    console.error("[billing] webhook failed", event.type, event.id, e);
    await releaseStripeEvent(event.id); // let Stripe's retry apply it
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
