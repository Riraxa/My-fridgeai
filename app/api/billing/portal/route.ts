// app/api/billing/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const userId = token.sub;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, stripeCustomerId: true },
    });

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { error: "定期購読情報が見つかりません。" },
        { status: 404 },
      );
    }

    let portalSession: Stripe.BillingPortal.Session;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/settings/account`,
      });
    } catch (portalErr: any) {
      if (
        portalErr.raw?.code === "resource_missing" &&
        portalErr.raw?.param === "customer"
      ) {
        console.warn("[portal] Invalid stripeCustomerId. Clearing from DB.");
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: null },
        });
        return NextResponse.json(
          { error: "定期購読情報が有効ではありません。再度お試しください。" },
          { status: 400 },
        );
      }
      throw portalErr;
    }

    return NextResponse.json({ url: portalSession.url });
  } catch (e: any) {
    console.error("Portal session error:", e);
    return NextResponse.json(
      { error: "管理画面の作成に失敗しました。" },
      { status: 500 },
    );
  }
}
