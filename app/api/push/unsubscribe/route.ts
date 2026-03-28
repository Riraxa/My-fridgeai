// GENERATED_BY_AI: 2026-03-28 Web Push Unsubscribe API
// DELETE /api/push/unsubscribe - プッシュ通知購読を解除
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface UnsubscribeRequest {
  endpoint?: string;
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body: UnsubscribeRequest = await request.json().catch(() => ({}));
    const { endpoint } = body;

    if (endpoint) {
      // 特定のエンドポイントを無効化
      await prisma.pushSubscription.updateMany({
        where: {
          userId: session.user.id,
          endpoint,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    } else {
      // ユーザーの全購読を無効化
      await prisma.pushSubscription.updateMany({
        where: {
          userId: session.user.id,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push Unsubscribe API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
