/**
 * 機能: UserTasteProfile API エンドポイント
 * 目的: ユーザーの好みプロファイルを取得・更新
 * 非目的: プロファイルの自動生成（バッチ処理で別途実行）
 * 変更方針: 破壊的変更禁止
 * セキュリティ: 認証必須 / ユーザー分離
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAndSaveTasteProfile } from "@/lib/taste/buildTasteProfile";
import { z } from "zod";

// ============================================================================
// バリデーションスキーマ
// ============================================================================

const UpdateProfileSchema = z.object({
  favoriteIngredients: z.array(z.string()).max(50).optional(),
  dislikedIngredients: z.array(z.string()).max(50).optional(),
  favoriteCookingStyles: z.array(z.string()).max(20).optional(),
  dislikedCookingStyles: z.array(z.string()).max(20).optional(),
  favoriteProcessedProducts: z.array(z.string()).max(20).optional(),
  manualOverride: z.boolean().optional(), // 手動編集フラグ
});

// ============================================================================
// GET /api/taste/profile - プロファイル取得
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

    // プロファイル取得
    let profile = await prisma.userTasteProfile.findUnique({
      where: { userId },
    });

    // プロファイルがない、または強制再構築が要求された場合
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
          // 初回作成失敗時は空のプロファイルを返す
          return NextResponse.json({
            profile: {
              favoriteIngredients: [],
              dislikedIngredients: [],
              favoriteCookingStyles: [],
              dislikedCookingStyles: [],
              favoriteProcessedProducts: [],
            },
            source: "default",
            version: 0,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    // 既存プロファイルを返す
    return NextResponse.json({
      profile: {
        favoriteIngredients: profile.favoriteIngredients,
        dislikedIngredients: profile.dislikedIngredients,
        favoriteCookingStyles: profile.favoriteCookingStyles,
        dislikedCookingStyles: profile.dislikedCookingStyles,
        favoriteProcessedProducts: profile.favoriteProcessedProducts,
      },
      source: "stored",
      version: profile.version,
      updatedAt: profile.updatedAt.toISOString(),
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
// PUT /api/taste/profile - プロファイル更新（手動編集）
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

    // 既存プロファイル取得または作成
    const existing = await prisma.userTasteProfile.findUnique({
      where: { userId },
    });

    let profile;
    if (existing) {
      profile = await prisma.userTasteProfile.update({
        where: { userId },
        data: {
          ...(data.favoriteIngredients !== undefined && {
            favoriteIngredients: data.favoriteIngredients,
          }),
          ...(data.dislikedIngredients !== undefined && {
            dislikedIngredients: data.dislikedIngredients,
          }),
          ...(data.favoriteCookingStyles !== undefined && {
            favoriteCookingStyles: data.favoriteCookingStyles,
          }),
          ...(data.dislikedCookingStyles !== undefined && {
            dislikedCookingStyles: data.dislikedCookingStyles,
          }),
          ...(data.favoriteProcessedProducts !== undefined && {
            favoriteProcessedProducts: data.favoriteProcessedProducts,
          }),
          version: { increment: 1 },
        },
      });
    } else {
      profile = await prisma.userTasteProfile.create({
        data: {
          userId,
          favoriteIngredients: data.favoriteIngredients ?? [],
          dislikedIngredients: data.dislikedIngredients ?? [],
          favoriteCookingStyles: data.favoriteCookingStyles ?? [],
          dislikedCookingStyles: data.dislikedCookingStyles ?? [],
          favoriteProcessedProducts: data.favoriteProcessedProducts ?? [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      profile: {
        favoriteIngredients: profile.favoriteIngredients,
        dislikedIngredients: profile.dislikedIngredients,
        favoriteCookingStyles: profile.favoriteCookingStyles,
        dislikedCookingStyles: profile.dislikedCookingStyles,
        favoriteProcessedProducts: profile.favoriteProcessedProducts,
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
// POST /api/taste/profile/rebuild - プロファイル再構築
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));

    // オプション取得
    const options = {
      daysBack: body.daysBack ?? 90,
      topN: body.topN ?? 20,
      bottomN: body.bottomN ?? 10,
    };

    // 再構築実行
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
