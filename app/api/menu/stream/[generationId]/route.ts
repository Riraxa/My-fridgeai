// app/api/menu/stream/[generationId]/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 進捗情報の型（Redisなし版）
interface MenuGenerationProgress {
  status: "preparing" | "generating" | "calculating" | "validating" | "completed" | "failed";
  thoughts: string[];
  updatedAt: number;
  error?: string;
}

// DBのステータスから進捗メッセージを生成
function getProgressFromDbStatus(progressStep: string | null): MenuGenerationProgress {
  const thoughts: Record<string, string[]> = {
    preparing: ["食材データを分析しています..."],
    generating: ["AIが献立案を生成しています...", "栄養バランスと期限食材を考慮しています..."],
    calculating: ["献立案を検証しています...", "食材の在庫と照らし合わせています..."],
    validating: ["栄養バランスを計算しています...", "最終調整を行っています..."],
    completed: ["献立生成が完了しました！"],
    failed: ["献立生成に失敗しました"],
  };
  
  return {
    status: (progressStep as any) || "preparing",
    thoughts: thoughts[progressStep || "preparing"] || ["献立を準備しています..."],
    updatedAt: Date.now(),
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ generationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { generationId } = await params;
    if (!generationId) {
      return new Response("Missing generationId", { status: 400 });
    }

    // 所有権確認
    const generation = await prisma.menuGeneration.findUnique({
      where: { id: generationId },
      select: { userId: true },
    });

    if (!generation) {
      return new Response("Generation not found", { status: 404 });
    }

    if (generation.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    // SSEレスポンスを設定
    const encoder = new TextEncoder();
    let lastProgress: MenuGenerationProgress | null = null;
    let isComplete = false;
    let retryCount = 0;
    const maxRetries = 120; // 2分間（1秒間隔）

    const stream = new ReadableStream({
      async start(controller) {
        // 初期メッセージ
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "connected", generationId })}\n\n`)
        );

        // ポーリングループ
        while (!isComplete && retryCount < maxRetries) {
          try {
            // Redisなし版：DBから直接進捗を取得
            const dbGeneration = await prisma.menuGeneration.findUnique({
              where: { id: generationId },
              select: { 
                status: true, 
                progressStep: true, 
                mainMenu: true, 
                alternativeA: true, 
                alternativeB: true, 
                nutritionInfo: true, 
                usedIngredients: true,
                thoughts: true 
              } as any,
            });

            if (!dbGeneration) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    error: "献立生成データが見つかりません",
                  })}\n\n`
                )
              );
              isComplete = true;
              controller.close();
              return;
            }

            // DBのステータスから進捗を生成
            const progress = (dbGeneration as any).thoughts && Array.isArray((dbGeneration as any).thoughts)
              ? { 
                  ...getProgressFromDbStatus((dbGeneration as any).progressStep), 
                  thoughts: [
                    ...getProgressFromDbStatus((dbGeneration as any).progressStep).thoughts, 
                    ...(dbGeneration as any).thoughts || []
                  ] 
                }
              : getProgressFromDbStatus((dbGeneration as any).progressStep);
            
            // エラーがある場合
            if ((dbGeneration as any).status === "failed") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    error: "献立生成に失敗しました",
                  })}\n\n`
                )
              );
              isComplete = true;
              controller.close();
              return;
            }

            // 進捗が更新された
            if (JSON.stringify(progress) !== JSON.stringify(lastProgress)) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "progress", ...progress })}\n\n`)
              );
              lastProgress = progress;
            }

            // 完了したら終了
            if ((dbGeneration as any).status === "completed" && (dbGeneration as any).mainMenu) {
              controller.enqueue(
                encoder.encode(
                   `data: ${JSON.stringify({
                    type: "complete",
                    generationId,
                    menus: {
                      main: (dbGeneration as any).mainMenu,
                      alternativeA: (dbGeneration as any).alternativeA,
                      alternativeB: (dbGeneration as any).alternativeB,
                    },
                    nutrition: (dbGeneration as any).nutritionInfo,
                    usedIngredients: (dbGeneration as any).usedIngredients,
                  })}\n\n`
                )
              );
              isComplete = true;
              controller.close();
              return;
            }

            // ゴースト生成の検出
            if (retryCount > 60 && (dbGeneration as any).status === "processing") {
               try {
                 await prisma.menuGeneration.update({
                   where: { id: generationId },
                   data: { status: "failed", progressStep: "failed" }
                 });
               } catch (e) {}
            }

            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒間隔
          } catch (error) {
            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        // タイムアウト
        if (!isComplete) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "timeout",
                message: "接続がタイムアウトしました。ページを更新してください。",
              })}\n\n`
            )
          );
          controller.close();
        }
      },

      cancel() {
        isComplete = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[SSE] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
