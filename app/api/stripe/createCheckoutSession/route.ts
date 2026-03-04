import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";


if (!stripeKey) console.error("STRIPE_SECRET_KEY not set");
if (!priceId) console.error("STRIPE_PRICE_ID not set");

const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" as any })
  : null;

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      console.error(
        "[createCheckoutSession] Stripe client is not initialized.",
      );
      return NextResponse.json(
        { error: "支払い機能が未設定です。開発者に連絡してください。" },
        { status: 500 },
      );
    }

    if (!priceId) {
      console.error("[createCheckoutSession] PRICE_ID is null");
      return NextResponse.json(
        { error: "価格設定が見つかりません。" },
        { status: 500 },
      );
    }

    // 1) サーバーセッションから userId を取得
    let userId: string | null = null;
    try {
      const session = await auth();
      if (session?.user?.id) userId = String(session.user.id);
    } catch (e: any) {
      console.error(
        "[createCheckoutSession] auth error:",
        e.message,
      );
    }

    // セッションがない場合、body からの userId フォールバックはセキュリティ上避けるべきだが、
    // 開発中のデバッグ用に制限付きで残す
    const body = await req.json().catch(() => ({}));
    if (!userId && body.userId) {
      console.warn(
        "[createCheckoutSession] Falling back to body.userId (Use only for debug)",
      );
      userId = String(body.userId);
    }

    if (!userId) {
      console.error(
        "[createCheckoutSession] Authentication failed: userId is null",
      );
      return NextResponse.json(
        {
          error:
            "セッションがタイムアウトしました。一度ログアウトしてから再度ログインしてお試しください。",
        },
        { status: 401 },
      );
    }

    // 2) ユーザー確認
    let user = await prisma.user.findUnique({ where: { id: userId } });

    // IDで見つからない場合のフォールバック（メールアドレス検索）
    if (!user) {
      const session = await auth();
      if (session?.user?.email) {
        user = await prisma.user.findUnique({
          where: { email: session.user.email },
        });
      }
    }

    if (!user) {
      console.error(
        `[createCheckoutSession] User not found by ID(${userId}) or email`,
      );
      return NextResponse.json(
        {
          error:
            "ユーザーアカウントが見つかりません。一度ログアウトしてから再度ログインしてお試しください。",
        },
        { status: 404 },
      );
    }

    // 3) Stripe Customer を確保
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
        console.warn(
          "[createCheckoutSession] Failed to persist stripeCustomerId:",
          dbErr,
        );
      }
    }


    // 4) Checkout Session 作成（環境不整合によるエラーを考慮）
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        payment_method_types: ["card"],
        success_url: `${baseUrl}/settings?pro=success`,
        cancel_url: `${baseUrl}/settings?pro=cancel`,
        metadata: {
          userId: user.id,
        },
        client_reference_id: user.id,
      });
    } catch (createErr: any) {
      // "No such customer" エラー (別の環境のIDがDBに残っている場合)
      if (
        createErr.raw?.code === "resource_missing" &&
        createErr.raw?.param === "customer"
      ) {
        console.warn(
          "[createCheckoutSession] Invalid stripeCustomerId detected. Resetting...",
        );

        // 旧IDをDBから削除
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: null },
        });

        // 新しい顧客を作成
        const newCustomer = await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { userId: user.id },
        });
        customerId = newCustomer.id;

        // 新IDをDBに保存
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });

        // 再度試行
        session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          payment_method_types: ["card"],
          success_url: `${baseUrl}/settings?pro=success`,
          cancel_url: `${baseUrl}/settings?pro=cancel`,
          metadata: {
            userId: user.id,
          },
          client_reference_id: user.id,
        });
      } else {
        throw createErr; // それ以外のエラーは上に投げる
      }
    }

    if (!session.url) {
      console.error("[createCheckoutSession] No session URL generated");
      return NextResponse.json(
        { error: "チェックアウトURLの生成に失敗しました。" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("[createCheckoutSession] UNEXPECTED ERROR:", err);
    const message =
      err?.raw?.message ??
      err?.message ??
      "予期せぬエラーが発生しました。時間を置いて再試行してください。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
