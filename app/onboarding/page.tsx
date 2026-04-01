//app/onboarding/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFridge } from "@/app/components/FridgeProvider";

type Step = "items" | "safety" | "equipment" | "cookware" | "generate";

const QUICK_ITEMS = [
  { name: "牛乳", amount: 1, unit: "L", category: "冷蔵" },
  { name: "卵", amount: 10, unit: "個", category: "冷蔵" },
  { name: "玉ねぎ", amount: 2, unit: "個", category: "野菜" },
  { name: "人参", amount: 2, unit: "本", category: "野菜" },
  { name: "米", amount: 2, unit: "kg", category: "その他" },
  { name: "パン", amount: 1, unit: "袋", category: "その他" },
  { name: "カレールー", amount: 1, unit: "箱", category: "加工食品" },
  { name: "醤油", amount: 1, unit: "本", category: "調味料" },
  { name: "味噌", amount: 1, unit: "パック", category: "調味料" },
  { name: "豆腐", amount: 1, unit: "丁", category: "冷蔵" },
];

function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const fromSettings = searchParams?.get("from") === "settings";

  const { 
    items,
    fetchIngredients,
    addOrUpdateItem,
  } = useFridge();

  const [step, setStep] = useState<Step>("items");
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(QUICK_ITEMS.map((i) => [i.name, true])),
  );
  const [savingQuick, setSavingQuick] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Safety
  const [allergies, setAllergies] = useState<string[]>([]);

  // Equipment
  const [equipment, setEquipment] = useState<Record<string, boolean>>({
    "ガスコンロ": true,
    "IH": false,
    "電子レンジ": true,
    "オーブン": false,
    "圧力鍋": false,
    "トースター": false,
    "炊飯器": true,
  });

  // Cookware
  const [cookware, setCookware] = useState<Record<string, boolean>>({
    "フライパン": true,
    "鍋": true,
    "包丁・まな板": true,
    "ボウル": true,
    "ざる": false,
    "菜箸・おたま": true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);



  const completeOnboarding = async () => {
    try {
      await fetch("/api/user/onboarding-complete", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    }
  };

  const handleExit = () => {
    if (!fromSettings) {
      completeOnboarding();
    }
    router.replace("/home");
  };

  const submitQuickList = async () => {
    setSavingQuick(true);
    try {
      const selected = QUICK_ITEMS.filter((i) => checked[i.name]);
      
      if (selected.length === 0) {
        setStep("safety");
        return;
      }

      // 賞味期限を推定してから追加
      const itemsWithExpiration = await Promise.all(
        selected.map(async (item) => {
          try {
            const res = await fetch("/api/ingredients/estimate-expiration", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ name: item.name }),
            });
            if (res.ok) {
              const data = await res.json();
              return {
                ...item,
                expirationDate: data.estimatedExpiration,
              };
            }
          } catch (error) {
            console.warn(`Failed to estimate expiration for ${item.name}:`, error);
          }
          return item;
        })
      );

      // MVP: batch APIが無ければ順次POSTでも可だが、まずはbatchを叩く前提にする
      const res = await fetch("/api/ingredients/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: itemsWithExpiration,
          idempotencyKey: `onboarding-quick-${new Date().toISOString()}`,
        }),
      });

      if (!res.ok) {
        // fallback: sequential
        for (const it of itemsWithExpiration) {
          await fetch("/api/ingredients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(it),
          });
        }
      }

      await fetchIngredients();
      setStep("safety");
    } finally {
      setSavingQuick(false);
    }
  };

  const saveSafetyAndContinue = async () => {
    setSavingPrefs(true);
    try {
      // allergies
      for (const a of allergies) {
        await fetch("/api/preferences/safety", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "allergy", allergen: a, label: a }),
        }).catch(() => {});
      }

      setStep("equipment");
    } finally {
      setSavingPrefs(false);
    }
  };

  const saveEquipmentAndContinue = async () => {
    setSavingPrefs(true);
    try {
      const kitchenEquipment = Object.entries(equipment)
        .filter(([, v]) => v)
        .map(([k]) => k);

      await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitchenEquipment,
        }),
      }).catch(() => {});

      setStep("cookware");
    } finally {
      setSavingPrefs(false);
    }
  };

  const saveCookwareAndContinue = async () => {
    setSavingPrefs(true);
    try {
      const kitchenCookware = Object.entries(cookware)
        .filter(([, v]) => v)
        .map(([k]) => k);

      await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitchenCookware,
        }),
      }).catch(() => {});

      setStep("generate");
    } finally {
      setSavingPrefs(false);
    }
  };

  const goGenerate = () => {
    completeOnboarding();
    router.push("/menu/generate?source=onboarding");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              クイックガイド
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              基本的な使い方を確認できます。
            </p>
          </div>
          <button
            onClick={handleExit}
            className="px-4 py-2 rounded-full text-sm text-white hover:opacity-90 transition-opacity"
            style={{
              background: "var(--accent)",
            }}
          >
            閉じる
          </button>
        </div>

        {/* Step indicator */}
        <div
          className="rounded-2xl p-4 border"
          style={{
            background: "var(--surface-bg)",
            borderColor: "var(--surface-border)",
          }}
        >
          <div className="space-y-3">
            {/* 進捗バー */}
            <div className="relative">
              <div 
                className="h-2 rounded-full"
                style={{
                  background: "var(--surface-border)",
                }}
              >
                <div 
                  className="h-2 rounded-full transition-all duration-500 ease-out"
                  style={{
                    background: "var(--accent)",
                    width: `${((["items", "safety", "equipment", "cookware", "generate"].indexOf(step) + 1) / 5) * 100}%`,
                  }}
                />
              </div>
            </div>
            
            {/* ステップラベル */}
            <div className="flex justify-between text-xs">
              {[
                { id: "items", label: "食材" },
                { id: "safety", label: "制約" },
                { id: "equipment", label: "設備" },
                { id: "cookware", label: "器具" },
                { id: "generate", label: "献立" },
              ].map((s, index) => {
                const isActive = step === (s.id as Step);
                const isCompleted = ["items", "safety", "equipment", "cookware", "generate"].indexOf(step) > index;
                
                return (
                  <div
                    key={s.id}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300`}
                      style={{
                        background: isActive 
                          ? "var(--accent)"
                          : isCompleted
                          ? "var(--accent)"
                          : "var(--surface-border)",
                        color: isActive || isCompleted 
                          ? "white"
                          : "var(--color-text-muted)",
                      }}
                    >
                      {isCompleted ? "✓" : index + 1}
                    </div>
                    <span
                      className="font-medium"
                      style={{
                        color: isActive
                          ? "var(--accent)"
                          : isCompleted
                          ? "var(--color-text-primary)"
                          : "var(--color-text-muted)",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {step === "items" && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="font-bold mb-2">Step1: 食材を入れる</h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                まずは最低限の食材をチェックするだけでOKです。
              </p>

              <div className="grid grid-cols-2 gap-2">
                {QUICK_ITEMS.map((it) => (
                  <label
                    key={it.name}
                    className="flex items-center gap-2 p-3 rounded-xl border"
                    style={{
                      background: "var(--surface-bg)",
                      borderColor: "var(--surface-border)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!checked[it.name]}
                      onChange={(e) =>
                        setChecked((prev) => ({
                          ...prev,
                          [it.name]: e.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm font-medium">{it.name}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4">
                <button
                  onClick={submitQuickList}
                  disabled={savingQuick}
                  className="w-full py-3 rounded-2xl font-bold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  {savingQuick ? "追加中..." : "この内容で次へ"}
                </button>
              </div>
            </div>

          </div>
        )}

        {step === "safety" && (
          <div className="card space-y-4">
            <h2 className="font-bold">Step2: アレルギー・制限</h2>
            <div className="space-y-2">
              <label className="text-sm font-semibold">アレルギー（任意）</label>
              <input
                className="w-full rounded-2xl px-4 py-3 text-sm border"
                style={{
                  background: "var(--surface-bg)",
                  borderColor: "var(--surface-border)",
                }}
                placeholder="例: 卵、小麦、乳"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const v = (e.currentTarget.value ?? "").trim();
                  if (!v) return;
                  setAllergies((prev) =>
                    prev.includes(v) ? prev : [...prev, v].slice(0, 10),
                  );
                  e.currentTarget.value = "";
                }}
              />
              {allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((a) => (
                    <button
                      key={a}
                      onClick={() =>
                        setAllergies((prev) => prev.filter((x) => x !== a))
                      }
                      className="text-xs px-3 py-1.5 rounded-full border"
                      style={{
                        background: "var(--surface-bg)",
                        borderColor: "var(--surface-border)",
                      }}
                    >
                      {a} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("items")}
                className="flex-1 py-3 rounded-2xl border font-semibold"
                style={{
                  background: "var(--surface-bg)",
                  borderColor: "var(--surface-border)",
                }}
              >
                戻る
              </button>
              <button
                onClick={saveSafetyAndContinue}
                disabled={savingPrefs}
                className="flex-1 py-3 rounded-2xl font-bold text-white"
                style={{ background: "var(--accent)" }}
              >
                {savingPrefs ? "保存中..." : "次へ"}
              </button>
            </div>
          </div>
        )}

        {step === "equipment" && (
          <div className="card space-y-4">
            <h2 className="font-bold">Step3: 設備</h2>

            <div className="space-y-2">
              <label className="text-sm font-semibold">利用可能な設備（任意）</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(equipment).map((k) => (
                  <label
                    key={k}
                    className="flex items-center gap-2 p-3 rounded-xl border"
                    style={{
                      background: "var(--surface-bg)",
                      borderColor: "var(--surface-border)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={equipment[k]}
                      onChange={(e) =>
                        setEquipment((prev) => ({
                          ...prev,
                          [k]: e.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm font-medium">{k}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("safety")}
                className="flex-1 py-3 rounded-2xl border font-semibold"
                style={{
                  background: "var(--surface-bg)",
                  borderColor: "var(--surface-border)",
                }}
              >
                戻る
              </button>
              <button
                onClick={saveEquipmentAndContinue}
                disabled={savingPrefs}
                className="flex-1 py-3 rounded-2xl font-bold text-white"
                style={{ background: "var(--accent)" }}
              >
                {savingPrefs ? "保存中..." : "次へ"}
              </button>
            </div>
          </div>
        )}

        {step === "cookware" && (
          <div className="card space-y-4">
            <h2 className="font-bold">Step4: 調理器具</h2>

            <div className="space-y-2">
              <label className="text-sm font-semibold">利用可能な調理器具（任意）</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(cookware).map((k) => (
                  <label
                    key={k}
                    className="flex items-center gap-2 p-3 rounded-xl border"
                    style={{
                      background: "var(--surface-bg)",
                      borderColor: "var(--surface-border)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={cookware[k]}
                      onChange={(e) =>
                        setCookware((prev) => ({
                          ...prev,
                          [k]: e.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm font-medium">{k}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("equipment")}
                className="flex-1 py-3 rounded-2xl border font-semibold"
                style={{
                  background: "var(--surface-bg)",
                  borderColor: "var(--surface-border)",
                }}
              >
                戻る
              </button>
              <button
                onClick={saveCookwareAndContinue}
                disabled={savingPrefs}
                className="flex-1 py-3 rounded-2xl font-bold text-white"
                style={{ background: "var(--accent)" }}
              >
                {savingPrefs ? "保存中..." : "次へ"}
              </button>
            </div>
          </div>
        )}

        {step === "generate" && (
          <div className="card space-y-4">
            <h2 className="font-bold">最後: 初回の献立を生成</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              このまま献立生成に進みます。生成後に「調理完了」を押すと在庫が自動更新されます。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("cookware")}
                className="flex-1 py-3 rounded-2xl border font-semibold"
                style={{
                  background: "var(--surface-bg)",
                  borderColor: "var(--surface-border)",
                }}
              >
                戻る
              </button>
              <button
                onClick={goGenerate}
                className="flex-1 py-3 rounded-2xl font-bold text-white"
                style={{ background: "var(--accent)" }}
              >
                初回献立を生成する
              </button>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

// Suspenseでラップしてexport
export default function OnboardingPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <OnboardingPage />
    </Suspense>
  );
}

