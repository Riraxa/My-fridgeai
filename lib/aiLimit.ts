// lib/aiLimit.ts
import { prisma } from "./prisma";

export const AI_LIMIT_FREE = 1;
export const BARCODE_LIMIT_FREE = 5;
export const INGREDIENT_LIMIT_FREE = 100;

export type LimitType = "AI_MENU" | "BARCODE_SCAN" | "INGREDIENT_COUNT";

/**
 * ユーザーの各機能利用制限をチェックし、必要に応じてカウントを更新・リセットする
 */
export async function checkUserLimit(
  userId: string,
  type: LimitType,
): Promise<{ ok: boolean; remaining: number; resetAt?: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      plan: true,
      aiDailyCount: true,
      dailyBarcodeCount: true,
      dailyResetAt: true,
    },
  });

  if (!user) return { ok: false, remaining: 0 };

  // Proプランは常に制限なし（食材登録数、バーコード、AI）
  // 設計書: Proは AI無制限、食材無制限。
  if (user.plan === "PRO") {
    return { ok: true, remaining: 999 };
  }

  // --- オンデマンドリセット (FREEプラン用) ---
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // ローカル日付の開始（簡易版）

  let currentAiCount = user.aiDailyCount;
  let currentBarcodeCount = user.dailyBarcodeCount;

  if (!user.dailyResetAt || user.dailyResetAt < todayStart) {
    // リセットが必要
    currentAiCount = 0;
    currentBarcodeCount = 0;
    await prisma.user.update({
      where: { id: userId },
      data: {
        aiDailyCount: 0,
        dailyBarcodeCount: 0,
        dailyResetAt: now, // 本日のリセット完了
      },
    });
  }

  // --- 制限判定 ---
  if (type === "AI_MENU") {
    if (currentAiCount >= AI_LIMIT_FREE) {
      return { ok: false, remaining: 0, resetAt: todayStart };
    }
    // カウントをインクリメント
    await prisma.user.update({
      where: { id: userId },
      data: { aiDailyCount: { increment: 1 } },
    });
    return { ok: true, remaining: AI_LIMIT_FREE - (currentAiCount + 1) };
  }

  if (type === "BARCODE_SCAN") {
    if (currentBarcodeCount >= BARCODE_LIMIT_FREE) {
      return { ok: false, remaining: 0, resetAt: todayStart };
    }
    await prisma.user.update({
      where: { id: userId },
      data: { dailyBarcodeCount: { increment: 1 } },
    });
    return {
      ok: true,
      remaining: BARCODE_LIMIT_FREE - (currentBarcodeCount + 1),
    };
  }

  if (type === "INGREDIENT_COUNT") {
    const count = await prisma.ingredient.count({ where: { userId } });
    if (count >= INGREDIENT_LIMIT_FREE) {
      return { ok: false, remaining: 0 };
    }
    return { ok: true, remaining: INGREDIENT_LIMIT_FREE - count };
  }

  return { ok: false, remaining: 0 };
}
