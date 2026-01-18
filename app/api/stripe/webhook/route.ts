// app/api/stripe/webhook/route.ts
/*
 * Stripe Webhook Handler (Fixed & Path Restored)
 * 解決した問題:
 * 1. パス不整合: ユーザーの要望により /api/stripe/webhook を使用
 * 2. 署名検証失敗: raw body の取得方法を修正
 * 3. 404/不整合: Node.js ランタイムを指定
 * 4. APIバージョン: 2025-12-15.clover に固定
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      throw new Error("Missing stripe-signature or webhook secret");
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    console.log(`[Stripe Webhook] Event Type: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (!userId) {
          console.warn("[Webhook] No userId found in session metadata");
          break;
        }

        const subscription = (await stripe.subscriptions.retrieve(
          String(subscriptionId),
        )) as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const currentPeriodEnd = new Date(
          ((subscription as any).current_period_end || 0) * 1000,
        );
        const cancelAtPeriodEnd =
          (subscription as any).cancel_at_period_end || false;

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: String(userId) },
            data: {
              plan: "PRO",
              stripeCustomerId: String(customerId),
              stripeSubscriptionId: String(subscriptionId),
              stripePriceId: priceId,
              stripeCurrentPeriodEnd: currentPeriodEnd,
              cancelAtPeriodEnd: cancelAtPeriodEnd,
              billingStatus: "active",
            },
          });

          if (priceId) {
            await tx.subscription.upsert({
              where: { stripeSubscriptionId: String(subscriptionId) },
              update: {
                status: subscription.status,
                currentPeriodEnd: currentPeriodEnd,
                cancelAtPeriodEnd: cancelAtPeriodEnd,
                stripeCustomerId: String(customerId),
                stripePriceId: priceId,
              },
              create: {
                userId: String(userId),
                stripeCustomerId: String(customerId),
                stripeSubscriptionId: String(subscriptionId),
                stripePriceId: priceId,
                status: subscription.status,
                currentPeriodEnd: currentPeriodEnd,
                cancelAtPeriodEnd: cancelAtPeriodEnd,
              },
            });
          }

          await tx.billingEvent.create({
            data: {
              userId: String(userId),
              eventType: "SUBSCRIPTION_CREATED",
              payload: session as any,
            },
          });
        });

        console.log(`[Webhook] PRO update success for user: ${userId}`);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;

        const isDeleted =
          event.type === "customer.subscription.deleted" ||
          subscription.status === "canceled" ||
          subscription.status === "unpaid" ||
          subscription.status === "incomplete_expired";

        if (isDeleted) {
          await prisma.$transaction(async (tx) => {
            const currentPeriodEnd = new Date(
              ((subscription as any).current_period_end || 0) * 1000,
            );
            const stripeCustomerId = String((subscription as any).customer);
            const priceId = (subscription as any)?.items?.data?.[0]?.price?.id;

            const users = await tx.user.findMany({
              where: { stripeSubscriptionId },
              select: { id: true },
            });

            for (const user of users) {
              // 1. ユーザーを FREE プランに更新
              await tx.user.update({
                where: { id: user.id },
                data: {
                  plan: "FREE",
                  stripeSubscriptionId: null,
                  stripePriceId: null,
                  stripeCurrentPeriodEnd: null,
                  billingStatus: "canceled",
                },
              });

              if (stripeCustomerId && priceId) {
                await tx.subscription.upsert({
                  where: { stripeSubscriptionId },
                  update: {
                    status: subscription.status,
                    currentPeriodEnd,
                    cancelAtPeriodEnd: false,
                    stripeCustomerId,
                    stripePriceId: priceId,
                  },
                  create: {
                    userId: user.id,
                    stripeCustomerId,
                    stripeSubscriptionId,
                    stripePriceId: priceId,
                    status: subscription.status,
                    currentPeriodEnd,
                    cancelAtPeriodEnd: false,
                  },
                });
              }

              // 2. Household (家族共有) を即時無効化
              // 自分がオーナーのグループを削除（または全メンバー脱退）
              await tx.household.deleteMany({
                where: { ownerId: user.id },
              });

              // 3. ログ記録
              await tx.billingEvent.create({
                data: {
                  userId: user.id,
                  eventType: "SUBSCRIPTION_CANCELLED",
                  payload: subscription as any,
                },
              });
            }
          });
          console.log(
            `[Webhook] Plan reset to FREE and Household invalidated for subscription: ${stripeSubscriptionId}`,
          );
        } else {
          // updated の場合: current_period_end などを同期
          const cancelAt = (subscription as any).cancel_at ?? null;
          const currentPeriodEndUnix = ((subscription as any)
            .current_period_end ?? 0) as number;
          const currentPeriodEnd = new Date(currentPeriodEndUnix * 1000);
          const cancelAtPeriodEnd =
            ((subscription as any).cancel_at_period_end ?? false) || !!cancelAt;
          const stripeCustomerId = String((subscription as any).customer);
          const priceId = (subscription as any)?.items?.data?.[0]?.price?.id;

          await prisma.user.updateMany({
            where: { stripeSubscriptionId },
            data: {
              stripeCurrentPeriodEnd: currentPeriodEnd,
              cancelAtPeriodEnd: cancelAtPeriodEnd,
              billingStatus: subscription.status,
            },
          });

          if (stripeCustomerId && priceId) {
            const users = await prisma.user.findMany({
              where: { stripeSubscriptionId },
              select: { id: true },
            });

            for (const user of users) {
              await prisma.subscription.upsert({
                where: { stripeSubscriptionId },
                update: {
                  status: subscription.status,
                  currentPeriodEnd,
                  cancelAtPeriodEnd,
                  stripeCustomerId,
                  stripePriceId: priceId,
                },
                create: {
                  userId: user.id,
                  stripeCustomerId,
                  stripeSubscriptionId,
                  stripePriceId: priceId,
                  status: subscription.status,
                  currentPeriodEnd,
                  cancelAtPeriodEnd,
                },
              });
            }
          }
          console.log(
            `[Webhook] Subscription updated: ${stripeSubscriptionId}`,
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = String(invoice.customer);

        await prisma.user.updateMany({
          where: { stripeCustomerId },
          data: { billingStatus: "past_due" },
        });

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId },
        });
        if (user) {
          await prisma.billingEvent.create({
            data: {
              userId: user.id,
              eventType: "PAYMENT_FAILED",
              payload: invoice as any,
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (dbErr: any) {
    console.error(`Webhook DB Error: ${dbErr.message}`);
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}
