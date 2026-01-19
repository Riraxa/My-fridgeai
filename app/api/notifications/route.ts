// app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
