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

    let userId: string | null = null;
    try {
      const session = await auth();
      if (session?.user?.id) userId = String(session.user.id);
    } catch (e: unknown) {
      console.error("[createCheckoutSession] auth error:", e instanceof Error ? e.message : e);
    }

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

    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーアカウントが見つかりません。" },
        { status: 404 },
      );
    }

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
    } catch (createErr: unknown) {
      const stripeErr = createErr as { raw?: { code?: string; param?: string } };
      if (stripeErr.raw?.code === "resource_missing" && stripeErr.raw?.param === "customer") {
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
  } catch (err: unknown) {
    console.error("[createCheckoutSession] ERROR:", err);
    const stripeErr = err as { raw?: { message?: string }; message?: string };
    const message = stripeErr?.raw?.message ?? stripeErr?.message ?? "予期せぬエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
