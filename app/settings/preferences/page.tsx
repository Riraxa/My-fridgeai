//app/settings/preferences/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ShieldCheck,
  Heart,
  Clock,
  BarChart3,
  MessageSquare,
  AlertTriangle,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAutoSave, SaveState } from "@/app/hooks/useAutoSave";

// Simple custom debounce hook
function useDebounce<T extends unknown[]>(callback: (...args: T) => void, delay: number) {
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: T) => {
      if (timer) clearTimeout(timer);
      const newTimer = setTimeout(() => callback(...args), delay);
      setTimer(newTimer);
    },
    [callback, delay, timer],
  );
}

type Tab = "basic" | "safety" | "taste" | "lifestyle" | "genre" | "pro";

const SUB_TABS: { id: Tab; label: string }[] = [
  { id: "basic", label: "基本" },
  { id: "safety", label: "安全" },
  { id: "taste", label: "味" },
  { id: "lifestyle", label: "生活" },
  { id: "genre", label: "ジャンル" },
  { id: "pro", label: "AI指示" },
];

export default function EnhancedPreferencesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  // Independent AI context states
  const [freeText, setFreeText] = useState("");
  const [serverFreeText, setServerFreeText] = useState("");
  const [aiMessageEnabled, setAiMessageEnabled] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [toggleSaveState, setToggleSaveState] = useState<"idle" | "saved" | "error">("idle");

  // States for different sections
  const [preferences, setPreferences] = useState<{
    cookingSkill: string;
    comfortableMethods: string[];
    avoidMethods: string[];
    kitchenEquipment: string[];
  }>({
    cookingSkill: "intermediate",
    comfortableMethods: [],
    avoidMethods: [],
    kitchenEquipment: [],
  });

  const [safety, setSafety] = useState<{
    allergies: Array<{ id: string; name: string; severity: "mild" | "moderate" | "severe" }>;
    restrictions: Array<{ id: string; name: string; type: string; note?: string }>;
  }>({
    allergies: [],
    restrictions: [],
  });

  const [taste, setTaste] = useState({
    tasteScores: {} as Record<string, number>,
    lifestyle: {
      weekdayMode: {
        timePriority: "normal",
        dishwashingAvoid: false,
        singlePan: false,
      },
      weekendMode: {
        timePriority: "normal",
        dishwashingAvoid: false,
        singlePan: false,
      },
    },
    freeText: "",
  });

  const [genrePenalty, setGenrePenalty] = useState<Record<string, number>>({});

  // Constants
  const methods = ["炒め物", "煮物", "焼き物", "揚げ物", "蒸し物", "和え物"];
  const equipment = [
    "ガスコンロ",
    "電子レンジ",
    "オーブン",
    "圧力鍋",
    "トースター",
    "炊飯器",
  ];
  const tasteKeys = [
    { key: "garlic", label: "にんにく" },
    { key: "spicy", label: "辛味" },
    { key: "sweet", label: "甘味" },
    { key: "salty", label: "塩気" },
    { key: "sour", label: "酸味" },
  ];
  const genres = [
    "和食",
    "洋食",
    "中華",
    "イタリアン",
    "フレンチ",
    "カレー",
    "パスタ",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prefsRes, safetyRes, tasteRes, userRes] = await Promise.all([
          fetch("/api/settings/preferences"),
          fetch("/api/preferences/safety"),
          fetch("/api/preferences/taste"),
          fetch("/api/user/me"), // Plan check
        ]);

        const prefsData = await prefsRes.json();
        const safetyData = await safetyRes.json();
        const tasteData = await tasteRes.json();
        const userData = await userRes.json();

        if (!prefsData || !tasteData) throw new Error("Invalid data received");

        // Initialize AI context states from server
        const initialFreeText = tasteData.freeText ?? "";
        setFreeText(initialFreeText);
        setServerFreeText(initialFreeText);
        // 1. Precise normalization - only extract fields we manage in state
        const normalizedPrefs = {
          cookingSkill: prefsData.preferences?.cookingSkill || "intermediate",
          comfortableMethods: Array.isArray(prefsData.preferences?.comfortableMethods) ? prefsData.preferences.comfortableMethods : [],
          avoidMethods: Array.isArray(prefsData.preferences?.avoidMethods) ? prefsData.preferences.avoidMethods : [],
          kitchenEquipment: Array.isArray(prefsData.preferences?.kitchenEquipment) ? prefsData.preferences.kitchenEquipment : [],
        };

        const normalizedTaste = {
          tasteScores: tasteData.tasteScores ?? {},
          lifestyle: {
            weekdayMode: tasteData.lifestyle?.weekdayMode ?? {
              timePriority: "normal",
              dishwashingAvoid: false,
              singlePan: false,
            },
            weekendMode: tasteData.lifestyle?.weekendMode ?? {
              timePriority: "normal",
              dishwashingAvoid: false,
              singlePan: false,
            },
          },
          freeText: tasteData.freeText ?? "",
        };

        const nextGenrePenalty = tasteData.recentGenrePenalty || {};

        // 2. Set all states simultaneously
        const nextAiMessageEnabled = prefsData.preferences?.aiMessageEnabled ?? false;
        setPreferences(normalizedPrefs);
        setTaste(normalizedTaste);
        setGenrePenalty(nextGenrePenalty);
        setAiMessageEnabled(nextAiMessageEnabled);
        setSafety({
          allergies: safetyData.allergies ?? [],
          restrictions: safetyData.restrictions ?? [],
        });
        setIsPro(userData.user?.plan === "PRO");

        // 3. Set the baseline for comparison
        setInitialData(
          JSON.stringify({
            preferences: normalizedPrefs,
            taste: normalizedTaste,
            genrePenalty: nextGenrePenalty,
            aiMessageEnabled: nextAiMessageEnabled,
          }),
        );
      } catch (e) {
        console.error("Failed to fetch preferences", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const _debouncedSaveTaste = useDebounce<[typeof taste]>(async (newData) => {
    await fetch("/api/preferences/taste", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newData),
    });
  }, 1000);

  const handleTasteChange = (updates: Partial<typeof taste>) => {
    const newTaste = { ...taste, ...updates };
    setTaste(newTaste);
    // debouncedSaveTaste is now handled by generalized auto-save
  };

  const addAllergy = async (allergen: string) => {
    const res = await fetch("/api/preferences/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "allergy", allergen, label: allergen }),
    });
    if (res.ok) {
      const added = await res.json();
      setSafety((prev) => ({
        ...prev,
        allergies: [...(prev.allergies ?? []), added],
      }));
    }
  };

  const addRestriction = async (restrictionType: string, note: string) => {
    const res = await fetch("/api/preferences/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "restriction", restrictionType, note }),
    });
    if (res.ok) {
      const added = await res.json();
      setSafety((prev) => ({
        ...prev,
        restrictions: [...(prev.restrictions ?? []), added],
      }));
    }
  };

  const removeSafetyItem = async (id: string) => {
    const res = await fetch(`/api/preferences/safety/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSafety((prev) => ({
        allergies: (prev.allergies ?? []).filter((a) => a.id !== id),
        restrictions: (prev.restrictions ?? []).filter((r) => r.id !== id),
      }));
    }
  };

  // Logic for individual auto-save style (Global preferences)
  const [initialData, setInitialData] = useState<string>("");

  const handleGlobalAutoSave = useCallback(
    async (value: string, signal: AbortSignal) => {
      const data = JSON.parse(value);

      // Safety check: ensure we are not saving empty data
      if (!data.preferences || !data.taste || loading) return;

      const responses = await Promise.all([
        fetch("/api/settings/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data.preferences,
            aiMessageEnabled: data.aiMessageEnabled,
          }),
          signal,
        }),
        fetch("/api/preferences/taste", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.taste),
          signal,
        }),
        fetch("/api/preferences/genre", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recentGenrePenalty: data.genrePenalty }),
          signal,
        }),
      ]);

      // Verify all requests succeeded
      for (const res of responses) {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "保存に失敗しました");
        }
      }
    },
    [loading],
  );

  const [readyToSave, setReadyToSave] = useState(false);
  useEffect(() => {
    if (!loading && initialData) {
      const timer = setTimeout(() => setReadyToSave(true), 500);
      return () => clearTimeout(timer);
    }
    return;
  }, [loading, initialData]);

  const {
    saveState: globalSaveState,
    errorMessage: globalSaveError,
    retry: retryGlobalSave,
  } = useAutoSave(
    !readyToSave ? "" : JSON.stringify({ preferences, taste, genrePenalty, aiMessageEnabled }),
    !readyToSave ? "" : initialData,
    {
      debounceMs: 1500,
      savedDisplayMs: 2000,
      onSave: handleGlobalAutoSave,
    },
  );

  const renderGlobalSaveIndicator = (state: SaveState, error: string | null) => {
    switch (state) {
      case "dirty":
        return (
          <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            未保存の変更あり
          </span>
        );
      case "saving":
        return (
          <span className="flex items-center gap-1 text-xs text-indigo-500 font-medium">
            <Loader2 size={12} className="animate-spin" />
            保存中...
          </span>
        );
      case "error":
        return (
          <button
            onClick={retryGlobalSave}
            className="flex items-center gap-1 text-xs text-red-500 font-medium hover:underline"
          >
            <AlertCircle size={12} />
            {error || "保存失敗"} - タップで再試行
          </button>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Check size={12} />
            保存しました
          </span>
        );
      default: // idle
        return (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Check size={12} />
            保存済み
          </span>
        );
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        読み込み中...
      </div>
    );

  return (
    <main className="pb-24 px-4 w-full">
      {/* Header with Title */}
      <div className="flex justify-between items-center mb-6">
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          料理の好み
        </h2>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex gap-6 border-b border-[var(--surface-border)] mb-8 px-2 overflow-x-auto no-scrollbar scroll-smooth">
        {SUB_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 text-sm font-bold transition-all duration-200 whitespace-nowrap ${isActive
                ? "text-indigo-500"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="activeSubTabLine"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "basic" && (
            <div className="space-y-8">
              <section
                className="p-6 rounded-3xl shadow-sm"
                style={{
                  background: "var(--surface-bg)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                <h2
                  className="text-base font-bold mb-4 flex items-center gap-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <BarChart3 size={20} className="text-indigo-500" />{" "}
                  料理スキル
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {["beginner", "intermediate", "advanced"].map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setPreferences({ ...preferences, cookingSkill: s })
                      }
                      className={`py-3 rounded-2xl text-xs font-bold border transition ${preferences.cookingSkill === s
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                    >
                      {s === "beginner"
                        ? "初心者"
                        : s === "intermediate"
                          ? "中級者"
                          : "上級者"}
                    </button>
                  ))}
                </div>
              </section>

              <section
                className="p-6 rounded-3xl shadow-sm"
                style={{
                  background: "var(--surface-bg)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                <h2
                  className="text-base font-bold mb-4 flex items-center gap-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <Heart size={20} className="text-pink-500" /> 得意な調理法
                </h2>
                <div className="flex flex-wrap gap-2">
                  {methods.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        const currentList =
                          preferences.comfortableMethods ?? [];
                        const list = [...currentList];
                        const i = list.indexOf(m);
                        if (i >= 0) list.splice(i, 1);
                        else list.push(m);
                        setPreferences({
                          ...preferences,
                          comfortableMethods: list,
                        });
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${(preferences.comfortableMethods ?? []).includes(m)
                        ? "bg-green-100 border-green-200 text-green-700"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </section>

              <section
                className="p-6 rounded-3xl shadow-sm"
                style={{
                  background: "var(--surface-bg)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                <h2
                  className="text-base font-bold mb-4 flex items-center gap-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <ShieldCheck size={20} className="text-indigo-500" />{" "}
                  利用可能な設備
                </h2>
                <div className="flex flex-wrap gap-2">
                  {equipment.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        const currentList =
                          preferences.kitchenEquipment ?? [];
                        const list = [...currentList];
                        const i = list.indexOf(e);
                        if (i >= 0) list.splice(i, 1);
                        else list.push(e);
                        setPreferences({
                          ...preferences,
                          kitchenEquipment: list,
                        });
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${(preferences.kitchenEquipment ?? []).includes(e)
                        ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </section>

              {/* Status Indicator */}
              <div className="flex justify-start px-2 mt-4">
                {renderGlobalSaveIndicator(globalSaveState, globalSaveError)}
              </div>
            </div>
          )}

          {activeTab === "safety" && (
            <div className="space-y-6">
              <section
                className="p-6 rounded-3xl shadow-sm"
                style={{
                  background: "var(--surface-bg)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                <h2
                  className="text-base font-bold mb-4 flex items-center gap-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <AlertTriangle size={20} className="text-red-500" />{" "}
                  アレルギー
                </h2>
                <div className="mb-4">
                  <p className="text-xs text-slate-500 mb-3 px-1">
                    ※食事に関するアレルギー食材を入力してください（例：卵、小麦、乳製品、えび、かに）
                  </p>
                  <p className="text-xs text-slate-400 mb-3 px-1">
                    食事に関係ないアレルギーは入力しないでください。
                  </p>
                </div>
                <div className="mb-6 flex flex-wrap gap-2">
                  {(safety.allergies ?? []).map((a) => (
                    <div
                      key={a.id}
                      className="bg-red-50 border border-red-100 px-3 py-1.5 rounded-full flex items-center gap-2 text-red-700 text-sm font-medium"
                    >
                      {a.name}
                      <button
                        onClick={() => removeSafetyItem(a.id)}
                        className="hover:bg-red-200 rounded-full p-0.5 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="食事アレルギーのある食材名を入力（例：たまご、えび、牡蠣）"
                    className="w-full rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
                    style={{
                      background: "var(--surface-bg)",
                      border: "1px solid var(--surface-border)",
                      color: "var(--color-text-primary)",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addAllergy(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input =
                        e.currentTarget.parentElement?.querySelector("input");
                      if (input?.value.trim()) {
                        addAllergy(input.value.trim());
                        input.value = "";
                      }
                    }}
                    className="absolute right-3 top-2.5 bg-red-500 text-white p-1 rounded-lg"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 px-1">
                  ※登録された食材は献立に含まれなくなります。追加時に確認モーダルは将来実装予定。
                </p>
              </section>

              <section
                className={`p-6 rounded-3xl shadow-sm overflow-hidden relative ${!isPro ? "min-h-[400px]" : ""}`}
                style={{
                  background: "var(--surface-bg)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                {!isPro && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-amber-500 text-white p-4 rounded-3xl mb-4 shadow-xl shadow-amber-100">
                      <ShieldCheck size={32} />
                    </div>
                    <h3
                      className="text-lg font-extrabold mb-2"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      食事制限の設定
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                      ベジタリアン、低塩分、減塩などの食事制限を細かく設定して、より健康的な献立を作成できます。
                    </p>
                    <button
                      onClick={() => router.push("/settings/account")}
                      className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-amber-100 hover:scale-105 active:scale-95 transition"
                    >
                      Proにアップグレード
                    </button>
                  </div>
                )}
                <h2
                  className="text-base font-bold mb-4 flex items-center gap-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <ShieldCheck size={20} className="text-amber-500" />{" "}
                  食事制限
                </h2>
                <div className="space-y-2">
                  {(safety.restrictions ?? []).map((r) => (
                    <div
                      key={r.id}
                      className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex justify-between items-center"
                    >
                      <div>
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                          {r.type}
                        </span>
                        <p className="text-sm text-slate-700">{r.note}</p>
                      </div>
                      <button
                        onClick={() => removeSafetyItem(r.id)}
                        className="text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <div className="mt-4">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="制限タイプ（例：ベジタリアン、低塩分）"
                        className="flex-1 rounded-2xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition"
                        style={{
                          background: "var(--surface-bg)",
                          border: "1px solid var(--surface-border)",
                          color: "var(--color-text-primary)",
                        }}
                        id="restriction-type"
                      />
                      <input
                        type="text"
                        placeholder="詳細メモ（最大100文字）"
                        className="flex-2 rounded-2xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition"
                        style={{
                          background: "var(--surface-bg)",
                          border: "1px solid var(--surface-border)",
                          color: "var(--color-text-primary)",
                        }}
                        id="restriction-note"
                        maxLength={100}
                      />
                      <button
                        onClick={() => {
                          const typeInput = document.getElementById(
                            "restriction-type",
                          ) as HTMLInputElement;
                          const noteInput = document.getElementById(
                            "restriction-note",
                          ) as HTMLInputElement;
                          if (typeInput && typeInput.value.trim()) {
                            addRestriction(
                              typeInput.value.trim(),
                              noteInput?.value.trim() || "",
                            );
                            typeInput.value = "";
                            if (noteInput) noteInput.value = "";
                          }
                        }}
                        className="bg-amber-500 text-white p-2 rounded-lg hover:bg-amber-600 transition"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Status Indicator */}
              <div className="flex justify-start px-2 mt-4">
                {renderGlobalSaveIndicator(globalSaveState, globalSaveError)}
              </div>
            </div>
          )}

          {activeTab === "taste" && (
            <section
              className="p-6 rounded-3xl shadow-sm space-y-8"
              style={{
                background: "var(--surface-bg)",
                border: "1px solid var(--surface-border)",
              }}
            >
              <h2
                className="text-base font-bold mb-2 flex items-center gap-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                <Heart size={20} className="text-pink-500" /> 味の好み
              </h2>
              {tasteKeys.map((item) => {
                const score = taste.tasteScores?.[item.key] || 0;
                return (
                  <div key={item.key} className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label
                        className="text-sm font-bold"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {item.label}
                      </label>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${score === 2
                          ? "bg-indigo-100 text-indigo-700"
                          : score === -2
                            ? "bg-slate-200 text-slate-600"
                            : "bg-slate-50 text-slate-500"
                          }`}
                      >
                        {score === -2
                          ? "大の苦手"
                          : score === -1
                            ? "苦手"
                            : score === 0
                              ? "普通"
                              : score === 1
                                ? "好き"
                                : "大好き"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="1"
                      value={score}
                      onChange={(e) =>
                        handleTasteChange({
                          tasteScores: {
                            ...(taste.tasteScores ?? {}),
                            [item.key]: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor: "var(--accent)" }}
                    />
                  </div>
                );
              })}

              {/* Status Indicator */}
              <div className="flex justify-start px-2 mt-6">
                {renderGlobalSaveIndicator(globalSaveState, globalSaveError)}
              </div>
            </section>
          )}

          {activeTab === "lifestyle" && (
            <div className="space-y-6">
              {["weekdayMode", "weekendMode"].map((mode) => (
                <section
                  key={mode}
                  className="p-6 rounded-3xl shadow-sm"
                  style={{
                    background: "var(--surface-bg)",
                    border: "1px solid var(--surface-border)",
                  }}
                >
                  <h2
                    className="text-base font-bold mb-6 flex items-center gap-2"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    <Clock size={20} className="text-indigo-500" />{" "}
                    {mode === "weekdayMode" ? "平日モード" : "休日モード"}
                  </h2>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <label
                        className="text-sm font-medium"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        時間優先度
                      </label>
                      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        {(["short", "normal", "long"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() =>
                              handleTasteChange({
                                lifestyle: {
                                  ...(taste.lifestyle ?? {}),
                                  [mode]: {
                                    ...(taste.lifestyle[mode as keyof typeof taste.lifestyle] ?? {}),
                                    timePriority: p,
                                  },
                                },
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${(taste.lifestyle[mode as keyof typeof taste.lifestyle] ?? {})
                              ?.timePriority === p
                              ? "bg-white text-indigo-600 shadow-sm"
                              : "text-slate-400"
                              }`}
                          >
                            {p === "short"
                              ? "時短"
                              : p === "normal"
                                ? "普通"
                                : "じっくり"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <label
                        className="text-sm font-medium"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        洗い物を最小限に
                      </label>
                      <button
                        onClick={() =>
                          handleTasteChange({
                            lifestyle: {
                              ...(taste.lifestyle ?? {}),
                              [mode]: {
                                ...(taste.lifestyle[mode as keyof typeof taste.lifestyle] ?? {}),
                                dishwashingAvoid: !(
                                  (taste.lifestyle[mode as keyof typeof taste.lifestyle] ?? {})
                                ).dishwashingAvoid,
                              },
                            },
                          })
                        }
                        className={`w-12 h-6 rounded-full transition relative ${(taste.lifestyle[mode as keyof typeof taste.lifestyle] ?? {}).dishwashingAvoid ? "bg-indigo-600" : "bg-slate-300"}`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition ${(taste.lifestyle[mode as keyof typeof taste.lifestyle] ?? {}).dishwashingAvoid ? "translate-x-6" : ""}`}
                        />
                      </button>
                    </div>
                  </div>
                </section>
              ))}

              {/* Status Indicator */}
              <div className="flex justify-start px-2 mt-4">
                {renderGlobalSaveIndicator(globalSaveState, globalSaveError)}
              </div>
            </div>
          )}

          {activeTab === "genre" && (
            <section
              className="p-6 rounded-3xl shadow-sm"
              style={{
                background: "var(--surface-bg)",
                border: "1px solid var(--surface-border)",
              }}
            >
              <h2
                className="text-base font-bold mb-6 flex items-center gap-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                <BarChart3 size={20} className="text-indigo-500" />{" "}
                ジャンルの優先度
              </h2>
              <p
                className="text-xs mb-8 px-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                スライダーを右に振るとそのジャンルが優先され、左に振ると提案されにくくなります。
              </p>
              <div className="space-y-6">
                {genres.map((g) => {
                  const val = genrePenalty[g] || 0;
                  return (
                    <div key={g} className="flex items-center gap-4">
                      <span
                        className="w-16 text-sm font-medium"
                        style={{
                          color:
                            val > 0
                              ? "var(--accent)"
                              : val < 0
                                ? "var(--color-text-muted)"
                                : "var(--color-text-secondary)",
                        }}
                      >
                        {g}
                      </span>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.1"
                        value={val}
                        onChange={(e) =>
                          setGenrePenalty({
                            ...genrePenalty,
                            [g]: parseFloat(e.target.value),
                          })
                        }
                        className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: "var(--accent)" }}
                      />
                      <span
                        className="w-8 text-[10px] tabular-nums font-mono text-right"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status Indicator */}
              <div className="flex justify-start px-2 mt-4">
                {renderGlobalSaveIndicator(globalSaveState, globalSaveError)}
              </div>
            </section>
          )}

          {activeTab === "pro" && (
            <ProTabContent
              isPro={isPro}
              router={router}
              freeText={freeText}
              setFreeText={setFreeText}
              serverFreeText={serverFreeText}
              setServerFreeText={setServerFreeText}
              aiMessageEnabled={aiMessageEnabled}
              setAiMessageEnabled={setAiMessageEnabled}
              toggleSaving={toggleSaving}
              setToggleSaving={setToggleSaving}
              toggleSaveState={toggleSaveState}
              setToggleSaveState={setToggleSaveState}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

// ─── ProTabContent (Independent component) ───────────────────────────────

interface ProTabContentProps {
  isPro: boolean;
  router: ReturnType<typeof import("next/navigation").useRouter>;
  freeText: string;
  setFreeText: (v: string) => void;
  serverFreeText: string;
  setServerFreeText: (v: string) => void;
  aiMessageEnabled: boolean;
  setAiMessageEnabled: (v: boolean) => void;
  toggleSaving: boolean;
  setToggleSaving: (v: boolean) => void;
  toggleSaveState: "idle" | "saved" | "error";
  setToggleSaveState: (v: "idle" | "saved" | "error") => void;
}

function ProTabContent({
  isPro,
  router,
  freeText,
  setFreeText,
  serverFreeText,
  setServerFreeText,
  aiMessageEnabled,
  setAiMessageEnabled,
  toggleSaving,
  setToggleSaving,
  toggleSaveState,
  setToggleSaveState,
}: ProTabContentProps) {
  // Auto-save for freeText (independent state machine)
  const handleSaveFreeText = useCallback(
    async (value: string, signal: AbortSignal) => {
      const res = await fetch("/api/preferences/free-text", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeText: value }),
        signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存に失敗しました");
      }
      setServerFreeText(value);
    },
    [setServerFreeText],
  );

  const { saveState, errorMessage, retry } = useAutoSave(
    freeText,
    serverFreeText,
    {
      debounceMs: 1500,
      savedDisplayMs: 1000,
      onSave: handleSaveFreeText,
    },
  );

  // Toggle save handler (independent state machine)
  const handleToggle = useCallback(
    async (newValue: boolean) => {
      setAiMessageEnabled(newValue);
      setToggleSaving(true);
      setToggleSaveState("idle");
      try {
        const res = await fetch("/api/settings/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiMessageEnabled: newValue }),
        });

        if (!res.ok) throw new Error("保存に失敗しました");
        setToggleSaveState("saved");
        setTimeout(() => setToggleSaveState("idle"), 1000);
      } catch {
        setAiMessageEnabled(!newValue); // revert
        setToggleSaveState("error");
        setTimeout(() => setToggleSaveState("idle"), 3000);
      } finally {
        setToggleSaving(false);
      }
    },
    [setAiMessageEnabled, setToggleSaving, setToggleSaveState],
  );

  // Save state indicator renderer
  const renderSaveIndicator = (state: SaveState, error: string | null) => {
    switch (state) {
      case "dirty":
        return (
          <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            未保存の変更あり
          </span>
        );
      case "saving":
        return (
          <span className="flex items-center gap-1 text-xs text-indigo-500 font-medium">
            <Loader2 size={12} className="animate-spin" />
            保存中...
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Check size={12} />
            保存しました
          </span>
        );
      case "error":
        return (
          <button
            onClick={retry}
            className="flex items-center gap-1 text-xs text-red-500 font-medium hover:underline"
          >
            <AlertCircle size={12} />
            {error || "保存失敗"} - タップで再試行
          </button>
        );
      default: // idle or saved
        return (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Check size={12} />
            保存済み
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle Section */}
      <section
        className="p-6 rounded-3xl shadow-sm overflow-hidden relative"
        style={{
          background: "var(--surface-bg)",
          border: "1px solid var(--surface-border)",
        }}
      >
        {!isPro && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-indigo-600 text-white p-4 rounded-3xl mb-4 shadow-xl shadow-indigo-100">
              <MessageSquare size={32} />
            </div>
            <h3
              className="text-lg font-extrabold mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              AI個別指示
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              「子供が食べやすい味」や「包丁を使わない手順」など、AIに個別のわがままを伝えることができます。
            </p>
            <button
              onClick={() => router.push("/settings/account")}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition"
            >
              Proにアップグレード
            </button>
          </div>
        )}

        {/* AI Message Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare size={20} className="text-indigo-500" />
            <div>
              <h2
                className="text-base font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                AIへの伝言を有効にする
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                有効にすると、下記の内容がAIの献立提案に反映されます
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {toggleSaveState === "saved" && (
              <Check size={14} className="text-emerald-500" />
            )}
            {toggleSaveState === "error" && (
              <AlertCircle size={14} className="text-red-500" />
            )}
            <button
              onClick={() => handleToggle(!aiMessageEnabled)}
              disabled={toggleSaving}
              className="transition disabled:opacity-50"
              aria-label="AI指示を有効にする"
            >
              {aiMessageEnabled ? (
                <ToggleRight size={36} className="text-indigo-600" />
              ) : (
                <ToggleLeft size={36} className="text-slate-300" />
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div
          className="border-t mb-6"
          style={{ borderColor: "var(--surface-border)" }}
        />

        {/* Textarea */}
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value.slice(0, 300))}
          placeholder="例：平日は帰宅が遅いので包丁を使わないレシピを優先してください。子供がいるので辛いものは避けてください。"
          className={`w-full h-48 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none ${!aiMessageEnabled ? "opacity-50" : ""
            }`}
          style={{
            background: "var(--surface-bg)",
            border: `1px solid ${saveState === "error"
              ? "#ef4444"
              : saveState === "dirty"
                ? "#f59e0b"
                : "var(--surface-border)"
              }`,
            color: "var(--color-text-primary)",
          }}
        />

        {/* Footer: Character count + Save indicator */}
        <div className="flex justify-between items-center mt-2 px-1">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400">※最大300文字</span>
            {renderSaveIndicator(saveState, errorMessage)}
          </div>
          <span
            className={`text-[10px] font-bold ${freeText.length > 280 ? "text-red-500" : "text-slate-400"
              }`}
          >
            {freeText.length}/300
          </span>
        </div>
      </section>
    </div>
  );
}
