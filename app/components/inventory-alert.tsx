"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AlertItem {
  id: string;
  name: string;
  daysRemaining: number;
}

export default function InventoryAlert() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        // We can fetch from a dedicated alert endpoint or infer from ingredients
        // For simplicity now, let's fetch expiring ingredients.
        // Ideally we should have GET /api/alerts or similar.
        // Or we can just calculate it client side if we have ingredients?
        // Let's create a simple GET endpoint or reused logic if needed.
        // Actually, the user asked for "show expiring items", we can just fetch ingredients and filter.

        // However, fetching all ingredients just for the banner might be heavy if list is huge.
        // Let's assume we can add a small endpoint or just filter for now.
        // Let's try to fetch from an endpoint.
        // We don't have GET /api/alerts yet.
        // I'll assume we can fetch ingredients and filter client side for MVP.

        // Note: For Phase 1B, let's just use a dedicated simple fetch
        const res = await fetch("/api/ingredients?expiring=true");
        // We need to implement this query param support in GET /api/ingredients if exists?
        // Or just fetch all.

        // Wait, for this component to be standalone, it should probably fetch efficiently.
        // I'll leave a TODO or mock for a second if backend endpoint isn't ready.
        // But wait, we have `app/api/cron/daily-alert/route.ts`.
        // Let's implement a quick check here.
        // Better: Fetch ingredients and filter.

        const resIngredients = await fetch("/api/ingredients");
        if (resIngredients.ok) {
          const data = await resIngredients.json();
          const ingredients = data.items || [];

          const now = new Date();
          const threeDaysFromNow = new Date();
          threeDaysFromNow.setDate(now.getDate() + 3);

          const expiring = ingredients
            .filter((i: any) => {
              if (!i.expirationDate) return false;
              const exp = new Date(i.expirationDate);
              const diffTime = exp.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 3 && diffDays >= 0;
            })
            .map((i: any) => ({
              id: i.id,
              name: i.name,
              daysRemaining: Math.ceil(
                (new Date(i.expirationDate).getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            }));

          setAlerts(expiring);
        }
      } catch (e) {
        console.error("Failed to fetch alerts", e);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, []);

  if (!visible || loading || alerts.length === 0) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              賞味期限が近い食材があります
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                {alerts.map((item) => (
                  <li key={item.id}>
                    {item.name} (あと{item.daysRemaining}日)
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex">
                <Link
                  href="/menu/generate"
                  className="px-3 py-2 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  献立を作成する
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={() => setVisible(false)}
              type="button"
              className="inline-flex bg-yellow-50 rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
