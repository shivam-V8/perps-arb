import { NextResponse } from "next/server";
import { billingEnabled, getStripe } from "@/lib/billing/stripe";
import { siteOrigin } from "@/server/auth";
import { stripeCustomerFor } from "@/server/data";
import { currentViewer } from "@/server/session";

/** Stripe's hosted billing portal: cancel, switch monthly/yearly, card, invoices. */
export async function POST(req: Request) {
  const viewer = await currentViewer();
  if (!viewer?.role) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!billingEnabled()) return NextResponse.json({ error: "Billing isn't available right now." }, { status: 503 });
  const customer = await stripeCustomerFor(viewer.id);
  if (!customer) return NextResponse.json({ error: "No purchases on this account yet." }, { status: 404 });
  const session = await getStripe().billingPortal.sessions.create({ customer, return_url: `${siteOrigin(req)}/profile` });
  return NextResponse.json({ url: session.url });
}
