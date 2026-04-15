// lib/telemetry-server.ts
import { prisma } from "./prisma";

/**
 * サーバーサイトのイベントを TelemetryEvent テーブルに記録します。
 * 失敗しても処理を継続するため、エラーはキャッチしてログ出力のみ行います。
 */
export async function recordServerEvent(
  userId: string | null,
  category: "UI" | "API" | "SYSTEM",
  event: string,
  meta: Record<string, unknown> = {}
) {
  try {
    await prisma.telemetryEvent.create({
      data: {
        userId,
        category,
        event,
        meta: meta as any,
      },
    });
  } catch (e) {
    console.error(`[Telemetry-Server] Failed to record event: ${event}`, e);
  }
}

/**
 * AI生成のメトリクス（トークン使用量、レイテンシなど）を記録します。
 */
export async function recordAiMetrics(
  userId: string,
  model: string,
  metrics: {
    promptTokens?: number;
    completionTokens?: number;
    latencyMs?: number;
    [key: string]: any;
  }
) {
  return recordServerEvent(userId, "SYSTEM", "AI_METRICS", {
    model,
    ...metrics,
  });
}
