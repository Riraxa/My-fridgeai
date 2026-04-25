// app/api/chat/food/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const coreMessages = messages
      .filter((m: any) => m.role !== "tool" && !m.toolInvocations) // UI特有のツール実行中メッセージは弾く
      .map((m: any) => {
        let content = m.content || m.text || "";
        if (!content && m.parts) {
          content = m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
        }
        
        // 最低限の形式に変換
        return {
          role: m.role === "user" ? "user" : m.role === "system" ? "system" : "assistant",
          content: m.role === "user" ? filterPII(content) : content,
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
- あなたはユーザーの代わりにアプリを操作する能力（ツール）を持っています。ユーザーから「買い物リストに追加して」「冷蔵庫に追加して」「〇〇のページに移動して」などと頼まれた場合、対応するツールを積極的に呼び出して実行してください。

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

    // OpenAI SDKで直接ストリーミング呼び出し
    const openaiStream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...coreMessages.map((m: any) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content
        }))
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "addToShoppingList",
            description: "ユーザーの指示に従って、買い物リストにアイテム（食材や日用品）を追加する。",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "追加するアイテムの名前。" },
                quantity: { type: "number", description: "数量。不明な場合は省略。" },
                unit: { type: "string", description: "単位（例: 個, パック, 本）。不明な場合は省略。" },
                note: { type: "string", description: "アイテムに付与するメモや買い物の条件（例: 安ければ買う、200円以下なら）。ない場合は省略。" }
              },
              required: ["name"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "addToFridge",
            description: "購入した食材やアイテムを冷蔵庫の在庫として追加する。",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "アイテムの名前。" },
                quantity: { type: "number", description: "数量（デフォルトは1）。" },
                unit: { type: "string", description: "単位（例: 個, g, ml）。" },
                category: { type: "string", enum: ["冷蔵", "冷凍", "野菜", "調味料", "加工食品", "その他"], description: "カテゴリ。不明なら「その他」。" }
              },
              required: ["name", "quantity", "unit"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "navigatePage",
            description: "ユーザーの目的に合わせて、アプリ内の適切なページに画面遷移させる。",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string", enum: ["/home", "/shopping-list", "/menu/generate", "/features/ai-menu", "/features/inventory"], description: "遷移先のパス。" },
                reason: { type: "string", description: "遷移する理由。" }
              },
              required: ["path", "reason"]
            }
          }
        }
      ],
      stream: true
    });

    // Vercel AI SDK useChat互換のストリームを作成
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let accumulatedContent = "";
          let toolCalls: any[] = [];
          let chunkCount = 0;
          
          for await (const chunk of openaiStream) {
            chunkCount++;
            const delta = chunk.choices[0]?.delta;
            
            // テキストコンテンツ
            if (delta?.content) {
              accumulatedContent += delta.content;
              const data = `0:${JSON.stringify(delta.content)}\n`;
              controller.enqueue(encoder.encode(data));
            }
            
            // ツール呼び出し収集
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const existing = toolCalls.find(t => t.index === tc.index);
                if (existing) {
                  if (tc.function?.name) existing.name = tc.function.name;
                  if (tc.function?.arguments) existing.args += tc.function.arguments;
                  if (tc.id) existing.id = tc.id;
                } else {
                  toolCalls.push({
                    index: tc.index,
                    id: tc.id || `call_${Date.now()}_${tc.index}`,
                    name: tc.function?.name || "",
                    args: tc.function?.arguments || ""
                  });
                }
              }
            }
            
            // 完了
            if (chunk.choices[0]?.finish_reason) {
              // ツール呼び出しがあれば送信
              if (toolCalls.length > 0) {
                for (const tc of toolCalls) {
                  const toolCallData = {
                    toolCallId: tc.id,
                    toolName: tc.name,
                    args: tc.args ? JSON.parse(tc.args) : {}
                  };
                  const data = `1:${JSON.stringify(toolCallData)}\n`;
                  controller.enqueue(encoder.encode(data));
                }
              }
              
              // 完了マーカー
              controller.enqueue(encoder.encode(`2:${JSON.stringify({ finishReason: chunk.choices[0].finish_reason })}\n`));
              controller.close();
              return;
            }
          }
          
          // ストリーム終了（finish_reasonが来なかった場合）
          controller.enqueue(encoder.encode(`2:${JSON.stringify({ finishReason: "stop" })}\n`));
          controller.close();
        } catch (error) {
          console.error("[Stream] Error:", error);
          controller.error(error);
        }
      }
    });

    // レスポンスヘッダーにクォータ情報を含める
    const headers = new Headers();
    headers.set("Content-Type", "text/plain; charset=utf-8");
    headers.set("X-Quota-Remaining", String(remainingQuota));
    headers.set("X-Quota-Limit", String(DAILY_QUOTA));

    return new Response(stream, { headers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "チャット処理に失敗しました";
    return NextResponse.json(
      { error: msg },
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
