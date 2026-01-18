import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * PUT /api/auth/webauthn/passkeys/[id]
 * Update passkey name
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.sub) {
      return NextResponse.json(
        { ok: false, message: "認証が必要です" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.name !== "string") {
      return NextResponse.json(
        { ok: false, message: "無効なリクエストです" },
        { status: 400 },
      );
    }

    // IP Check
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { allowedIps: true },
    });

    if (user?.allowedIps && user.allowedIps.length > 0) {
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      if (!user.allowedIps.includes(ip)) {
        return NextResponse.json(
          { ok: false, message: "許可されていないIPからの操作です" },
          { status: 403 },
        );
      }
    }

    const passkey = await prisma.passkey.updateMany({
      where: {
        id: id,
        userId: token.sub,
      },
      data: {
        name: body.name.trim().slice(0, 100),
      },
    });

    if (passkey.count === 0) {
      return NextResponse.json(
        { ok: false, message: "パスキーが見つかりません" },
        { status: 404 },
      );
    }

    // Return updated passkey
    const updatedPasskey = await prisma.passkey.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        userAgent: true,
        transports: true,
      },
    });

    return NextResponse.json({
      ok: true,
      passkey: updatedPasskey,
    });
  } catch (error) {
    console.error("passkeys PUT error:", error);
    return NextResponse.json(
      { ok: false, message: "名前の更新に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/auth/webauthn/passkeys/[id]
 * Delete a passkey
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.sub) {
      return NextResponse.json(
        { ok: false, message: "認証が必要です" },
        { status: 401 },
      );
    }

    // IP Check
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { allowedIps: true },
    });

    if (user?.allowedIps && user.allowedIps.length > 0) {
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      if (!user.allowedIps.includes(ip)) {
        return NextResponse.json(
          { ok: false, message: "許可されていないIPからの操作です" },
          { status: 403 },
        );
      }
    }

    const result = await prisma.passkey.deleteMany({
      where: {
        id: id,
        userId: token.sub,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { ok: false, message: "パスキーが見つかりません" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "パスキーを削除しました",
    });
  } catch (error) {
    console.error("passkeys DELETE error:", error);
    return NextResponse.json(
      { ok: false, message: "削除に失敗しました" },
      { status: 500 },
    );
  }
}
