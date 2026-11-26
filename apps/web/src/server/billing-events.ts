import "server-only";
import type Stripe from "stripe";
import * as data from "@/server/data";

/**
 * Applies one verified Stripe webhook event to our database.
 * Events are matched to users through Stripe's own objects: the Checkout
 * Session's client_reference_id (set by us at checkout), then the Customer id
 * we stored for that user. `getSubscription` is injected so tests need no network.
 */
export interface BillingDeps {
  getSubscription(id: string): Promise<Stripe.Subscription>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idOf = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : (x?.id ?? null));

/** Subscription state as we store it. In this API version the period end lives on the items. */
export function subscriptionState(sub: Stripe.Subscription, userId: string): data.SubscriptionState {
  const ends = sub.items.data.map((i) => i.current_period_end).filter((n): n is number => typeof n === "number");
  return {
    userId,
    stripeCustomerId: idOf(sub.customer)!,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    priceId: sub.items.data[0]?.price?.id ?? "",
    currentPeriodEnd: ends.length ? new Date(Math.max(...ends) * 1000) : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  };
}

async function syncSubscription(sub: Stripe.Subscription, hintUserId?: string | null) {
  const customerId = idOf(sub.customer);
  const userId = (hintUserId && UUID.test(hintUserId) ? hintUserId : null) ?? (customerId ? await data.userByStripeCustomer(customerId) : null);
  if (!userId) {
    console.warn("[billing] subscription for an unknown customer", sub.id);
    return;
  }
  await data.upsertSubscription(subscriptionState(sub, userId));
}

async function fulfilCheckout(session: Stripe.Checkout.Session, deps: BillingDeps) {
  // delayed payment methods complete the session before the money arrives
  if (session.payment_status === "unpaid") return;
  const uid = session.client_reference_id;
  if (!uid || !UUID.test(uid)) {
    console.warn("[billing] checkout session without a user", session.id);
    return;
  }
  const customerId = idOf(session.customer);
  if (customerId) await data.setStripeCustomer(uid, customerId);
  const email = session.customer_details?.email ?? session.customer_email;
  if (email) await data.attachEmail(uid, email, false);

  if (session.mode === "subscription") {
    const subId = idOf(session.subscription);
    if (subId) await syncSubscription(await deps.getSubscription(subId), uid);
  } else if (session.mode === "payment" && session.metadata?.product === "pack") {
    const pi = idOf(session.payment_intent);
    if (pi) await data.grantPack(uid, pi, data.PACK_CREDITS);
  }
}

export async function handleStripeEvent(event: Stripe.Event, deps: BillingDeps): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfilCheckout(event.data.object, deps);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;

    // renewals and failed renewals: re-read the subscription for its new status/period
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subId = idOf(event.data.object.parent?.subscription_details?.subscription);
      if (subId) await syncSubscription(await deps.getSubscription(subId));
      break;
    }

    // money taken back: a pack's credits go with it (subscriptions end through their own events)
    case "charge.refunded":
    case "charge.dispute.created": {
      const pi = idOf(event.data.object.payment_intent);
      if (pi && (await data.reversePack(pi))) console.warn("[billing] pack reversed", event.type, pi);
      break;
    }

    default:
      break;
  }
}
