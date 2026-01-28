import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const genreUpdateSchema = z.object({
  recentGenrePenalty: z.record(z.number().min(-1).max(1)),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    const taste = (prefs?.tasteJson as any) || {};
    return NextResponse.json({
      recentGenrePenalty: taste.recentGenrePenalty || {},
    });
  } catch (error) {
    console.error("Genre GET Error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await req.json();

    const parsed = genreUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "バリデーションエラー" },
        { status: 400 },
      );
    }

    const currentPrefs = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    const currentTaste = (currentPrefs?.tasteJson as any) || {};
    const updatedTaste = {
      ...currentTaste,
      recentGenrePenalty: parsed.data.recentGenrePenalty,
    };

    await prisma.userPreferences.upsert({
      where: { userId },
      update: { tasteJson: updatedTaste },
      create: { userId, tasteJson: updatedTaste },
    });

    return NextResponse.json({
      recentGenrePenalty: updatedTaste.recentGenrePenalty,
    });
  } catch (error) {
    console.error("Genre PUT Error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
