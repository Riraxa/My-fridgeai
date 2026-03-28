import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      console.error("[createCheckoutSession] Stripe client is not initialized.");
      return NextResponse.json(
        { error: "支払い機能が未設定です。サポートに連絡してください。" },
        { status: 500 },
      );
    }

    if (!STRIPE_PRICE_ID) {
      console.error("[createCheckoutSession] STRIPE_PRICE_ID is null");
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
      console.error("[createCheckoutSession] auth error:", e.message);
    }

    // デバッグ用のフォールバック（本番では基本的になし）
    const body = await req.json().catch(() => ({}));
    if (!userId && body.userId && process.env.NODE_ENV === "development") {
      userId = String(body.userId);
    }

    if (!userId) {
      return NextResponse.json(
        { error: "ログインが必要です。再度ログインしてお試しください。" },
        { status: 401 },
      );
    }

    // 2) ユーザー確認
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーアカウントが見つかりません。" },
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
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // 4) Checkout Session 作成
    let session: Stripe.Checkout.Session;
    const baseUrl = getBaseUrl();

    try {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
        payment_method_types: ["card"],
        success_url: `${baseUrl}/settings?pro=success`,
        cancel_url: `${baseUrl}/settings?pro=cancel`,
        metadata: { userId: user.id },
        client_reference_id: user.id,
      });
    } catch (createErr: any) {
      // "No such customer" エラー (別の環境のIDがDBに残っている場合)
      if (createErr.raw?.code === "resource_missing" && createErr.raw?.param === "customer") {
        console.warn("[createCheckoutSession] Invalid customer detected. Resetting...");

        const newCustomer = await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { userId: user.id },
        });
        customerId = newCustomer.id;

        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });

        session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: customerId,
          line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
          payment_method_types: ["card"],
          success_url: `${baseUrl}/settings?pro=success`,
          cancel_url: `${baseUrl}/settings?pro=cancel`,
          metadata: { userId: user.id },
          client_reference_id: user.id,
        });
      } else {
        throw createErr;
      }
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("[createCheckoutSession] ERROR:", err);
    const message = err?.raw?.message ?? err?.message ?? "予期せぬエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
