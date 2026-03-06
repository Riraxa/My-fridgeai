import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn: 複数のclassNameを安全に結合するヘルパー
 * Shadcn UIのコンポーネントが内部で使用
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 環境に応じたベースURLを取得する
 */
export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://www.my-fridgeai.com";
}
