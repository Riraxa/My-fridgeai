// lib/security.ts

// eslint-disable-next-line @typescript-eslint/no-require-imports
let nodeCrypto: typeof import("crypto") | undefined;
if (typeof window === "undefined" && typeof require !== "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nodeCrypto = require("crypto");
  } catch {
    // フォールバック
  }
}

// Edge Runtime対応のためのフォールバック
const getRandomValues = (length: number) => {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    return window.crypto.getRandomValues(new Uint8Array(length));
  }

  // Node.js環境
  if (nodeCrypto) {
    return nodeCrypto.randomBytes(length);
  }

  // 最終フォールバック
  const values = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    values[i] = Math.floor(Math.random() * 256);
  }
  return values;
};

/**
 * セキュリティ関連のユーティリティ関数
 */

// HTMLエスケープ用のマップ
const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

/**
 * HTML文字列をエスケープする（XSS対策）
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== "string") {
    return String(unsafe);
  }
  return unsafe.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] ?? char);
}

/**
 * 文字列をサニタイズする（ホワイトリスト方式）
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (typeof input !== "string") {
    return "";
  }

  // 長さ制限
  const trimmed = input.trim().slice(0, maxLength);

  // ホワイトリスト：日本語、英数字、基本的な記号のみ許可
  const sanitized = trimmed.replace(
    /[^\p{L}\p{N}\s\-_.,!?@#$%^&*()+=\[\]{}|\\/<>:;'"`~]/gu,
    "",
  );

  return sanitized;
}

/**
 * プロンプトインジェクション対策のための入力クリーニング
 */
export function sanitizePromptInput(input: string): string {
  if (typeof input !== "string") return "";

  // より包括的な危険パターン
  const dangerousPatterns = [
    /ignore\s+(?:all\s+)?(?:above|previous|prior)\s+(?:instructions?|prompts?|rules?)/gi,
    /disregard\s+(?:all\s+)?(?:above|previous|prior)/gi,
    /(?:system|assistant|user)\s*[:：]/gi,
    /\n\n(?:SYSTEM|USER|ASSISTANT)\s*[:：]/g,
    /```[\s\S]*?```/g,
    /`[^`]*`/g,
    /(?:pretend|act\s+as|role\s*play)/gi,
    /(?:開発者|developer)\s*(?:モード|mode)/gi,
    /^\s*###\s*(?:system|user|assistant)/gi,
    /\\x[0-9a-fA-F]{2}/g, // hex escape sequences
    /[\u0000-\u001f]/g, // control characters
  ];

  let sanitized = input.trim();
  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "");
  });

  // 追加のセキュリティチェック
  if (sanitized.length < input.length * 0.5) {
    // 50%以上削除された場合は疑わしい
    console.warn(
      `[SECURITY] Suspicious input detected: ${input.substring(0, 100)}`,
    );
  }

  return sanitized.slice(0, 2000);
}


/**
 * 安全なランダム文字列生成
 */
export function generateSecureRandomString(length = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = getRandomValues(length);

  let result = "";
  for (let i = 0; i < length; i++) {
    const val = randomValues[i];
    if (val !== undefined) {
      result += chars.charAt(val % chars.length);
    }
  }

  return result;
}

/**
 * IPアドレスの検証と正規化（偽装対策強化版）
 */
export function validateAndNormalizeIP(ip: string | null): string {
  if (!ip) return "unknown";

  // X-Forwarded-Forヘッダーの場合、カンマ区切りで複数のIPが含まれる場合がある
  // 最も左側のIPがオリジナルのクライアントIP
  const ipList = ip.split(",").map((s) => s.trim());
  const clientIP = ipList[0] ?? "unknown";

  // IPv4形式の検証
  const ipv4Regex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  // IPv6形式の検証（簡易）
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (ipv4Regex.test(clientIP)) {
    const parts = clientIP.split(".");
    // 各オクテットが0-255の範囲内かチェック
    if (
      parts.every((part) => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      })
    ) {
      return clientIP;
    }
  }

  if (ipv6Regex.test(clientIP)) {
    return clientIP;
  }

  // プライベートIPアドレスの検証（偽装対策）
  const privateIPRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
  ];

  const isPrivateIP = privateIPRanges.some((range) => range.test(clientIP));
  if (isPrivateIP) {
    return clientIP;
  }

  // 不明な形式の場合はハッシュ化して保存
  if (!nodeCrypto) {
    return "unknown";
  }
  return nodeCrypto
    .createHash("sha256")
    .update(clientIP)
    .digest("hex")
    .substring(0, 16);
}

/**
 * レートリミット用のキー生成
 */
export function generateRateLimitKey(
  identifier: string,
  action: string,
): string {
  const data = `${identifier}:${action}`;
  if (!nodeCrypto) {
    // フォールバック: 単純なハッシュ
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }
  return nodeCrypto.createHash("sha256").update(data).digest("hex");
}

