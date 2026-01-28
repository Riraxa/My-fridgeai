"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Save,
  Check,
  ShieldCheck,
  Heart,
  Clock,
  BarChart3,
  MessageSquare,
  AlertTriangle,
  Trash2,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Simple custom debounce hook
function useDebounce(callback: Function, delay: number) {
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: any[]) => {
      if (timer) clearTimeout(timer);
      const newTimer = setTimeout(() => callback(...args), delay);
      setTimer(newTimer);
    },
    [callback, delay, timer],
  );
}

type Tab = "basic" | "safety" | "taste" | "lifestyle" | "genre" | "pro";

export default function EnhancedPreferencesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPro, setIsPro] = useState(false);

  // States for different sections
  const [preferences, setPreferences] = useState({
    cookingSkill: "intermediate",
    comfortableMethods: [] as string[],
    avoidMethods: [] as string[],
    kitchenEquipment: [] as string[],
  });

  const [safety, setSafety] = useState({
    allergies: [] as any[],
    restrictions: [] as any[],
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

        if (prefsData.preferences) setPreferences(prefsData.preferences);
        setSafety(safetyData);
        setTaste((prev) => ({ ...prev, ...tasteData }));
        setGenrePenalty(tasteData.recentGenrePenalty || {});
        setIsPro(userData.plan === "PRO");
      } catch (e) {
        console.error("Failed to fetch preferences", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const debouncedSaveTaste = useDebounce(async (newData: any) => {
    await fetch("/api/preferences/taste", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newData),
    });
  }, 1000);

  const handleTasteChange = (updates: any) => {
    const newTaste = { ...taste, ...updates };
    setTaste(newTaste);
    debouncedSaveTaste(newTaste);
  };

  const addAllergy = async (allergen: string) => {
    const res = await fetch("/api/preferences/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "allergy", allergen, label: allergen }),
    });
    if (res.ok) {
      const added = await res.json();
      setSafety((prev) => ({ ...prev, allergies: [...prev.allergies, added] }));
    }
  };

  const removeSafetyItem = async (id: string) => {
    const res = await fetch(`/api/preferences/safety/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSafety((prev) => ({
        allergies: prev.allergies.filter((a) => a.id !== id),
        restrictions: prev.restrictions.filter((r) => r.id !== id),
      }));
    }
  };

  const handleFinalSave = async () => {
    setSaving(true);
    try {
      // 一括ビルド
      await Promise.all([
        fetch("/api/settings/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        }),
        fetch("/api/preferences/taste", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taste),
        }),
        fetch("/api/preferences/genre", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recentGenrePenalty: genrePenalty }),
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        読み込み中...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-full transition"
        >
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">料理の好み</h1>
        <button
          onClick={handleFinalSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {saving ? (
            "保存中..."
          ) : saved ? (
            <>
              <Check size={18} /> 保存済
            </>
          ) : (
            <>
              <Save size={18} /> 保存
            </>
          )}
        </button>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-slate-200 overflow-x-auto no-scrollbar sticky top-[73px] z-40">
        <div className="flex px-4 items-center min-w-max">
          {(
            ["basic", "safety", "taste", "lifestyle", "genre", "pro"] as Tab[]
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-4 text-sm font-medium transition ${
                activeTab === tab
                  ? "text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "basic" && "基本"}
              {tab === "safety" && "安全"}
              {tab === "taste" && "味"}
              {tab === "lifestyle" && "生活"}
              {tab === "genre" && "ジャンル"}
              {tab === "pro" && "AI指示"}
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-active"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="p-4 max-w-2xl mx-auto">
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
                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
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
                        className={`py-3 rounded-2xl text-xs font-bold border transition ${
                          preferences.cookingSkill === s
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

                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-110">
                  <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Heart size={20} className="text-pink-500" /> 得意な調理法
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {methods.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          const list = [...preferences.comfortableMethods];
                          const i = list.indexOf(m);
                          if (i >= 0) list.splice(i, 1);
                          else list.push(m);
                          setPreferences({
                            ...preferences,
                            comfortableMethods: list,
                          });
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${
                          preferences.comfortableMethods.includes(m)
                            ? "bg-green-100 border-green-200 text-green-700"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-indigo-500" />{" "}
                    利用可能な設備
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {equipment.map((e) => (
                      <button
                        key={e}
                        onClick={() => {
                          const list = [...preferences.kitchenEquipment];
                          const i = list.indexOf(e);
                          if (i >= 0) list.splice(i, 1);
                          else list.push(e);
                          setPreferences({
                            ...preferences,
                            kitchenEquipment: list,
                          });
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${
                          preferences.kitchenEquipment.includes(e)
                            ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "safety" && (
              <div className="space-y-6">
                <section className="bg-white p-6 rounded-3xl shadow-sm border border-red-50">
                  <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-red-500" />{" "}
                    アレルギー
                  </h2>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {safety.allergies.map((a) => (
                      <div
                        key={a.id}
                        className="bg-red-50 border border-red-100 px-3 py-1.5 rounded-full flex items-center gap-2 text-red-700 text-sm font-medium"
                      >
                        {a.label}
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
                      placeholder="例: たまご、えび、牡蠣"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addAllergy(e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <button className="absolute right-3 top-2.5 bg-red-500 text-white p-1 rounded-lg">
                      <Plus size={18} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 px-1">
                    ※登録された食材は献立に含まれなくなります。追加時に確認モーダルは将来実装予定。
                  </p>
                </section>

                <section className="bg-white p-6 rounded-3xl shadow-sm border border-amber-50">
                  <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-amber-500" />{" "}
                    食事制限
                  </h2>
                  <div className="space-y-2">
                    {safety.restrictions.map((r) => (
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
                  </div>
                </section>
              </div>
            )}

            {activeTab === "taste" && (
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Heart size={20} className="text-pink-500" /> 味の好み
                </h2>
                {tasteKeys.map((item) => {
                  const score = taste.tasteScores[item.key] || 0;
                  return (
                    <div key={item.key} className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-sm font-bold text-slate-600">
                          {item.label}
                        </label>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            score === 2
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
                              ...taste.tasteScores,
                              [item.key]: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  );
                })}
              </section>
            )}

            {activeTab === "lifestyle" && (
              <div className="space-y-6">
                {["weekdayMode", "weekendMode"].map((mode) => (
                  <section
                    key={mode}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
                  >
                    <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <Clock size={20} className="text-indigo-500" />{" "}
                      {mode === "weekdayMode" ? "平日モード" : "休日モード"}
                    </h2>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-600">
                          時間優先度
                        </label>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                          {(["short", "normal", "long"] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() =>
                                handleTasteChange({
                                  lifestyle: {
                                    ...taste.lifestyle,
                                    [mode]: {
                                      ...(taste.lifestyle as any)[mode],
                                      timePriority: p,
                                    },
                                  },
                                })
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                (taste.lifestyle as any)[mode]?.timePriority ===
                                p
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
                        <label className="text-sm font-medium text-slate-600">
                          洗い物を最小限に
                        </label>
                        <button
                          onClick={() =>
                            handleTasteChange({
                              lifestyle: {
                                ...taste.lifestyle,
                                [mode]: {
                                  ...(taste.lifestyle as any)[mode],
                                  dishwashingAvoid: !(taste.lifestyle as any)[
                                    mode
                                  ].dishwashingAvoid,
                                },
                              },
                            })
                          }
                          className={`w-12 h-6 rounded-full transition relative ${(taste.lifestyle as any)[mode].dishwashingAvoid ? "bg-indigo-600" : "bg-slate-300"}`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition ${(taste.lifestyle as any)[mode].dishwashingAvoid ? "translate-x-6" : ""}`}
                          />
                        </button>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            )}

            {activeTab === "genre" && (
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <BarChart3 size={20} className="text-indigo-500" />{" "}
                  ジャンルの優先度
                </h2>
                <p className="text-xs text-slate-400 mb-8 px-1">
                  スライダーを右に振るとそのジャンルが優先され、左に振ると提案されにくくなります。
                </p>
                <div className="space-y-6">
                  {genres.map((g) => {
                    const val = genrePenalty[g] || 0;
                    return (
                      <div key={g} className="flex items-center gap-4">
                        <span
                          className={`w-16 text-sm font-medium ${val > 0 ? "text-indigo-600" : val < 0 ? "text-slate-400" : "text-slate-700"}`}
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
                          className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <span className="w-8 text-[10px] tabular-nums font-mono text-slate-400 text-right">
                          {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {activeTab === "pro" && (
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-100 overflow-hidden relative">
                {!isPro && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-indigo-600 text-white p-4 rounded-3xl mb-4 shadow-xl shadow-indigo-100">
                      <MessageSquare size={32} />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-800 mb-2">
                      AI個別指示
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                      「子供が食べやすい味」や「包丁を使わない手順」など、AIに個別のわがままを伝えることができます。
                    </p>
                    <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition">
                      Proにアップグレード
                    </button>
                  </div>
                )}
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <MessageSquare size={20} className="text-indigo-500" />{" "}
                  AIへの伝言（Free Text）
                </h2>
                <textarea
                  value={taste.freeText}
                  onChange={(e) =>
                    setTaste({
                      ...taste,
                      freeText: e.target.value.slice(0, 300),
                    })
                  }
                  placeholder="例：平日は帰宅が遅いので包丁を使わないレシピを優先してください。子供がいるので辛いものは避けてください。"
                  className="w-full h-48 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                />
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-[10px] text-slate-400">
                    ※最大300文字
                  </span>
                  <span
                    className={`text-[10px] font-bold ${taste.freeText.length > 280 ? "text-red-500" : "text-slate-400"}`}
                  >
                    {taste.freeText.length}/300
                  </span>
                </div>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer hint */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 p-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 text-green-600 p-2 rounded-xl">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 leading-tight">安全第一</p>
            <p className="text-xs font-bold text-slate-700">
              アレルギーはSystemで排除
            </p>
          </div>
        </div>
        {!saved && !saving && (
          <p className="text-[10px] text-amber-500 font-medium">
            変更は手動で保存してください
          </p>
        )}
      </footer>
    </div>
  );
}
