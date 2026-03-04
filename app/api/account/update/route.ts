import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const { name, email, image } = await req.json();

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name, email, image },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("update account error:", err);
    return NextResponse.json(
      { error: "更新に失敗しました。" },
      { status: 500 },
    );
  }
}
