//app/components/SupportForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNativeSelect } from "@/app/hooks/useNativeSelect";

const supportSchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  subject: z.string().min(5, "件名は5文字以上で入力してください").max(200, "件名は200文字以内で入力してください"),
  description: z.string().min(10, "内容は10文字以上で入力してください").max(5000, "内容は5000文字以内で入力してください"),
});

type SupportFormData = z.infer<typeof supportSchema>;

export default function SupportForm() {
  const { getSelectClassName } = useNativeSelect();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupportFormData>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      type: "bug",
      subject: "",
      description: "",
    },
  });

  const [message, setMessage] = useState("");

  const onSubmit = async (data: SupportFormData) => {
    setMessage("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          screenshotBase64: null,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error ?? "送信エラー");
      }

      setMessage(result.message);
      reset();
    } catch (err: any) {
      setMessage(`エラー: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-24 px-4">
      <h2 className="text-xl font-bold mb-4">お問い合わせ</h2>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
        バグの報告や機能の提案、その他のお問い合わせはこちらから送信してください。
      </p>

      {/* フォーム枠 */}
      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 種類 */}
          <div>
            <label className="block text-sm font-medium mb-1">種類</label>
            <select
              {...register("type")}
              className={getSelectClassName()}
            >
              <option value="bug">バグ報告</option>
              <option value="feature">機能提案</option>
              <option value="other">その他</option>
            </select>
          </div>

          {/* 件名 */}
          <div>
            <label className="block text-sm font-medium mb-1">件名</label>
            <input
              type="text"
              {...register("subject")}
              className="input"
            />
            {errors.subject && (
              <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>
            )}
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium mb-1">内容</label>
            <textarea
              rows={5}
              {...register("description")}
              className="input"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="continue-btn w-full"
          >
            {isSubmitting ? "送信中..." : "送信する"}
          </button>

          {/* メッセージ */}
          {message && (
            <p
              className="mt-4 text-sm"
              style={{
                color: message.includes("エラー") ? "#ef4444" : "var(--accent)",
              }}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
