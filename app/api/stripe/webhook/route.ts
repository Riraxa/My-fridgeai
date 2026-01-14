// app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecret) console.error("STRIPE_SECRET_KEY not set");
if (!webhookSecret) console.error("STRIPE_WEBHOOK_SECRET not set");

const stripe = new Stripe(stripeSecret, { apiVersion: "2025-12-15.clover" });

// イベント処理の重複を防ぐための簡易的なメモリストア（本番環境ではRedis等を使用）
const processedEvents = new Set<string>();

// ログ出力用のヘルパー関数
function logWebhook(
  eventType: string,
  eventId: string,
  message: string,
  data?: any,
) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [Stripe Webhook] ${eventType} (${eventId}): ${message}`;
  console.log(logMessage);
  if (data) {
    console.log("  Data:", JSON.stringify(data, null, 2));
  }
}

// ユーザー情報をログ出力
function logUserUpdate(userId: string, updates: any) {
  console.log(`  User ${userId} updated:`, JSON.stringify(updates, null, 2));
}

export async function POST(req: Request) {
  // 署名検証のため raw body を取得
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
    console.error("❌ Webhook署名が無効です:", err?.message ?? err);
    return new Response(JSON.stringify({ error: "Webhook署名が無効です" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Idempotency check - 重複イベント処理の防止
  if (processedEvents.has(stripeEvent.id)) {
    logWebhook(stripeEvent.type, stripeEvent.id, "イベントは既に処理済みです");
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  processedEvents.add(stripeEvent.id);

  // 30分後にメモリから削除（簡易的なクリーンアップ）
  setTimeout(
    () => {
      processedEvents.delete(stripeEvent.id);
    },
    30 * 60 * 1000,
  );

  logWebhook(stripeEvent.type, stripeEvent.id, "受信イベント");

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const metadataUserId =
          (session as any).metadata?.userId ?? session.client_reference_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer as any)?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as any)?.id;

        if (!metadataUserId) {
          logWebhook(
            stripeEvent.type,
            stripeEvent.id,
            "metadata.userIdがありません",
          );
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const userId = String(metadataUserId);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          logWebhook(
            stripeEvent.type,
            stripeEvent.id,
            `⚠️ 警告: userId ${userId} のユーザーが見つかりません`,
          );
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

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
        const status =
          (stripeSub as any)?.status ??
          ((session as any)?.payment_status ? "paid" : undefined);

        // トランザクションで安全に更新
        await prisma.$transaction(async (tx) => {
          // stripeCustomerIdを更新
          if (customerId) {
            await tx.user.update({
              where: { id: userId },
              data: { stripeCustomerId: customerId },
            });
          }

          if (subscriptionId) {
            // Subscription を upsert
            await tx.subscription.upsert({
              where: { stripeSubscriptionId: String(subscriptionId) },
              create: {
                userId: userId,
                stripeCustomerId: customerId ?? "",
                stripeSubscriptionId: String(subscriptionId),
                stripePriceId: priceId ?? "",
                status: status ?? "active",
                currentPeriodEnd: currentPeriodEnd ?? new Date(),
                cancelAtPeriodEnd: false,
              },
              update: {
                stripeCustomerId: customerId ?? undefined,
                stripePriceId: priceId ?? undefined,
                status: status ?? undefined,
                currentPeriodEnd: currentPeriodEnd ?? undefined,
                cancelAtPeriodEnd: false,
                updatedAt: new Date(),
              },
            });

            // 初回課金成功時のみ isPro=true に設定
            const shouldBePro =
              status === "active" ||
              status === "trialing" ||
              (status === "paid" && !priceId); // one-time payment heuristic

            if (shouldBePro) {
              await tx.user.update({
                where: { id: userId },
                data: {
                  isPro: true,
                  stripeSubscriptionId: String(subscriptionId),
                  stripePriceId: priceId ?? undefined,
                  stripeCurrentPeriodEnd: currentPeriodEnd ?? undefined,
                },
              });

              logUserUpdate(userId, {
                isPro: true,
                stripeCustomerId: customerId,
                stripeSubscriptionId: String(subscriptionId),
                stripePriceId: priceId,
                stripeCurrentPeriodEnd: currentPeriodEnd,
              });
            }
          } else {
            // 一回限りの支払いの場合
            const paymentStatus = (session as any)?.payment_status;
            const shouldBePro = paymentStatus === "paid";
            if (shouldBePro) {
              await tx.user.update({
                where: { id: userId },
                data: {
                  isPro: true,
                  stripeSubscriptionId: null,
                  stripePriceId: priceId ?? undefined,
                  stripeCurrentPeriodEnd: currentPeriodEnd ?? undefined,
                },
              });

              logUserUpdate(userId, {
                isPro: true,
                paymentStatus,
                stripePriceId: priceId,
                stripeCurrentPeriodEnd: currentPeriodEnd,
              });
            }
          }
        });

        logWebhook(
          stripeEvent.type,
          stripeEvent.id,
          "✅ UserをProに設定しました",
          { userId, subscriptionId, status },
        );
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
          ? new Date((sub as any)?.current_period_end * 1000)
          : undefined;
        const status = (sub as any)?.status ?? "active";
        const cancelAtPeriodEnd = !!(sub as any)?.cancel_at_period_end;

        logWebhook(
          stripeEvent.type,
          stripeEvent.id,
          "サブスクリプション更新処理",
          {
            stripeSubscriptionId,
            status,
            cancelAtPeriodEnd,
          },
        );

        try {
          await prisma.$transaction(async (tx) => {
            const existing = await tx.subscription.findUnique({
              where: { stripeSubscriptionId },
            });

            if (existing) {
              // 既存のサブスクリプションを更新
              await tx.subscription.update({
                where: { stripeSubscriptionId },
                data: {
                  status,
                  stripePriceId: priceId ?? existing.stripePriceId,
                  currentPeriodEnd:
                    currentPeriodEnd ?? existing.currentPeriodEnd,
                  cancelAtPeriodEnd,
                  updatedAt: new Date(),
                },
              });

              // 重要: status が active または trialing の場合のみ isPro=true を維持
              // その他のステータス（past_due, canceled, unpaid 等）では isPro を変更しない
              if (status === "active" || status === "trialing") {
                await tx.user.updateMany({
                  where: {
                    stripeCustomerId:
                      stripeCustomerId ?? existing.stripeCustomerId,
                  },
                  data: {
                    isPro: true,
                    stripeSubscriptionId,
                    stripePriceId: priceId ?? undefined,
                    stripeCurrentPeriodEnd: currentPeriodEnd ?? undefined,
                  },
                });

                logWebhook(
                  stripeEvent.type,
                  stripeEvent.id,
                  "✅ サブスクリプションを更新し、Proステータスを維持",
                  {
                    status,
                    isPro: true,
                  },
                );
              } else {
                // active/trialing 以外のステータスでは isPro を変更しない（重要な修正）
                logWebhook(
                  stripeEvent.type,
                  stripeEvent.id,
                  `⚠️ ステータスが ${status} のため、Proステータスを変更しません`,
                  {
                    status,
                    note: "明示的な解約イベントでのみ isPro=false に設定",
                  },
                );
              }
            } else {
              // 新規サブスクリプションの場合
              if (stripeCustomerId) {
                const user = await tx.user.findFirst({
                  where: { stripeCustomerId },
                });
                if (user) {
                  await tx.subscription.create({
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

                  // 新規作成時も active/trialing の場合のみ Pro に設定
                  if (status === "active" || status === "trialing") {
                    await tx.user.update({
                      where: { id: user.id },
                      data: {
                        isPro: true,
                        stripeSubscriptionId,
                        stripePriceId: priceId ?? undefined,
                        stripeCurrentPeriodEnd: currentPeriodEnd ?? undefined,
                      },
                    });

                    logUserUpdate(user.id, {
                      isPro: true,
                      stripeSubscriptionId,
                      status,
                    });
                  }
                } else {
                  logWebhook(
                    stripeEvent.type,
                    stripeEvent.id,
                    `⚠️ 警告: stripeCustomerId ${stripeCustomerId} のユーザーが見つかりません`,
                  );
                }
              }
            }
          });
        } catch (err: any) {
          console.error(
            "Error handling subscription.created/updated webhook:",
            err,
          );
          return new Response(
            JSON.stringify({ error: "DB更新に失敗しました" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        break;
      }

      /**
       * customer.subscription.deleted
       * - 明示的な解約イベントのみ isPro を false にする（ここは従来どおり）
       */
      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object as unknown as Stripe.Subscription;
        const stripeSubscriptionId = sub.id;
        const cust = sub.customer;
        const stripeCustomerId =
          typeof cust === "string" ? cust : (cust as any)?.id;

        logWebhook(stripeEvent.type, stripeEvent.id, "解約処理", {
          stripeSubscriptionId,
          stripeCustomerId,
        });

        try {
          await prisma.$transaction(async (tx) => {
            const existing = await tx.subscription.findUnique({
              where: { stripeSubscriptionId },
            });

            if (existing) {
              // サブスクリプションレコードを更新
              await tx.subscription.update({
                where: { stripeSubscriptionId },
                data: {
                  status: (sub as any)?.status ?? "canceled",
                  updatedAt: new Date(),
                  cancelAtPeriodEnd: !!(sub as any)?.cancel_at_period_end,
                },
              });

              // 関連ユーザーのProステータスを解除
              const updatedUsers = await tx.user.updateMany({
                where: { stripeSubscriptionId },
                data: {
                  isPro: false,
                  stripeSubscriptionId: null,
                  stripePriceId: null,
                  stripeCurrentPeriodEnd: null,
                },
              });

              logWebhook(
                stripeEvent.type,
                stripeEvent.id,
                `❌ ${updatedUsers.count}人のユーザーを解約しました`,
              );
            } else {
              // サブスクリプションレコードがない場合はユーザー directly 検索
              if (stripeCustomerId) {
                const user = await tx.user.findFirst({
                  where: { stripeCustomerId },
                });
                if (user) {
                  await tx.user.update({
                    where: { id: user.id },
                    data: {
                      isPro: false,
                      stripeSubscriptionId: null,
                      stripePriceId: null,
                      stripeCurrentPeriodEnd: null,
                    },
                  });

                  logUserUpdate(user.id, {
                    isPro: false,
                    stripeSubscriptionId: null,
                    stripePriceId: null,
                    stripeCurrentPeriodEnd: null,
                  });
                } else {
                  logWebhook(
                    stripeEvent.type,
                    stripeEvent.id,
                    `⚠️ 警告: stripeCustomerId ${stripeCustomerId} のユーザーが見つかりません`,
                  );
                }
              }
            }
          });
        } catch (err: any) {
          console.error("Error handling subscription.deleted webhook:", err);
          return new Response(
            JSON.stringify({ error: "DB更新に失敗しました" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(
      JSON.stringify({ error: "Webhook処理中にエラーが発生しました" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
