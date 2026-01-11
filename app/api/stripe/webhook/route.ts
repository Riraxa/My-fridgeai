// app/api/stripe/webhook/route.ts
/**
 * Stripe Webhook handler (Next.js App Router - Node runtime)
 *
 * - 確実に署名検証を行います (STRIPE_WEBHOOK_SECRET 必須)
 * - checkout.session.completed / customer.subscription.created/updated/deleted を処理
 * - Prisma に Subscription を upsert し、User.isPro を管理します
 *
 * 注意:
 * - このファイルは Node runtime 向けです（Edge runtime 向けではありません）
 * - 環境変数: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET を設定してください
 */

import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecret) console.error("STRIPE_SECRET_KEY not set");
if (!webhookSecret) console.error("STRIPE_WEBHOOK_SECRET not set");

const stripe = new Stripe(stripeSecret, { apiVersion: "2025-12-15.clover" });

export async function POST(req: Request) {
  // 署名検証のため raw body を取得する
  const sig = req.headers.get("stripe-signature") ?? "";

  let payloadBuffer: Buffer;
  try {
    const ab = await req.arrayBuffer();
    payloadBuffer = Buffer.from(ab);
  } catch (err: any) {
    console.error("Failed to read request body:", err);
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 署名検証
  let stripeEvent: Stripe.Event;
  try {
    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    stripeEvent = stripe.webhooks.constructEvent(
      payloadBuffer,
      sig,
      webhookSecret,
    );
  } catch (err: any) {
    console.error(
      "Webhook signature verification failed:",
      err?.message ?? err,
    );
    return new Response(JSON.stringify({ error: "Webhook Error" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // イベント処理
  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const metadataUserId =
          session.metadata?.userId ?? session.client_reference_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer as any)?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as any)?.id;

        if (!metadataUserId) {
          console.error(
            "Webhook: checkout.session.completed without metadata.userId",
          );
          // メッセージはログに残して成功扱いで終える（再送防止）
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const userId = String(metadataUserId);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          console.error("Webhook: user not found for metadata.userId:", userId);
          // userが見つからない場合も 200 を返す（Stripe は再送してくる）
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // subscriptionId があれば詳細を取得して DB に反映
        let stripeSub: Stripe.Subscription | null = null;
        if (subscriptionId) {
          try {
            const maybeSub =
              await stripe.subscriptions.retrieve(subscriptionId);
            stripeSub = maybeSub as unknown as Stripe.Subscription;
          } catch (err: any) {
            console.warn(
              "Failed to retrieve subscription from Stripe:",
              err?.message ?? err,
            );
            // 取得失敗でも処理は継続（後続の情報は無いかもしれない）
          }
        }

        const itemsData = (stripeSub as any)?.items?.data;
        const priceId =
          Array.isArray(itemsData) && itemsData[0]?.price?.id
            ? itemsData[0].price.id
            : undefined;
        const currentPeriodEndUnix = (stripeSub as any)?.current_period_end;
        const currentPeriodEnd = currentPeriodEndUnix
          ? new Date(currentPeriodEndUnix * 1000)
          : undefined;
        const status = (stripeSub as any)?.status ?? "active";

        // user に stripeCustomerId を保存（存在すれば更新）
        if (customerId) {
          try {
            await prisma.user.update({
              where: { id: userId },
              data: { stripeCustomerId: customerId },
            });
          } catch (err: any) {
            console.error("Failed to update user stripeCustomerId:", err);
            // ログは出すが処理は継続（Webhook は再送される）
          }
        }

        if (subscriptionId) {
          try {
            // Subscription を upsert（存在すれば更新、なければ作成）
            await prisma.subscription.upsert({
              where: { stripeSubscriptionId: String(subscriptionId) },
              create: {
                userId: userId,
                stripeCustomerId: customerId ?? "",
                stripeSubscriptionId: String(subscriptionId),
                stripePriceId: priceId ?? "",
                status,
                currentPeriodEnd: currentPeriodEnd ?? new Date(),
                cancelAtPeriodEnd: false,
              },
              update: {
                stripeCustomerId: customerId ?? undefined,
                stripePriceId: priceId ?? undefined,
                status,
                currentPeriodEnd: currentPeriodEnd ?? undefined,
                cancelAtPeriodEnd: false,
                updatedAt: new Date(),
              },
            });

            // user を Pro 化（isPro フラグ等を更新）
            await prisma.user.update({
              where: { id: userId },
              data: {
                isPro: status === "active" || status === "trialing",
                stripeSubscriptionId: String(subscriptionId),
                stripePriceId: priceId ?? undefined,
                stripeCurrentPeriodEnd: currentPeriodEnd ?? undefined,
              },
            });

            console.log(
              `Processed checkout.session.completed for user=${userId}, subscription=${subscriptionId}, isPro=${status === "active" || status === "trialing"}`,
            );
          } catch (err: any) {
            console.error("Failed to upsert subscription or update user:", err);
            // エラーが起きても 200 を返して Stripe の再送に任せる（設計方針）
            return new Response(JSON.stringify({ received: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object as unknown as Stripe.Subscription;
        const stripeSubscriptionId = sub.id;
        const cust = sub.customer;
        const stripeCustomerId =
          typeof cust === "string" ? cust : (cust as any)?.id;

        const priceId = (sub as any)?.items?.data?.[0]?.price?.id ?? undefined;
        const currentPeriodEnd = (sub as any)?.current_period_end
          ? new Date((sub as any).current_period_end * 1000)
          : undefined;
        const status = (sub as any)?.status ?? "active";
        const cancelAtPeriodEnd = !!(sub as any)?.cancel_at_period_end;

        try {
          const existing = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId },
          });

          if (existing) {
            await prisma.subscription.update({
              where: { stripeSubscriptionId },
              data: {
                status,
                stripePriceId: priceId ?? existing.stripePriceId,
                currentPeriodEnd: currentPeriodEnd ?? existing.currentPeriodEnd,
                cancelAtPeriodEnd,
                updatedAt: new Date(),
              },
            });

            await prisma.user.updateMany({
              where: {
                stripeCustomerId: stripeCustomerId ?? existing.stripeCustomerId,
              },
              data: {
                isPro: status === "active" || status === "trialing",
                stripeSubscriptionId,
                stripePriceId: priceId ?? undefined,
                stripeCurrentPeriodEnd: currentPeriodEnd ?? undefined,
              },
            });
          } else {
            if (stripeCustomerId) {
              const user = await prisma.user.findFirst({
                where: { stripeCustomerId },
              });
              if (user) {
                await prisma.subscription.create({
                  data: {
                    userId: user.id,
                    stripeCustomerId: stripeCustomerId,
                    stripeSubscriptionId,
                    stripePriceId: priceId ?? "",
                    status,
                    currentPeriodEnd: currentPeriodEnd ?? new Date(),
                    cancelAtPeriodEnd,
                  },
                });
                await prisma.user.update({
                  where: { id: user.id },
                  data: {
                    isPro: status === "active" || status === "trialing",
                    stripeSubscriptionId,
                    stripePriceId: priceId ?? undefined,
                    stripeCurrentPeriodEnd: currentPeriodEnd ?? undefined,
                  },
                });
              } else {
                console.warn(
                  "Subscription webhook: no user found for stripeCustomerId:",
                  stripeCustomerId,
                );
              }
            }
          }
        } catch (err: any) {
          console.error(
            "Error handling subscription.created/updated webhook:",
            err,
          );
          // 設計に従い 200 を返して再試行に任せる
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object as unknown as Stripe.Subscription;
        const stripeSubscriptionId = sub.id;
        const cust = sub.customer;
        const stripeCustomerId =
          typeof cust === "string" ? cust : (cust as any)?.id;

        try {
          const existing = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId },
          });

          if (existing) {
            await prisma.subscription.update({
              where: { stripeSubscriptionId },
              data: {
                status: (sub as any)?.status ?? "canceled",
                updatedAt: new Date(),
                cancelAtPeriodEnd: !!(sub as any)?.cancel_at_period_end,
              },
            });

            await prisma.user.updateMany({
              where: { stripeSubscriptionId },
              data: {
                isPro: false,
                stripeSubscriptionId: null,
                stripePriceId: null,
                stripeCurrentPeriodEnd: null,
              },
            });
          } else {
            if (stripeCustomerId) {
              const user = await prisma.user.findFirst({
                where: { stripeCustomerId },
              });
              if (user) {
                await prisma.user.update({
                  where: { id: user.id },
                  data: {
                    isPro: false,
                    stripeSubscriptionId: null,
                    stripePriceId: null,
                    stripeCurrentPeriodEnd: null,
                  },
                });
                console.log(
                  "Marked user as not pro for stripeCustomerId:",
                  stripeCustomerId,
                );
              }
            }
          }
        } catch (err: any) {
          console.error("Error handling subscription.deleted webhook:", err);
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        break;
      }

      default:
        // 未処理イベントは無視（200を返す）
        break;
    }

    // 正常終了
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    // 設計方針に従い、内部エラーが発生しても 200 を返す（Stripe の再送に任せる）
    return new Response(
      JSON.stringify({ received: true, warning: "Error inside handler" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
