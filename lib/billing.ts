// lib/billing.ts
import { prisma } from "./prisma";

/**
 * ユーザーのプラン状態を取得（家族グループの影響を考慮）
 */
export async function getUserPlan(userId: string): Promise<"FREE" | "PRO"> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  return (user?.plan as "FREE" | "PRO") || "FREE";
}

/**
 * ユーザーが所属している家族グループがアクティブ（OwnerがPro）かどうか
 */
export async function isHouseholdActive(userId: string): Promise<boolean> {
  const membership = await prisma.householdMember.findFirst({
    where: { userId },
    include: {
      household: {
        include: {
          owner: {
            select: { plan: true },
          },
        },
      },
    },
  });

  return membership?.household.owner.plan === "PRO";
}

/**
 * ユーザーが家族グループを作成可能かチェック（自分がProである必要あり）
 */
export async function canCreateHousehold(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return plan === "PRO";
}
