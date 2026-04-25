import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();

  const updated = await prisma.ingredient.updateMany({
    where: { id, userId },
    data: {
      name: body.name,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      amountLevel: body.amountLevel ?? null,
      unit: body.unit ?? "個",
      expirationDate: body.expirationDate || body.expiry ? new Date(body.expirationDate || body.expiry) : null,
      category: body.category ?? "その他",
      ingredientType: (await import("@/lib/ingredient-inference")).inferIngredientType(body.name || "").ingredientType,
    },
  });

  if (updated.count === 0) {
    return NextResponse.json(
      { error: "更新できませんでした（権限または存在しないID）" },
      { status: 404 },
    );
  }

  const rec = await prisma.ingredient.findUnique({ where: { id } });
  return NextResponse.json({ item: rec });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const userId = session.user.id;

  await prisma.ingredient.deleteMany({ where: { id, userId } });

  return NextResponse.json({ ok: true });
}
