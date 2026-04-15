// app/api/chat/food/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;
export const runtime = "nodejs";

// 制限設定
const DAILY_QUOTA = 5; // 1日5回
const RATE_LIMIT_PER_MINUTE = 5; // 1分間に5回
const PII_PATTERNS = [
  /\d{3}-\d{4}-\d{4}/, // 電話番号
  /\d{4}-\d{4}-\d{4}-\d{4}/, // クレジットカード
  /[\w.-]+@[\w.-]+\.\w+/, // メールアドレス
  /\d{3}-\d{4}/, // 郵便番号
  /\d{11,}/, // 長い数字列（個人IDなど）
];

// インメモリレート制限（IPベース）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// ヘルパー: クォータ取得
async function getUserQuota(userId: string) {
  const today = new Date();
  let quota = await prisma.chatDailyQuota.findUnique({
    where: { userId },
  });

  if (!quota) {
    return { count: 0, limit: DAILY_QUOTA, remaining: DAILY_QUOTA };
  }

  if (!isSameDay(quota.resetAt, today)) {
    return { count: 0, limit: DAILY_QUOTA, remaining: DAILY_QUOTA };
  }

  return {
    count: quota.count,
    limit: DAILY_QUOTA,
    remaining: Math.max(0, DAILY_QUOTA - quota.count),
  };
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分

  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

function containsPII(text: string): boolean {
  return PII_PATTERNS.some(pattern => pattern.test(text));
}

function filterPII(text: string): string {
  return text
    .replace(/\d{3}-\d{4}-\d{4}/g, "[電話番号]")
    .replace(/\d{4}-\d{4}-\d{4}-\d{4}/g, "[カード番号]")
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, "[メールアドレス]")
    .replace(/\d{3}-\d{4}/g, "[郵便番号]")
    .replace(/\d{11,}/g, "[個人ID]");
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 1. レート制限チェック（1分5回）
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `しばらく待ってから試してください（${rateLimitCheck.retryAfter}秒後）`,
          retryAfter: rateLimitCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    // 2. デイリークォータチェック（1日5回）
    const today = new Date();
    let quota = await prisma.chatDailyQuota.findUnique({
      where: { userId },
    });

    if (!quota) {
      quota = await prisma.chatDailyQuota.create({
        data: { userId, count: 0, resetAt: today },
      });
    }

    // 日付が変わったらリセット
    if (!isSameDay(quota.resetAt, today)) {
      quota = await prisma.chatDailyQuota.update({
        where: { userId },
        data: { count: 0, resetAt: today },
      });
    }

    if (quota.count >= DAILY_QUOTA) {
      return NextResponse.json(
        {
          error: "Daily quota exceeded",
          message: "本日のチャット回数上限（5回）に達しました。明日またお試しください。",
          quota: {
            used: quota.count,
            limit: DAILY_QUOTA,
            remaining: 0,
          },
        },
        { status: 429 }
      );
    }

    const { messages } = await req.json();

    // 3. 入力PIIチェック
    const lastMessage = messages[messages.length - 1];
    const lastContent = lastMessage?.content || lastMessage?.text || "";
    if (containsPII(lastContent)) {
      return NextResponse.json(
        {
          error: "PII detected",
          message: "個人情報（電話番号、メールアドレス等）が含まれています。削除して再試行してください。",
        },
        { status: 400 }
      );
    }

    // UIMessage の format (parts等) を CoreMessage (文字列のみのcontent) に正規化する
    const coreMessages = messages.map((m: any) => {
      let content = m.content;
      if (!content && m.parts) {
        content = m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
      }
      if (!content && m.text) {
        content = m.text;
      }
      // PIIフィルタ適用
      content = filterPII(content || "");
      return {
        role: m.role,
        content: content,
      };
    });

    const ingredients = await prisma.ingredient.findMany({
      where: { userId },
      orderBy: { expirationDate: "asc" },
    });

    const ingredientsList = ingredients
      .map(
        (i) =>
          `- ${i.name}: ${i.amount || ""}${i.unit || ""} (期限: ${
            i.expirationDate ? new Date(i.expirationDate).toLocaleDateString() : "不明"
          })`
      )
      .join("\n");

    const systemPrompt = `
あなたは家庭の食の意思決定を支援するキッチンアシスタントです。
献立、食材、買い物の相談はもちろん、雑談やちょっとした相談にもお答えします。

【現在の冷蔵庫の在庫】
${ingredientsList || "冷蔵庫に食材が登録されていません。"}

【振る舞いのルール】
- チャットは小窓で表示されるため、なるべく短い回答を心がけてください（100文字以内推奨）。
- 長いリストや長文は避け、要点だけを伝えてください。
- 食材の消費に関する質問には、在庫の中で期限が近いものを優先して推奨してください。
- 料理・食材に関係ない質問にも丁寧にお答えください。ただし、違法行為や有害な内容についてはお答えできません。

【重要: 医療・健康に関する免責】
- アレルギー、食事療法、健康診断に関する質問には必ず「これはAIのアドバイスです。実際の症状や食事制限については医師や栄養士に相談してください」と付記してください。
- 特定の食材で体調不良が起きた場合の対処法を聞かれても、専門家への相談を促し、即座に医療機関を受診するようアドバイスしてください。
- 食中毒の可能性がある場合は「これは深刻な問題です。医療機関または保健所に相談してください」と明確に伝えてください。
`;

    // クォータ更新（成功時にカウント増加）
    await prisma.chatDailyQuota.update({
      where: { userId },
      data: { count: { increment: 1 } },
    });

    const remainingQuota = DAILY_QUOTA - (quota.count + 1);

    const stream = await streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: coreMessages,
    });

    // レスポンスヘッダーにクォータ情報を含める
    const response = stream.toUIMessageStreamResponse();
    const headers = new Headers(response.headers);
    headers.set("X-Quota-Remaining", String(remainingQuota));
    headers.set("X-Quota-Limit", String(DAILY_QUOTA));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("[ChatAPI] Error:", error);
    return NextResponse.json(
      { error: "チャット生成に失敗しました" },
      { status: 500 }
    );
  }
}

// クォータ確認用GETエンドポイント
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const quota = await getUserQuota(userId);
    return NextResponse.json({ quota });
  } catch (error) {
    console.error("[ChatAPI] GET Error:", error);
    return NextResponse.json(
      { error: "クォータ情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
