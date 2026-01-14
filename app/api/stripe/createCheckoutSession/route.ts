// app/api/stripe/createCheckoutSession/route.ts
/**
 * Create Checkout Session (subscription)
 * - サーバーセッションからログイン確認を試みる（getServerSession）
 * - Prisma の user を見つけ、stripe customer を作成 or 再利用
 * - Checkout Session を subscription モードで作成、metadata に userId を埋める
 *
 * 環境変数:
 * - STRIPE_SECRET_KEY (sk_test_ / sk_live_)
 * - STRIPE_PRICE_ID (price_xxx) -- 環境に合わせた Price ID を使用
 * - NEXT_PUBLIC_BASE_URL (例: https://my-fridgeai.vercel.app)
 *
 * 注意:
 * - Checkout 完了後の処理は Webhook で行う (checkout.session.completed)
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // 必要に応じてパスを調整

const stripeKey = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

if (!stripeKey) console.error("STRIPE_SECRET_KEY not set");
if (!priceId) console.error("STRIPE_PRICE_ID not set");
if (!baseUrl) console.error("NEXT_PUBLIC_BASE_URL not set");

const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2025-12-15.clover" })
  : null;

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      console.error("Stripe client is not initialized.");
      return NextResponse.json(
        { error: "支払い機能が未設定です。" },
        { status: 500 },
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "価格IDが設定されていません。" },
        { status: 500 },
      );
    }

    // 1) サーバーセッションから userId を試行的に取得
    let userId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) userId = String(session.user.id);
    } catch (e) {
      // セッション取得に失敗しても、body の userId をフォールバックで許容する
      console.warn(
        "getServerSession failed or not available in this runtime:",
        e,
      );
    }

    const body = await req.json().catch(() => ({}));
    if (!userId && body.userId) userId = String(body.userId);

    if (!userId) {
      return NextResponse.json(
        { error: "ログインが必要です。" },
        { status: 401 },
      );
    }

    // 2) ユーザー確認
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません。" },
        { status: 404 },
      );
    }

    // Proステータスのガードを削除 - ユーザーが自由に更新・再購入できるようにする
    // Webhookで適切に処理されるため、ここでのブロックは不要

    // 3) Stripe Customer を確保（なければ作成して DB に保存）
    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
      } catch (dbErr) {
        console.warn("Failed to persist stripeCustomerId to DB:", dbErr);
      }
    }

    // 4) Checkout Session 作成
    //    - metadata と client_reference_id に userId を入れる（Webhook で参照するため）
    //    - customer をセット（既存 Customer を使う）
    // 4) Checkout Session 作成
    //    - metadata と client_reference_id に userId を入れる（Webhook で参照するため）
    //    - customer をセット（既存 Customer を使う）
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_types: ["card"],
      // ✅ 変更: Settingsページへ戻す
      success_url: `${baseUrl}/settings?pro=success`,
      cancel_url: `${baseUrl}/settings?pro=cancel`,
      metadata: {
        userId: user.id,
      },
      client_reference_id: user.id,
      // subscription_data を使って追加設定（必要ならここで trial_period_days 等を設定可能）
      // subscription_data: { metadata: { userId: user.id } },
    });

    if (!session.url) {
      // session.url が空の場合は session.id を返してフロント側で retrieve もできるようにする
      return NextResponse.json({ sessionId: session.id }, { status: 200 });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("Stripe createCheckoutSession error:", err);
    // Stripe API のエラー詳細はログに残して、ユーザー向けは汎用メッセージにする
    const message =
      err?.raw?.message ??
      err?.message ??
      "支払いセッションの作成に失敗しました。時間を置いて再試行してください。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
