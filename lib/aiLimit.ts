import { prisma } from "@/lib/prisma";

/**
 * AI利用制限をチェックし、利用可能ならカウントを更新する
 * @param userId ユーザーID
 * @returns 利用可否と残り回数
 */
export async function canUseAI(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  error?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPro: true,
      aiDailyCount: true,
      aiLastUsedAt: true,
    },
  });

  if (!user) {
    return {
      allowed: false,
      remaining: 0,
      error: "ユーザー情報が取得できません。",
    };
  }

  const now = new Date();
  const lastUsed = user.aiLastUsedAt ? new Date(user.aiLastUsedAt) : null;
  const isTargetDay = lastUsed && isSameDay(now, lastUsed);

  // 日付が変わっていればカウントリセット扱い（0）とする
  const currentCount = isTargetDay ? user.aiDailyCount : 0;

  // Proユーザーは制限なし
  if (user.isPro) {
    // 常に許可。カウントは更新しておく
    await updateUsage(userId, currentCount + 1, now);
    return { allowed: true, remaining: 9999 }; // 十分大きな数
  }

  // 無料ユーザーの上限
  const MAX_DAILY = 2;

  if (currentCount >= MAX_DAILY) {
    return {
      allowed: false,
      remaining: 0,
      error:
        "1日のAI献立作成回数（2回）に達しました。Proプランへのアップグレードをご検討ください。",
    };
  }

  // 利用可能 -> カウントアップして保存
  await updateUsage(userId, currentCount + 1, now);

  return { allowed: true, remaining: MAX_DAILY - (currentCount + 1) };
}

async function updateUsage(userId: string, count: number, date: Date) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      aiDailyCount: count,
      aiLastUsedAt: date,
    },
  });
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
