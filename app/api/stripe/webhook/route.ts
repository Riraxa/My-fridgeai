// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.error("[Webhook] Stripe or Webhook Secret is not configured.");
    return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!sig) throw new Error("Missing stripe-signature");
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Webhook signature verification failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    console.log(`[Stripe Webhook] Event Type: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ?? session.client_reference_id;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (!userId || !subscriptionId) {
          console.warn("[Webhook] Missing userId or subscriptionId in session");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(String(subscriptionId));
        const priceId = subscription.items.data[0]?.price.id;
        const subWithPeriod = subscription as Stripe.Subscription & { current_period_end?: number };
        const currentPeriodEnd = new Date((subWithPeriod.current_period_end ?? 0) * 1000);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: String(userId) },
            data: {
              plan: "PRO",
              stripeCustomerId: String(customerId),
              stripeSubscriptionId: String(subscriptionId),
              stripePriceId: priceId,
              stripeCurrentPeriodEnd: currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              billingStatus: "active",
            },
          });

        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const isDeleted = event.type === "customer.subscription.deleted" || subscription.status === "canceled";

        await prisma.$transaction(async (tx) => {
          const users = await tx.user.findMany({
            where: { stripeSubscriptionId: subscription.id },
            select: { id: true },
          });

          for (const user of users) {
            await tx.user.update({
              where: { id: user.id },
              data: {
                plan: isDeleted ? "FREE" : "PRO",
                stripeSubscriptionId: isDeleted ? null : subscription.id,
                stripeCurrentPeriodEnd: new Date(((subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end ?? 0) * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                billingStatus: subscription.status,
              },
            });
          }
        });
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Webhook Error: ${msg}`);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
