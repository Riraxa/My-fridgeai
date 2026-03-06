import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripeCustomerId: true,
      },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "請求情報が見つかりません" },
        { status: 404 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/settings/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("Billing portal error:", err);
    }
    return NextResponse.json(
      { error: "Portalの起動に失敗しました" },
      { status: 500 },
    );
  }
}
