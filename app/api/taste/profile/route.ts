/**
 * 機能: UserTasteProfile API エンドポイント
 * 目的: ユーザーの好みプロファイルを取得・更新
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAndSaveTasteProfile } from "@/lib/taste/buildTasteProfile";
import { z } from "zod";

// ============================================================================
// バリデーションスキーマ（スキーマ列名に合わせて整合）
// ============================================================================

const UpdateProfileSchema = z.object({
  favoriteIngredients: z.array(z.string()).max(50).optional(),
  dislikedIngredients: z.array(z.string()).max(50).optional(),
  favoriteMethods:     z.array(z.string()).max(20).optional(),
  dislikedMethods:     z.array(z.string()).max(20).optional(),
  favoriteDishes:      z.array(z.string()).max(20).optional(),
  dislikedDishes:      z.array(z.string()).max(20).optional(),
  manualOverride: z.boolean().optional(),
});

// ============================================================================
// GET /api/taste/profile
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const forceRebuild = searchParams.get("rebuild") === "true";

    let profile = await prisma.userTasteProfile.findUnique({
      where: { userId },
    });

    if (!profile || forceRebuild) {
      try {
        const rebuilt = await buildAndSaveTasteProfile(userId);
        return NextResponse.json({
          profile: rebuilt,
          source: "rebuilt",
          version: profile ? profile.version + 1 : 1,
          updatedAt: new Date().toISOString(),
        });
      } catch (rebuildError) {
        console.error("[TasteProfile] Rebuild failed:", rebuildError);
        if (!profile) {
          return NextResponse.json({
            profile: {
              favoriteIngredients: [],
              dislikedIngredients: [],
              favoriteMethods: [],
              dislikedMethods: [],
              favoriteDishes: [],
              dislikedDishes: [],
            },
            source: "default",
            version: 0,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({
      profile: {
        favoriteIngredients: profile!.favoriteIngredients,
        dislikedIngredients: profile!.dislikedIngredients,
        favoriteMethods:     profile!.favoriteMethods,
        dislikedMethods:     profile!.dislikedMethods,
        favoriteDishes:      profile!.favoriteDishes,
        dislikedDishes:      profile!.dislikedDishes,
      },
      source: "stored",
      version: profile!.version,
      updatedAt: profile!.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[TasteProfile] GET Error:", error);
    return NextResponse.json(
      { error: "プロファイル取得に失敗しました" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/taste/profile
// ============================================================================

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();

    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "バリデーションエラー", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.userTasteProfile.findUnique({ where: { userId } });

    let profile;
    if (existing) {
      profile = await prisma.userTasteProfile.update({
        where: { userId },
        data: {
          ...(data.favoriteIngredients !== undefined && { favoriteIngredients: data.favoriteIngredients }),
          ...(data.dislikedIngredients !== undefined && { dislikedIngredients: data.dislikedIngredients }),
          ...(data.favoriteMethods     !== undefined && { favoriteMethods:     data.favoriteMethods }),
          ...(data.dislikedMethods     !== undefined && { dislikedMethods:     data.dislikedMethods }),
          ...(data.favoriteDishes      !== undefined && { favoriteDishes:      data.favoriteDishes }),
          ...(data.dislikedDishes      !== undefined && { dislikedDishes:      data.dislikedDishes }),
          version: { increment: 1 },
        },
      });
    } else {
      profile = await prisma.userTasteProfile.create({
        data: {
          userId,
          favoriteIngredients: data.favoriteIngredients ?? [],
          dislikedIngredients: data.dislikedIngredients ?? [],
          favoriteMethods:     data.favoriteMethods     ?? [],
          dislikedMethods:     data.dislikedMethods     ?? [],
          favoriteDishes:      data.favoriteDishes      ?? [],
          dislikedDishes:      data.dislikedDishes      ?? [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      profile: {
        favoriteIngredients: profile.favoriteIngredients,
        dislikedIngredients: profile.dislikedIngredients,
        favoriteMethods:     profile.favoriteMethods,
        dislikedMethods:     profile.dislikedMethods,
        favoriteDishes:      profile.favoriteDishes,
        dislikedDishes:      profile.dislikedDishes,
      },
      version: profile.version,
      updatedAt: profile.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[TasteProfile] PUT Error:", error);
    return NextResponse.json(
      { error: "プロファイル更新に失敗しました" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/taste/profile - 再構築
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));

    const options = {
      daysBack: body.daysBack ?? 90,
      topN:     body.topN    ?? 20,
      bottomN:  body.bottomN ?? 10,
    };

    const profile = await buildAndSaveTasteProfile(userId, options);

    return NextResponse.json({
      success: true,
      profile,
      source: "rebuilt",
      message: "プロファイルを再構築しました",
    });
  } catch (error) {
    console.error("[TasteProfile] POST Error:", error);
    return NextResponse.json(
      { error: "プロファイル再構築に失敗しました" },
      { status: 500 }
    );
  }
}
