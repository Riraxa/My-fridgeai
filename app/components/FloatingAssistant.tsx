// app/components/FloatingAssistant.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Bot, ChefHat, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useFridge } from "@/app/components/FridgeProvider";

interface QuotaInfo {
  count: number;
  limit: number;
  remaining: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "こんにちは！何かお手伝いしましょうか？食材や献立について聞いてください 🍳",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { setShopping, addOrUpdateItem, setToast } = useFridge();

  // クォータ取得
  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const res = await fetch("/api/chat/food");
        if (res.ok) {
          const data = await res.json();
          setQuota(data.quota);
        }
      } catch {
        // ignore
      }
    };
    fetchQuota();
  }, []);

  // ツール呼び出し処理
  const handleToolCall = useCallback(async (toolCall: any) => {
    let responseText = "";
    if (toolCall.toolName === "addToShoppingList") {
      const args = toolCall.args || {};
      const { name, quantity = 1, unit = "", note = "" } = args;
      setShopping((prev: any[]) => [
        {
          id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
          name,
          quantity,
          unit,
          note,
          done: false,
        },
        ...(prev || []),
      ]);
      setToast(`買い物リストに「${name}」を追加しました`);
      responseText = `買い物リストに「${name}」を追加しました！`;
    }
    
    if (toolCall.toolName === "addToFridge") {
      const args = toolCall.args || {};
      const { name, quantity = 1, unit = "個", category = "その他" } = args;
      await addOrUpdateItem({
        name,
        quantity,
        unit,
        category,
      });
      setToast(`冷蔵庫に「${name}」を追加しました`);
      responseText = `冷蔵庫に「${name}」を追加しました！`;
    }

    if (toolCall.toolName === "navigatePage") {
      const args = toolCall.args || {};
      const { path } = args;
      router.push(path);
      setIsOpen(false);
      responseText = `対象ページへ移動しました。`;
    }

    if (responseText) {
      setTimeout(() => {
        setMessages((msgs) => [
          ...msgs,
          { id: Date.now().toString(), role: "assistant", content: responseText }
        ]);
      }, 500);
    }
  }, [setShopping, addOrUpdateItem, setToast, router, setIsOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "チャット送信に失敗しました");
      }

      if (!res.body) {
        throw new Error("レスポンスボディがありません");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      const assistantMessageId = (Date.now() + 1).toString();

      // アシスタントメッセージを追加（空の状態で）
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      let toolCalls: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          // テキストチャンク (0:...)
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2));
              accumulatedContent += text;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            } catch (e) {
              console.error("[Chat] Failed to parse text chunk:", line);
            }
          }
          // ツール呼び出し (1:...)
          else if (line.startsWith('1:')) {
            try {
              const toolCall = JSON.parse(line.slice(2));
              toolCalls.push(toolCall);
            } catch (e) {
              console.error("[Chat] Failed to parse tool call:", line);
            }
          }
          // 完了 (2:...)
          else if (line.startsWith('2:')) {
            // ストリーム完了
            for (const tc of toolCalls) {
              await handleToolCall(tc);
            }
          }
        }
      }

      // クォータ更新
      try {
        const quotaRes = await fetch("/api/chat/food");
        if (quotaRes.ok) {
          const data = await quotaRes.json();
          setQuota(data.quota);
        }
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error("[Chat] Error:", err);
      setError(err.message || "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const isQuotaExhausted = quota?.remaining === 0;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] overflow-hidden"
            style={{ maxHeight: "400px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--surface-border)] bg-[var(--card-bg)]">
              <div className="flex items-center gap-2">
                <div className="bg-[var(--accent)] text-white p-1.5 rounded-full">
                  <Bot size={16} />
                </div>
                <span className="font-bold text-sm text-[var(--color-text-primary)]">キッチンアシスタント</span>
                {quota && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    quota.remaining <= 2
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    残り{quota.remaining}回
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                title="閉じる"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[200px] max-h-[300px]">
              {messages.map((m: any) => (
                <div
                  key={m.id}
                  className={`flex gap-2 max-w-[90%] ${
                    m.role === "user" ? "self-end flex-row-reverse" : "self-start"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      m.role === "user" ? "bg-slate-200 dark:bg-slate-700" : "bg-[var(--accent)] text-white"
                    }`}
                  >
                    {m.role === "assistant" && <ChefHat size={12} />}
                  </div>
                  <div
                    className={`px-3 py-2 text-sm rounded-xl ${
                      m.role === "user"
                        ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-tr-none"
                        : "background-[var(--surface-bg)] text-[var(--color-text-primary)] border border-[var(--surface-border)] rounded-tl-none shadow-sm"
                    }`}
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {m.parts ? m.parts.map((p: any) => p.text).join("") : (m as any).text || (m as any).content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="self-start flex gap-2 max-w-[90%]">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-[var(--accent)] text-white">
                    <ChefHat size={12} />
                  </div>
                  <div className="px-3 py-2.5 text-sm rounded-xl rounded-tl-none background-[var(--surface-bg)] border border-[var(--surface-border)] flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Display */}
            {error && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 border-t border-red-100 dark:border-red-900/30">
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {error}
                </p>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--surface-border)] bg-[var(--card-bg)]">
              {isQuotaExhausted ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <AlertCircle size={16} />
                  <span>本日の上限（5回）に達しました</span>
                </div>
              ) : (
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={quota && quota.remaining <= 2 ? `残り${quota.remaining}回です...` : "質問を入力..."}
                    className="w-full pl-3 pr-10 py-2 text-sm rounded-full bg-[var(--background)] border border-[var(--surface-border)] focus:outline-none focus:border-[var(--accent)] text-[var(--color-text-primary)]"
                    disabled={isLoading || isQuotaExhausted}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim() || isQuotaExhausted}
                    className="absolute right-1 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--accent)] text-white disabled:opacity-50 transition-opacity"
                  >
                    <Send size={14} className={inputValue.trim() ? "translate-x-[-1px]" : ""} />
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 left-4 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95"
        style={{
          background: "var(--accent)",
          color: "#fff",
        }}
        title="AIアシスタントに相談"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </>
  );
}
