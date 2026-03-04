import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { differenceInHours } from "date-fns";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;

    // ユーザーの設定を取得
    // 生のSQLクエリを使用して配列フィールドの問題を回避
    let preferences = null;
    try {
      const result = await prisma.$queryRaw`
        SELECT id, "userId", "alertDaysBefore" 
        FROM "UserPreferences" 
        WHERE "userId" = ${userId}
        LIMIT 1
      `;
      preferences = Array.isArray(result) && result.length > 0 ? result[0] : null;
    } catch (prefError) {
      console.error("Error fetching preferences:", prefError);
      // デフォルト値を使用
      preferences = { alertDaysBefore: 3 };
    }

    const alertDaysBefore = preferences?.alertDaysBefore || 3;

    // 賞味期限が近い食材を取得
    const ingredients = await prisma.ingredient.findMany({
      where: { userId },
    });

    const expiringItems = ingredients.filter((i) => {
      if (!i.expirationDate) return false;

      // タイムゾーンを考慮した日付計算
      const now = new Date();
      now.setHours(0, 0, 0, 0); // 今日の開始時刻
      const itemDate = new Date(i.expirationDate);
      const itemDateOnly = new Date(
        itemDate.getFullYear(),
        itemDate.getMonth(),
        itemDate.getDate(),
      );

      // 日数の差を計算
      const diffTime = itemDateOnly.getTime() - now.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return days >= 0 && days <= alertDaysBefore;
    });

    const createdAlerts = [];

    // 通知を作成
    for (const item of expiringItems) {
      // 既存の通知をチェック
      const existingAlert = await prisma.inventoryAlert.findUnique({
        where: {
          userId_ingredientId_alertType: {
            userId,
            ingredientId: item.id,
            alertType: "expiration",
          },
        },
      });

      // 23時間以内に通知済みの場合はスキップ
      if (existingAlert && existingAlert.lastAlertedAt) {
        const hoursSince = differenceInHours(
          new Date(),
          existingAlert.lastAlertedAt,
        );
        if (hoursSince < 23) {
          continue;
        }
      }

      // 通知を作成・更新
      await prisma.inventoryAlert.upsert({
        where: {
          userId_ingredientId_alertType: {
            userId,
            ingredientId: item.id,
            alertType: "expiration",
          },
        },
        create: {
          userId,
          ingredientId: item.id,
          alertType: "expiration",
          alertDays: alertDaysBefore,
          lastAlertedAt: new Date(),
        },
        update: {
          lastAlertedAt: new Date(),
          isActive: true,
        },
      });

      createdAlerts.push({
        id: item.id,
        name: item.name,
        daysRemaining: (() => {
          // タイムゾーンを考慮した日付計算
          const now = new Date();
          now.setHours(0, 0, 0, 0); // 今日の開始時刻
          const itemDate = new Date(item.expirationDate!);
          const itemDateOnly = new Date(
            itemDate.getFullYear(),
            itemDate.getMonth(),
            itemDate.getDate(),
          );

          // 日数の差を計算
          const diffTime = itemDateOnly.getTime() - now.getTime();
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        })(),
      });
    }

    return NextResponse.json({
      success: true,
      alertsCreated: createdAlerts.length,
      expiringItems: createdAlerts,
    });
  } catch (error) {
    console.error("Check Expiring API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
