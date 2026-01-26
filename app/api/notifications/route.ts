// app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get("id");

    if (!alertId) {
      return NextResponse.json(
        { error: "アラートIDが必要です" },
        { status: 400 },
      );
    }

    const userId = session.user.id;

    // 削除するアラートがユーザーのものか確認
    const alert = await prisma.inventoryAlert.findFirst({
      where: { id: alertId, userId },
    });

    if (!alert) {
      return NextResponse.json(
        { error: "アラートが見つかりません" },
        { status: 404 },
      );
    }

    await prisma.inventoryAlert.delete({
      where: { id: alertId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Notification API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;

    const alerts = await prisma.inventoryAlert.findMany({
      where: { userId },
      include: {
        ingredient: {
          select: {
            name: true,
            expirationDate: true,
          },
        },
      },
      orderBy: { lastAlertedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Notifications API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
