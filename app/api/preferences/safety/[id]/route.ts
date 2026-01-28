import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    // アレルギーか制限か両方チェックして持ち主を確認
    const [allergy, restriction] = await Promise.all([
      prisma.userAllergy.findFirst({ where: { id, userId } }),
      prisma.userRestriction.findFirst({ where: { id, userId } }),
    ]);

    if (!allergy && !restriction) {
      return NextResponse.json(
        { error: "見つかりませんでした" },
        { status: 404 },
      );
    }

    if (allergy) {
      await prisma.userAllergy.delete({ where: { id } });
    } else {
      await prisma.userRestriction.delete({ where: { id } });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Safety DELETE Error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
