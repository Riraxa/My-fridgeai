//app/settings/preferences/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, Check } from "lucide-react";
import { motion } from "framer-motion";

export default function PreferencesPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState({
    cookingSkill: "intermediate",
    comfortableMethods: [] as string[],
    avoidMethods: [] as string[],
    kitchenEquipment: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const methods = ["炒め物", "煮物", "焼き物", "揚げ物", "蒸し物", "和え物"];
  const equipment = [
    "ガスコンロ",
    "電子レンジ",
    "オーブン",
    "圧力鍋",
    "トースター",
    "炊飯器",
  ];

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await fetch("/api/settings/preferences");
        const data = await res.json();
        if (data.preferences) {
          setPreferences({
            cookingSkill: data.preferences.cookingSkill || "intermediate",
            comfortableMethods: data.preferences.comfortableMethods || [],
            avoidMethods: data.preferences.avoidMethods || [],
            kitchenEquipment: data.preferences.kitchenEquipment || [],
          });
        }
      } catch (e) {
        console.error("Fetch preferences failed", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (
    listName: "comfortableMethods" | "avoidMethods" | "kitchenEquipment",
    item: string,
  ) => {
    setPreferences((prev) => {
      const list = [...prev[listName]];
      const idx = list.indexOf(item);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(item);
      return { ...prev, [listName]: list };
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="container mx-auto min-h-screen bg-[var(--background)] pb-20">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--surface-border)] backdrop-blur-lg bg-[var(--background)]/70 px-4 py-4">
        <button
          onClick={() => router.back()}
          className="p-1 hover:bg-gray-100 rounded-full transition"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">料理の好み</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {saved ? <Check size={20} /> : <Save size={20} />}
        </button>
      </header>

      <motion.main
        className="p-4 space-y-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Cooking Skill */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-4 px-1">
            料理スキル
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {["beginner", "intermediate", "advanced"].map((skill) => (
              <motion.button
                key={skill}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  setPreferences({ ...preferences, cookingSkill: skill })
                }
                className={`py-3 rounded-2xl text-xs font-medium border transition ${
                  preferences.cookingSkill === skill
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-white border-[var(--surface-border)] text-gray-600"
                }`}
              >
                {skill === "beginner" && "初心者"}
                {skill === "intermediate" && "中級者"}
                {skill === "advanced" && "上級者"}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Kitchen Equipment */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-4 px-1">
            利用可能な設備
          </h2>
          <div className="flex flex-wrap gap-2">
            {equipment.map((item) => (
              <motion.button
                key={item}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleItem("kitchenEquipment", item)}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition ${
                  preferences.kitchenEquipment.includes(item)
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-white border-[var(--surface-border)] text-gray-600"
                }`}
              >
                {item}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Comfortable Methods */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-4 px-1">
            得意な調理法
          </h2>
          <div className="flex flex-wrap gap-2">
            {methods.map((item) => (
              <motion.button
                key={item}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleItem("comfortableMethods", item)}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition ${
                  preferences.comfortableMethods.includes(item)
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-white border-[var(--surface-border)] text-gray-600"
                }`}
              >
                {item}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Avoid Methods */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-4 px-1">
            避けたい調理法
          </h2>
          <div className="flex flex-wrap gap-2">
            {methods.map((item) => (
              <motion.button
                key={item}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleItem("avoidMethods", item)}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition ${
                  preferences.avoidMethods.includes(item)
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-white border-[var(--surface-border)] text-gray-600"
                }`}
              >
                {item}
              </motion.button>
            ))}
          </div>
        </section>

        <div className="pt-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? "保存中..." : "設定を保存する"}
          </motion.button>
        </div>
      </motion.main>
    </div>
  );
}
