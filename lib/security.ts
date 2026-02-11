// lib/security.ts

// Edge Runtime対応のためのフォールバック
const getRandomValues = (length: number) => {
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    window.crypto.getRandomValues
  ) {
    return window.crypto.getRandomValues(new Uint8Array(length));
  }

  // Node.js環境
  if (typeof require !== "undefined") {
    try {
      const crypto = require("crypto") as any;
      return crypto.randomBytes(length);
    } catch (e) {
      // フォールバック
    }
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
    /ignore\s+(all\s+)?(above|previous|prior)\s+(instructions?|prompts?|rules?)/gi,
    /disregard\s+(all\s+)?(above|previous|prior)/gi,
    /(system|assistant|user)\s*[:：]/gi,
    /\n\n(SYSTEM|USER|ASSISTANT)\s*[:：]/g,
    /```[\s\S]*?```/g,
    /`[^`]*`/g,
    /(pretend|act\s+as|role\s*play)/gi,
    /(開発者|developer)\s*(モード|mode)/gi,
    /^\s*###\s*(system|user|assistant)/gi,
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
 * JWTトークンの追加検証
 */
export function validateJWTToken(token: any): {
  valid: boolean;
  userId?: string;
  error?: string;
} {
  if (!token) {
    return { valid: false, error: "Token is missing" };
  }

  // 必須フィールドのチェック
  const userId = token.sub || token.userId;
  if (!userId || typeof userId !== "string") {
    return { valid: false, error: "Invalid user ID in token" };
  }

  // トークン有効期限のチェック
  if (token.exp && typeof token.exp === "number") {
    const now = Math.floor(Date.now() / 1000);
    if (token.exp < now) {
      return { valid: false, error: "Token has expired" };
    }
  }

  // ユーザーIDの形式検証（cuid/uuid/etc）
  if (!/^[a-zA-Z0-9_\-]{20,128}$/.test(userId)) {
    console.error(
      `[JWT Validation Error] Invalid format for userId: ${userId}`,
    );
    return { valid: false, error: "Invalid user ID format" };
  }

  return { valid: true, userId };
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
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6形式の検証（簡易）
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

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
  const crypto = require("crypto");
  return (crypto as any)
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
  const timestamp = Math.floor(Date.now() / (60 * 1000)); // 1分単位
  const data = `${identifier}:${action}:${timestamp}`;
  const crypto = require("crypto") as any;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * パスワード強度の追加検証
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof password !== "string") {
    errors.push("パスワードは文字列である必要があります");
    return { valid: false, errors };
  }

  if (password.length < 12) {
    errors.push("パスワードは12文字以上である必要があります");
  }

  if (password.length > 128) {
    errors.push("パスワードは128文字以下である必要があります");
  }

  // 一般的な弱いパスワードのチェック
  const commonPasswords = [
    "password",
    "123456",
    "123456789",
    "qwerty",
    "abc123",
    "password123",
    "admin",
    "letmein",
    "welcome",
    "monkey",
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("一般的なパスワードは使用できません");
  }

  // 連続する文字や数字のチェック
  if (/(.)\1{2,}/.test(password)) {
    errors.push("同じ文字を3回以上連続で使用しないでください");
  }

  return { valid: errors.length === 0, errors };
}

// 統一認証エラーメッセージ（ユーザー列挙対策）
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS:
    "認証情報が正しくありません。メールアドレスとパスワード（またはパスキー）を確認してください。",
  PASSKEY_ONLY:
    "このアカウントはパスキーでのログインのみ対応しています。パスキーを使用してログインしてください。",
} as const;
