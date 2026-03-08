import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import JoinForm from "./JoinForm";
import { prisma } from "@/lib/prisma";

export default async function HouseholdJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  const session = await auth();
  if (!session?.user?.id) {
    if (token) {
      redirect(`/login?callbackUrl=/household/join?token=${token}`);
    } else {
      redirect("/login");
    }
  }

  if (!token) {
    return (
      <div className="container mx-auto p-4 max-w-md mt-10">
        <h1 className="text-2xl font-bold mb-4 text-center">エラー</h1>
        <div className="card border p-6 rounded-lg text-center space-y-4">
          <p className="text-red-500">招待トークンが見つかりません。正しい招待リンクからアクセスしてください。</p>
        </div>
      </div>
    );
  }

  // Pre-validate token on the server
  const invite = await prisma.householdInvite.findUnique({
    where: { token },
    include: { household: true },
  });

  if (!invite || invite.revoked || invite.expiresAt < new Date()) {
    return (
      <div className="container mx-auto p-4 max-w-md mt-10">
        <h1 className="text-2xl font-bold mb-4 text-center">招待が無効です</h1>
        <div className="card border p-6 rounded-lg text-center space-y-4">
          <p className="text-red-500">この招待リンクは無効または期限切れです。</p>
        </div>
      </div>
    );
  }

  // check if already a member
  const existing = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId: invite.householdId,
        userId: session.user.id,
      },
    },
  });

  if (existing) {
    return (
      <div className="container mx-auto p-4 max-w-md mt-10">
        <h1 className="text-2xl font-bold mb-4 text-center">手続き不要</h1>
        <div className="card border p-6 rounded-lg text-center space-y-4">
          <p>すでにこの家族グループに参加しています。</p>
          <a href="/settings/family" className="text-blue-500 underline block mt-4">ダッシュボードへ戻る</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-md mt-10">
      <h1 className="text-2xl font-bold mb-4 text-center">家族グループへ参加</h1>
      <JoinForm token={token} />
    </div>
  );
}
