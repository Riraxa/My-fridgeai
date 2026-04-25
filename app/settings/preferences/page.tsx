//app/settings/preferences/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Heart,
  BarChart3,
  Trash2,
  Plus,
  Utensils,
  Info,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAutoSave } from "@/app/hooks/useAutoSave";
import { DEFAULT_IMPLICIT_INGREDIENTS } from "@/lib/constants/implicit-ingredients";
import {
  COOKING_METHODS,
  KITCHEN_EQUIPMENT,
  SUB_TABS,
  type PreferencesTab,
} from "./constants";
import { SaveIndicator } from "./save-indicator";

export default function EnhancedPreferencesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PreferencesTab>("basic");
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  // Independent AI context states
  const [aiMessageEnabled, setAiMessageEnabled] = useState(false);

  // States for different sections
  const [preferences, setPreferences] = useState<{
    cookingSkill: string;
    comfortableMethods: string[];
    avoidMethods: string[];
    kitchenEquipment: string[];
    kitchenCookware: string[];
    implicitIngredients: string[];
  }>({
    cookingSkill: "intermediate",
    comfortableMethods: [],
    avoidMethods: [],
    kitchenEquipment: [],
    kitchenCookware: [],
    implicitIngredients: [...DEFAULT_IMPLICIT_INGREDIENTS],
  });

  const [safety, setSafety] = useState<{
    allergies: Array<{ id: string; allergen: string; label: string }>;
    restrictions: Array<{ id: string; type: string; note: string | null }>;
  }>({
    allergies: [],
    restrictions: [],
  });
  const [initialSafety, setInitialSafety] = useState<string>("");
  const [safetyReady, setSafetyReady] = useState(false);

  const [customImplicitIngredients, setCustomImplicitIngredients] = useState<string[]>([]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prefsRes, safetyRes, userRes, implicitRes] = await Promise.all([
          fetch("/api/settings/preferences"),
          fetch("/api/preferences/safety"),
          fetch("/api/user/me"),
          fetch("/api/preferences/implicit-ingredients"),
        ]);

        const prefsData = await prefsRes.json();
        const safetyData = await safetyRes.json();
        const userData = await userRes.json();
        const implicitData = await implicitRes.json();

        if (!prefsData) throw new Error("Invalid data received");

        const normalizedPrefs = {
          cookingSkill: prefsData.preferences?.cookingSkill ?? "intermediate",
          comfortableMethods: Array.isArray(prefsData.preferences?.comfortableMethods) ? prefsData.preferences.comfortableMethods : [],
          avoidMethods: Array.isArray(prefsData.preferences?.avoidMethods) ? prefsData.preferences.avoidMethods : [],
          kitchenEquipment: Array.isArray(prefsData.preferences?.kitchenEquipment) ? prefsData.preferences.kitchenEquipment : [],
          kitchenCookware: Array.isArray(prefsData.preferences?.kitchenCookware) ? prefsData.preferences.kitchenCookware : [],
          implicitIngredients: Array.isArray(prefsData.preferences?.implicitIngredients) ? prefsData.preferences.implicitIngredients : [...DEFAULT_IMPLICIT_INGREDIENTS],
        };

        const nextAiMessageEnabled = prefsData.preferences?.aiMessageEnabled ?? false;
        setPreferences(normalizedPrefs);
        setAiMessageEnabled(nextAiMessageEnabled);
        setSafety({
          allergies: safetyData.allergies ?? [],
          restrictions: safetyData.restrictions ?? [],
        });
        const initialSafetyData = {
          allergies: safetyData.allergies ?? [],
          restrictions: safetyData.restrictions ?? [],
        };
        setInitialSafety(JSON.stringify(initialSafetyData));
        setTimeout(() => setSafetyReady(true), 500);
        
        setIsPro(userData.user?.plan === "PRO");
        setCustomImplicitIngredients(implicitData.customIngredients ?? []);

        setInitialData(
          JSON.stringify({
            preferences: normalizedPrefs,
            aiMessageEnabled: nextAiMessageEnabled,
            customImplicitIngredients: implicitData.customIngredients ?? [],
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

  const addCustomImplicitIngredient = async (name: string) => {
    if (!name.trim()) return false;
    
    const trimmedName = name.trim();
    if (customImplicitIngredients.includes(trimmedName)) {
      toast.error(`「${trimmedName}」は既に追加されています`);
      return false;
    }
    
    const newList = [...customImplicitIngredients, trimmedName];
    setCustomImplicitIngredients(newList);
    toast.success(`「${trimmedName}」を追加しました`);
    return true;
  };

  const removeCustomImplicitIngredient = async (name: string) => {
    const newList = customImplicitIngredients.filter((ing) => ing !== name);
    setCustomImplicitIngredients(newList);
  };

  const [initialData, setInitialData] = useState<string>("");

  const handleGlobalAutoSave = useCallback(
    async (value: string, signal: AbortSignal) => {
      const data = JSON.parse(value);
      if (!data.preferences || loading) return;

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
        fetch("/api/preferences/implicit-ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            customIngredients: data.customImplicitIngredients ?? [] 
          }),
          signal,
        }),
      ]);

      for (const res of responses) {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "保存に失敗しました");
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
    !readyToSave ? "" : JSON.stringify({ preferences, aiMessageEnabled, customImplicitIngredients }),
    !readyToSave ? "" : initialData,
    {
      debounceMs: 1500,
      savedDisplayMs: 2000,
      onSave: handleGlobalAutoSave,
    },
  );

  const handleSafetyAutoSave = useCallback(
    async (value: string, signal: AbortSignal) => {
      const data = JSON.parse(value);
      if (!data.allergies || !data.restrictions || loading) return;

      const currentRes = await fetch("/api/preferences/safety");
      if (!currentRes.ok) throw new Error("Failed to fetch current safety");
      const currentData = await currentRes.json();
      
      const currentAllergies = currentData.allergies ?? [];
      const currentRestrictions = currentData.restrictions ?? [];
      
      const newAllergies = data.allergies as typeof currentAllergies;
      const newRestrictions = data.restrictions as typeof currentRestrictions;
      
      const toDeleteAllergy = currentAllergies.filter(
        (a: any) => !newAllergies.find((na: any) => na.id === a.id)
      );
      const toDeleteRestriction = currentRestrictions.filter(
        (r: any) => !newRestrictions.find((nr: any) => nr.id === r.id)
      );
      
      const toAddAllergy = newAllergies.filter((na: any) => !na.id);
      const toAddRestriction = newRestrictions.filter((nr: any) => !nr.id);
      
      await Promise.all([
        ...toDeleteAllergy.map((a: any) =>
          fetch(`/api/preferences/safety/${a.id}`, { method: "DELETE", signal })
        ),
        ...toDeleteRestriction.map((r: any) =>
          fetch(`/api/preferences/safety/${r.id}`, { method: "DELETE", signal })
        ),
        ...toAddAllergy.map((a: any) =>
          fetch("/api/preferences/safety", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "allergy", allergen: a.name, label: a.name }),
            signal,
          })
        ),
        ...toAddRestriction.map((r: any) =>
          fetch("/api/preferences/safety", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "restriction", restrictionType: r.type, note: r.note }),
            signal,
          })
        ),
      ]);
    },
    [loading]
  );

  const {
    saveState: safetySaveState,
    errorMessage: safetySaveError,
    retry: retrySafetySave,
  } = useAutoSave(
    !safetyReady ? "" : JSON.stringify(safety),
    !safetyReady ? "" : initialSafety,
    {
      debounceMs: 1500,
      savedDisplayMs: 2000,
      onSave: handleSafetyAutoSave,
    }
  );

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        読み込み中...
      </div>
    );

  return (
    <main className="pb-24 px-4 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          料理の好み
        </h2>
      </div>

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
              <section className="p-6 rounded-3xl shadow-sm" style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)" }}>
                <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                  <BarChart3 size={20} className="text-indigo-500" /> 料理スキル
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {["beginner", "intermediate", "advanced"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPreferences({ ...preferences, cookingSkill: s })}
                      className={`py-3 rounded-2xl text-xs font-bold border transition ${preferences.cookingSkill === s
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                        : "bg-slate-50 border-slate-200 text-[var(--color-text-secondary)] hover:border-slate-300"
                        }`}
                    >
                      {s === "beginner" ? "初心者" : s === "intermediate" ? "中級者" : "上級者"}
                    </button>
                  ))}
                </div>
              </section>

              <section className="p-6 rounded-3xl shadow-sm" style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)" }}>
                <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                  <Heart size={20} className="text-pink-500" /> 得意な調理法
                </h2>
                <div className="flex flex-wrap gap-2">
                  {COOKING_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        const currentList = preferences.comfortableMethods ?? [];
                        const list = [...currentList];
                        const i = list.indexOf(m);
                        if (i >= 0) list.splice(i, 1); else list.push(m);
                        setPreferences({ ...preferences, comfortableMethods: list });
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

              <section className="p-6 rounded-3xl shadow-sm" style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)" }}>
                <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                  <ShieldCheck size={20} className="text-indigo-500" /> 利用可能な設備
                </h2>
                <div className="flex flex-wrap gap-2">
                  {KITCHEN_EQUIPMENT.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        const currentList = preferences.kitchenEquipment ?? [];
                        const list = [...currentList];
                        const i = list.indexOf(e);
                        if (i >= 0) list.splice(i, 1); else list.push(e);
                        setPreferences({ ...preferences, kitchenEquipment: list });
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

              <div className="flex justify-start px-2 mt-4">
                <SaveIndicator state={globalSaveState} error={globalSaveError} onRetry={retryGlobalSave} />
              </div>
            </div>
          )}

          {activeTab === "safety" && (
            <div className="space-y-6">
              <section className="p-6 rounded-3xl shadow-sm" style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)" }}>
                <h2 className="text-base font-bold mb-2 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                  <AlertTriangle size={20} className="text-red-500" /> アレルギー
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mb-4 px-1">
                  食事に関係のあるアレルギーを入力してください。登録された食材は献立に含まれなくなります。
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {(safety.allergies ?? []).map((a) => (
                    <div key={a.id} className="bg-red-50 border border-red-100 px-3 py-1.5 rounded-full flex items-center gap-2 text-red-700 text-sm font-medium">
                      {a.label || a.allergen}
                      <button onClick={() => removeSafetyItem(a.id)} className="hover:bg-red-200 rounded-full p-0.5 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="食材名を入力（例：たまご、えび）"
                    className="w-full rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
                    style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)", color: "var(--color-text-primary)" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addAllergy(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.parentElement?.querySelector("input");
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
              </section>

              <section className="p-6 rounded-3xl shadow-sm overflow-hidden relative" style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)" }}>
                {!isPro && (
                  <div className="absolute inset-0 bg-[var(--background)]/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-amber-500 text-white p-4 rounded-3xl mb-4 shadow-xl shadow-amber-100">
                      <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-lg font-extrabold mb-2" style={{ color: "var(--color-text-primary)" }}>食事制限の設定</h3>
                    <p className="text-sm text-slate-500 mb-6">Proプランで詳細な食事制限を設定できます。</p>
                    <button onClick={() => router.push("/settings/account")} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-amber-100 hover:scale-105 active:scale-95 transition">Proにアップグレード</button>
                  </div>
                )}
                <div inert={!isPro || undefined} className={!isPro ? "pointer-events-none" : ""}>
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                    <ShieldCheck size={20} className="text-amber-500" /> 食事制限
                  </h2>
                  <div className="space-y-2">
                    {(safety.restrictions ?? []).map((r) => (
                      <div key={r.id} className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{r.type}</span>
                          <p className="text-sm text-slate-700">{r.note}</p>
                        </div>
                        <button onClick={() => removeSafetyItem(r.id)} className="text-[var(--color-text-muted)] hover:text-red-500 transition">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    <div className="mt-4 flex gap-2">
                        <input id="restriction-type" type="text" placeholder="タイプ（例：低塩分）" className="flex-1 rounded-2xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition" style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)", color: "var(--color-text-primary)" }} />
                        <button
                          onClick={() => {
                            const typeInput = document.getElementById("restriction-type") as HTMLInputElement;
                            if (typeInput?.value.trim()) {
                              addRestriction(typeInput.value.trim(), "");
                              typeInput.value = "";
                            }
                          }}
                          className="bg-amber-500 text-white p-2 rounded-lg"
                        >
                          <Plus size={18} />
                        </button>
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex justify-start px-2 mt-4">
                <SaveIndicator state={safetySaveState} error={safetySaveError} onRetry={retrySafetySave} />
              </div>
            </div>
          )}

          {activeTab === "ingredients" && (
            <div className="space-y-6">
              <section className="p-6 rounded-3xl shadow-sm" style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)" }}>
                <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                  <Info size={20} className="text-indigo-500" /> 自動で許可される食材
                </h2>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_IMPLICIT_INGREDIENTS.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        const currentList = preferences.implicitIngredients ?? [];
                        const list = [...currentList];
                        const i = list.indexOf(item);
                        if (i >= 0) list.splice(i, 1); else list.push(item);
                        setPreferences({ ...preferences, implicitIngredients: list });
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${
                        (preferences.implicitIngredients ?? []).includes(item)
                          ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>

              <section className="p-6 rounded-3xl shadow-sm overflow-hidden relative" style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)" }}>
                {!isPro && (
                  <div className="absolute inset-0 bg-[var(--background)]/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-[var(--semantic-green)] text-white p-4 rounded-3xl mb-4 shadow-xl shadow-green-100">
                      <Utensils size={32} />
                    </div>
                    <h3 className="text-lg font-extrabold mb-2" style={{ color: "var(--color-text-primary)" }}>カスタム基本食材</h3>
                    <button onClick={() => router.push("/settings/account")} className="bg-[var(--semantic-green)] text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-green-100 hover:scale-105 active:scale-95 transition">Proにアップグレード</button>
                  </div>
                )}
                <div inert={!isPro || undefined} className={!isPro ? "pointer-events-none" : ""}>
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                    <Utensils size={20} className="text-green-500" /> カスタム許可食材
                  </h2>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {customImplicitIngredients.map((ing) => (
                      <div key={ing} className="bg-green-50 border border-green-100 px-3 py-1.5 rounded-full flex items-center gap-2 text-green-700 text-sm font-medium">
                        {ing}
                        <button onClick={() => removeCustomImplicitIngredient(ing)} className="hover:bg-green-200 rounded-full p-0.5 transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="食材名を入力"
                      className="w-full rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none transition"
                      style={{ background: "var(--surface-bg)", border: "1px solid var(--surface-border)", color: "var(--color-text-primary)" }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          const input = e.currentTarget;
                          const success = await addCustomImplicitIngredient(input.value);
                          if (success) input.value = "";
                        }
                      }}
                    />
                    <button
                      onClick={async (e) => {
                        const input = e.currentTarget.parentElement?.querySelector("input");
                        if (input?.value.trim()) {
                          const success = await addCustomImplicitIngredient(input.value.trim());
                          if (success) input.value = "";
                        }
                      }}
                      className="absolute right-3 top-2.5 bg-green-500 text-white p-1 rounded-lg"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </section>

              <div className="flex justify-start px-2 mt-4">
                <SaveIndicator state={globalSaveState} error={globalSaveError} onRetry={retryGlobalSave} />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
