// app/api/auth/webauthn/passkeys/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/auth/webauthn/passkeys/[id]
 * Rename a passkey (owner only)
 * Body: { name: string }
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, message: "認証が必要です" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "ユーザーが見つかりません" },
        { status: 404 },
      );
    }

    const { id } = await params;

    // Check passkey exists and belongs to user
    const passkey = await prisma.passkey.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!passkey) {
      return NextResponse.json(
        { ok: false, message: "パスキーが見つかりません" },
        { status: 404 },
      );
    }

    if (passkey.userId !== user.id) {
      return NextResponse.json(
        { ok: false, message: "このパスキーを編集する権限がありません" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.name !== "string") {
      return NextResponse.json(
        { ok: false, message: "名前が必要です" },
        { status: 400 },
      );
    }

    const name = body.name.trim().slice(0, 100); // max 100 chars

    const updated = await prisma.passkey.update({
      where: { id },
      data: { name: name || null },
      select: {
        id: true,
        name: true,
        createdAt: true,
        userAgent: true,
        transports: true,
      },
    });

    return NextResponse.json({ ok: true, passkey: updated });
  } catch (err) {
    console.error("[passkeys][rename] error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーでエラーが発生しました" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/auth/webauthn/passkeys/[id]
 * Delete a passkey (owner only)
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, message: "認証が必要です" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "ユーザーが見つかりません" },
        { status: 404 },
      );
    }

    const { id } = await params;

    // Check passkey exists and belongs to user
    const passkey = await prisma.passkey.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!passkey) {
      return NextResponse.json(
        { ok: false, message: "パスキーが見つかりません" },
        { status: 404 },
      );
    }

    if (passkey.userId !== user.id) {
      return NextResponse.json(
        { ok: false, message: "このパスキーを削除する権限がありません" },
        { status: 403 },
      );
    }

    await prisma.passkey.delete({ where: { id } });

    console.log(`[passkeys][delete] passkeyId=${id} userId=${user.id}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[passkeys][delete] error:", err);
    return NextResponse.json(
      { ok: false, message: "サーバーでエラーが発生しました" },
      { status: 500 },
    );
  }
}
