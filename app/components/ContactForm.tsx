//app/components/ContactForm.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNativeSelect } from "@/app/hooks/useNativeSelect";

const contactSchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  subject: z.string().min(5, "件名は5文字以上で入力してください").max(200, "件名は200文字以内で入力してください"),
  description: z.string().min(10, "内容は10文字以上で入力してください").max(5000, "内容は5000文字以内で入力してください"),
  name: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください").optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactForm() {
  const { getSelectClassName } = useNativeSelect();
  const { data: session } = useSession();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      type: "bug",
      subject: "",
      description: "",
      name: "",
      email: "",
    },
  });

  const [message, setMessage] = useState("");

  const onSubmit = async (data: ContactFormData) => {
    // Email validation for non-logged in users
    if (!session?.user && !data.email) {
      setError("email", { message: "メールアドレスを入力してください" });
      return;
    }

    setMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          userId: session?.user?.id || null,
          userName: session?.user?.name || data.name,
          userEmail: session?.user?.email || data.email,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "送信に失敗しました");
      }

      setMessage("お問い合わせを受け付けました。ありがとうございます。");
      reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "送信に失敗しました");
    }
  };

  return (
    <div className="bg-[var(--background)] border border-[var(--surface-border)] rounded-2xl p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* User Info Section */}
        {session?.user ? (
          <div className="bg-[var(--semantic-indigo-bg)] p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-[var(--semantic-indigo)] mb-2">
              ログイン中のユーザー情報
            </h3>
            <div className="text-sm text-[var(--color-text-secondary)]">
              <p>ユーザー名: {session.user.name}</p>
              <p>メールアドレス: {session.user.email}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                氏名（任意）
              </label>
              <input
                type="text"
                id="name"
                {...register("name")}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-[var(--surface-bg)] text-[var(--color-text-primary)]"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                {...register("email")}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-[var(--surface-bg)] text-[var(--color-text-primary)] ${
                  errors.email
                    ? "border-red-500 dark:border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Contact Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            お問い合わせ種別
          </label>
          <select
            id="type"
            {...register("type")}
            className={getSelectClassName("w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-[var(--surface-bg)] text-[var(--color-text-primary)]")}
          >
            <option value="bug">バグ報告</option>
            <option value="feature">機能要望</option>
            <option value="other">その他</option>
          </select>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            件名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="subject"
            {...register("subject")}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-[var(--surface-bg)] text-[var(--color-text-primary)] ${
              errors.subject
                ? "border-red-500 dark:border-red-500"
                : "border-slate-300 dark:border-slate-700"
            }`}
            placeholder="件名を入力してください"
          />
          {errors.subject && (
            <p className="mt-1 text-sm text-red-500">{errors.subject.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            {...register("description")}
            rows={8}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-[var(--surface-bg)] text-[var(--color-text-primary)] resize-vertical ${
              errors.description
                ? "border-red-500 dark:border-red-500"
                : "border-slate-300 dark:border-slate-700"
            }`}
            placeholder="詳細な内容を入力してください"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isSubmitting ? "送信中..." : "送信する"}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes("受け付けました")
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}>
            {message}
          </div>
        )}

        {/* Privacy Notice */}
        <div className="text-xs text-[var(--color-text-muted)]">
          <p>
            送信いただいた内容は、問題解決やサービス改善のためにのみ使用いたします。
            個人情報の取り扱いについては、
            <Link href="/privacy" className="text-[var(--semantic-indigo)] hover:underline">
              プライバシーポリシー
            </Link>
            をご確認ください。
          </p>
        </div>
      </form>
    </div>
  );
}
