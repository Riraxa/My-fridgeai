//app/api/settings/expiration/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(prefs || {});
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    expirationCriticalDays,
    expirationWarningDays,
    expirationPriorityWeight,
  } = body;

  // Validate (Pro logic check could go here)

  const updated = await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    update: {
      expirationCriticalDays,
      expirationWarningDays,
      expirationPriorityWeight,
    },
    create: {
      userId: session.user.id,
      expirationCriticalDays,
      expirationWarningDays,
      expirationPriorityWeight,
      // defaults for others
      cookingSkill: "intermediate",
      enableExpirationAlert: true,
    },
  });

  return NextResponse.json(updated);
}
