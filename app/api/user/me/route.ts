import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { AI_LIMIT_FREE, AI_LIMIT_PRO } from "@/lib/aiLimit";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [user, todayCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          createdAt: true,
        },
      }),
      prisma.menuGeneration.count({
        where: {
          userId: userId,
          generatedAt: { gte: today },
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const limits = user.plan === "PRO" ? AI_LIMIT_PRO : AI_LIMIT_FREE;

    return NextResponse.json({
      user,
      usage: {
        today: todayCount,
        limit: limits,
        remaining: Math.max(0, limits - todayCount),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("User API Error:", error);
      console.error(
        "User API Error stack:",
        error instanceof Error ? error.stack : "No stack trace",
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
