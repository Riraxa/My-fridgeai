// GENERATED_BY_AI: 2026-03-28 Web Push Subscribe API
// POST /api/push/subscribe - プッシュ通知購読を登録
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface SubscribeRequest {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body: SubscribeRequest = await request.json();
    const { subscription } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // 既存の購読を確認・更新
    await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isActive: true,
      },
      update: {
        userId: session.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push Subscribe API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
