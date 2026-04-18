import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

const getPlanByStatus = (status: Stripe.Subscription.Status) => {
  switch (status) {
    case "active":
    case "trialing":
      return "PRO" as const;
    default:
      return "FREE" as const;
  }
};

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    if (!stripe) {
      console.error("[billing-sync] Stripe client is not initialized.");
      return NextResponse.json({ error: "決済機能が未設定です" }, { status: 500 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user || (!user.stripeCustomerId && !user.stripeSubscriptionId)) {
      return NextResponse.json({ error: "購読情報なし" }, { status: 404 });
    }

    let subscription: Stripe.Subscription | null = null;
    if (user.stripeSubscriptionId) {
      subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    } else if (user.stripeCustomerId) {
      const list = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "all",
        limit: 1,
      });
      subscription = list.data[0] ?? null;
    }

    if (!subscription) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: "FREE",
          billingStatus: "canceled",
          stripeSubscriptionId: null,
        },
      });
      return NextResponse.json({ status: "no_subscription" });
    }

    const subWithCancel = subscription as Stripe.Subscription & { cancel_at?: number; current_period_end?: number };
    const cancelAt = subWithCancel.cancel_at;
    const currentPeriodEnd = new Date((subWithCancel.current_period_end ?? 0) * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: getPlanByStatus(subscription.status),
        cancelAtPeriodEnd: (subscription as Stripe.Subscription & { cancel_at_period_end?: boolean }).cancel_at_period_end ?? !!cancelAt,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        billingStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: String(subscription.customer),
        stripePriceId: subscription.items?.data?.[0]?.price?.id ?? null,
      },
    });

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    console.error("[billing-sync] ERROR:", err);
    const stripeErr = err as { raw?: { code?: string } };
    if (stripeErr.raw?.code === "resource_missing") {
      return NextResponse.json({ error: "Stripe情報不整合" }, { status: 400 });
    }
    return NextResponse.json({ error: "同期失敗" }, { status: 500 });
  }
}
