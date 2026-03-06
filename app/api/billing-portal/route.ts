import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    if (!stripe) {
      console.error("[billing-portal] Stripe client is not initialized.");
      return NextResponse.json({ error: "決済機能が未設定です" }, { status: 500 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "請求情報が見つかりません。一度Proプランへの登録をお試しください。" },
        { status: 404 },
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getBaseUrl()}/settings/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("[billing-portal] ERROR:", err);

    if (err.raw?.code === "resource_missing" && err.raw?.param === "customer") {
      return NextResponse.json(
        { error: "Stripe側で顧客情報が見つかりませんでした。別の環境のデータが残っている可能性があります。" },
        { status: 400 }
      );
    }

    const message = err?.raw?.message ?? err?.message ?? "ポータルの起動に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
