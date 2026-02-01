// app/api/billing-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const getPlanByStatus = (status: Stripe.Subscription.Status) => {
  switch (status) {
    case "canceled":
    case "incomplete_expired":
      return "FREE" as const;
    default:
      return "PRO" as const;
  }
};

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
  if (!token?.sub) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const userId = token.sub;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user || (!user.stripeCustomerId && !user.stripeSubscriptionId)) {
      return NextResponse.json(
        { error: "定期購読情報が見つかりません" },
        { status: 404 },
      );
    }

    let subscription: Stripe.Subscription | null = null;
    if (user.stripeSubscriptionId) {
      subscription = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId,
      );
    } else if (user.stripeCustomerId) {
      const list = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "all",
        limit: 1,
      });
      subscription = list.data[0] ?? null;
    }

    if (!subscription) {
      if (user.stripeSubscriptionId) {
        await prisma.subscription.deleteMany({
          where: { stripeSubscriptionId: user.stripeSubscriptionId },
        });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: "FREE",
          cancelAtPeriodEnd: false,
          stripeCurrentPeriodEnd: null,
          billingStatus: "canceled",
          stripeSubscriptionId: null,
          stripePriceId: null,
        },
      });
      return NextResponse.json({ status: "no_subscription" });
    }

    const cancelAt = (subscription as any).cancel_at ?? null;
    const rawPeriodEnd = cancelAt ?? (subscription as any).current_period_end;
    let currentPeriodEnd: Date | null =
      typeof rawPeriodEnd === "number" ? new Date(rawPeriodEnd * 1000) : null;

    if (currentPeriodEnd && isNaN(currentPeriodEnd.getTime())) {
      currentPeriodEnd = null;
    }

    const cancelAtPeriodEnd =
      ((subscription as any).cancel_at_period_end ?? false) || !!cancelAt;
    const billingStatus = subscription.status;
    const plan = getPlanByStatus(subscription.status);
    const stripeCustomerId = String((subscription as any).customer);
    const stripePriceId =
      (subscription as any)?.items?.data?.[0]?.price?.id ?? null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        cancelAtPeriodEnd,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        billingStatus,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId,
        stripePriceId,
      },
    });

    if (stripeCustomerId && stripePriceId) {
      await prisma.subscription.upsert({
        where: { stripeSubscriptionId: subscription.id },
        update: {
          status: subscription.status,
          currentPeriodEnd: currentPeriodEnd ?? new Date(), // Fallback if null, to avoid DB error if required
          cancelAtPeriodEnd: cancelAtPeriodEnd,
          stripeCustomerId: stripeCustomerId,
          stripePriceId: stripePriceId,
        },
        create: {
          userId: user.id,
          stripeCustomerId: stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: stripePriceId,
          status: subscription.status,
          currentPeriodEnd: currentPeriodEnd ?? new Date(), // Fallback
          cancelAtPeriodEnd: cancelAtPeriodEnd,
        },
      });
    }

    return NextResponse.json({
      status: "ok",
      stripe: {
        subscriptionId: subscription.id,
        status: subscription.status,
        cancel_at_period_end:
          (subscription as any).cancel_at_period_end ?? null,
        cancel_at: (subscription as any).cancel_at ?? null,
        current_period_end: (subscription as any).current_period_end ?? null,
      },
      computed: {
        cancelAtPeriodEnd,
        stripeCurrentPeriodEnd: currentPeriodEnd?.toISOString() ?? null,
      },
    });
  } catch (err: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("Billing sync error:", err);
    }
    return NextResponse.json({ error: "同期に失敗しました" }, { status: 500 });
  }
}
