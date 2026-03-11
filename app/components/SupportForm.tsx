//app/components/SupportForm.tsx
"use client";

import { useState } from "react";
import { useNativeSelect } from "@/app/hooks/useNativeSelect";

export default function SupportForm() {
  const { getSelectClassName } = useNativeSelect();
  const [formData, setFormData] = useState({
    type: "bug", // bug, feature, other
    subject: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          screenshotBase64: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "送信エラー");
      }

      setMessage(data.message);
      setFormData({ type: "bug", subject: "", description: "" });
    } catch (err: any) {
      setMessage(`エラー: ${err.message}`);
    } finally {
      setLoading(false);
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 種類 */}
          <div>
            <label className="block text-sm font-medium mb-1">種類</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
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
              required
              minLength={5}
              maxLength={200}
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="input"
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium mb-1">内容</label>
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input"
            />
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="continue-btn w-full"
          >
            {loading ? "送信中..." : "送信する"}
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
