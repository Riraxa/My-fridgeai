import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      return NextResponse.json({
        recentGenrePenalty: {},
      });
    }

    const tasteJson = prefs.tasteJson as any;
    return NextResponse.json({
      recentGenrePenalty: tasteJson?.recentGenrePenalty ?? {},
    });
  } catch (error) {
    console.error("Genre GET Error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json();

    const { recentGenrePenalty } = body;

    const currentPrefs = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    const currentTaste = (currentPrefs?.tasteJson as any) ?? {};
    const updatedTaste = {
      ...currentTaste,
      recentGenrePenalty,
    };

    const updated = await prisma.userPreferences.upsert({
      where: { userId },
      update: { tasteJson: updatedTaste },
      create: { userId, tasteJson: updatedTaste },
    });

    return NextResponse.json({
      recentGenrePenalty: (updated.tasteJson as any)?.recentGenrePenalty ?? {},
    });
  } catch (error) {
    console.error("Genre PUT Error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
