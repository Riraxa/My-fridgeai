// app/api/completeMenu/route.ts
import { NextResponse } from "next/server";

type Item = {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  expiry?: string | null;
  category?: string;
};

// quantity.tsから埋め込んだ関数
type ParsedQuantity = {
  amount: number; // 基本的に数値（単位換算後のベース量）
  unit: string; // 正規化ユニット: "ml" | "g" | "count" | "unknown"
  raw?: string;
  note?: string;
};

function parseNumberToken(tok: string): number | null {
  if (!tok) return null;
  tok = tok.trim();
  // Handle fraction like "1/2"
  if (/^\d+\s*\/\s*\d+$/.test(tok)) {
    const [a, b] = tok.split("/").map((s) => Number(s.trim()));
    if (b === 0) return null;
    return a / b;
  }
  // Handle ranges like "2-3" or "2〜3" -> take average
  if (/^\d+(\.\d+)?\s*[-〜~]\s*\d+(\.\d+)?$/.test(tok)) {
    const parts = tok.split(/[-〜~]/).map((s) => Number(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return (parts[0] + parts[1]) / 2;
    }
  }
  // Remove commas
  const normalized = tok.replace(/,/g, "").replace(/^\＋/, "");
  const n = Number(normalized);
  if (!isNaN(n)) return n;
  return null;
}

function parseQuantityText(text: string): ParsedQuantity {
  // text examples: "牛乳 150ml", "150 ml", "150ml", "1L", "2個", "卵 2個", "1/2カップ", "200 g"
  const raw = String(text || "").trim();
  if (!raw) return { amount: 0, unit: "unknown", raw };

  // Try to extract last token that looks like number+unit
  // Common units: ml, l, g, kg, 個, 個, 枚, 本, カップ, tsp, tbsp (we map only to important ones)
  const m = raw.match(
    /([\d.,\/\s\-〜~]+)\s*(ml|l|g|kg|kg|個|枚|本|カップ|カップス|cup|cups|tsp|tbsp|個分)?$/i,
  );
  if (m) {
    const numToken = (m[1] || "").trim();
    const unitToken = (m[2] || "").toLowerCase();
    const maybeNum = parseNumberToken(numToken);
    if (maybeNum !== null) {
      // Normalize unit
      const u = (() => {
        if (/^l$/i.test(unitToken)) return "ml";
        if (/^ml$/i.test(unitToken)) return "ml";
        if (/^kg$/i.test(unitToken)) return "g";
        if (/^g$/i.test(unitToken)) return "g";
        if (/個|枚|本|pcs|pieces|piece|個分/i.test(unitToken)) return "count";
        if (/カップ|cup|cups/i.test(unitToken)) return "ml"; // approximate via cups->ml later
        if (/tsp|tbsp/i.test(unitToken)) return "ml";
        return "unknown";
      })();

      // Convert to base numeric unit
      let amount = maybeNum;
      if (/^l$/i.test(unitToken)) {
        amount = maybeNum * 1000; // L -> ml
      } else if (/^kg$/i.test(unitToken)) {
        amount = maybeNum * 1000; // kg -> g
      } else if (/カップ|cup|cups/i.test(unitToken)) {
        amount = maybeNum * 240; // approximate 1 cup = 240 ml
      } else if (/tbsp/i.test(unitToken)) {
        amount = maybeNum * 15; // tablespoon ~15ml
      } else if (/tsp/i.test(unitToken)) {
        amount = maybeNum * 5; // teaspoon ~5ml
      }

      // If unit normalized to ml or g, keep amount as ml or g respectively
      if (u === "ml") return { amount, unit: "ml", raw };
      if (u === "g") return { amount, unit: "g", raw };
      if (u === "count") return { amount, unit: "count", raw };
      return { amount, unit: u, raw, note: "unit-unknown" };
    }
  }

  // If no numeric token found, maybe the string only has name (e.g., "卵") => default count 1
  // Also if it contains '少々' or '適量' treat as count 0 (no subtraction)
  if (/少々|適量|適宜/.test(raw))
    return { amount: 0, unit: "unknown", raw, note: "ambiguous" };

  // If it contains '個' somewhere without number, assume 1
  if (raw.match(/個/)) return { amount: 1, unit: "count", raw };

  // Fallback: treat as count 1 (we will subtract 1)
  return { amount: 1, unit: "count", raw, note: "fallback-count-1" };
}

function normalizeName(name: string): string {
  if (!name) return "";
  let s = String(name).toLowerCase();
  // remove content in parentheses
  s = s.replace(/\(.*?\)|（.*?）/g, "");
  // remove punctuation
  s = s.replace(
    /[^0-9a-z\u3040-\u30ff\u4e00-\u9faf\u3000-\u303fぁ-んーァ-ン一-龠々\s]/g,
    " ",
  );
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawItems: Item[] = Array.isArray(body.items) ? body.items : [];
    const usedRaw: any[] = Array.isArray(body.usedIngredients)
      ? body.usedIngredients
      : [];

    // Defensive copy
    const items = rawItems.map((it) => ({ ...it }));

    // Parse used ingredients: accept either {name, quantity, unit} or plain strings
    const usedParsed = usedRaw
      .map((u) => {
        if (!u) return null;
        if (typeof u === "string") {
          const q = parseQuantityText(u);
          // Remove trailing numeric/units to extract probable name
          const name = String(u)
            .replace(
              /[\d.,\/\s\-〜~]*(ml|l|g|kg|個|枚|本|カップ|cup|cups|tsp|tbsp)?\s*$/i,
              "",
            )
            .trim();
          return { name: name || q.raw || u, parsed: q, raw: u };
        } else if (typeof u === "object") {
          // Structured: {name, quantity, unit}
          if (u.quantity && u.unit) {
            const combined = `${u.name ?? ""} ${u.quantity}${u.unit}`;
            const q = parseQuantityText(combined);
            return {
              name: u.name ?? u.label ?? combined,
              parsed: q,
              raw: combined,
            };
          }
          if (u.quantity && !u.unit) {
            // assume count
            return {
              name: u.name ?? u.label ?? "",
              parsed: { amount: Number(u.quantity) || 0, unit: "count" },
              raw: JSON.stringify(u),
            };
          }
          return {
            name: u.name || u.label || JSON.stringify(u),
            parsed: { amount: 1, unit: "count" },
            raw: JSON.stringify(u),
          };
        }
        return null;
      })
      .filter(Boolean) as {
      name: string;
      parsed: { amount: number; unit: string; raw?: string };
      raw: string;
    }[];

    // Helper: find best matching item index for a used ingredient name
    function findMatchIndex(useName: string) {
      const target = normalizeName(useName);
      // 1) direct include (item name includes target)
      for (let i = 0; i < items.length; i++) {
        const iname = normalizeName(items[i].name || "");
        if (!iname) continue;
        if (iname.includes(target) || target.includes(iname)) return i;
      }
      // 2) token match (split words)
      const tokens = target.split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const iname = normalizeName(items[i].name || "");
          for (const t of tokens) {
            if (iname.includes(t)) return i;
          }
        }
      }
      // 3) fallback: startsWith/includes
      for (let i = 0; i < items.length; i++) {
        const iname = normalizeName(items[i].name || "");
        if (iname && (iname.startsWith(target) || target.startsWith(iname)))
          return i;
      }
      return -1;
    }

    // Iterate usedParsed and subtract quantities
    for (const u of usedParsed) {
      const idx = findMatchIndex(u.name);
      if (idx < 0) {
        // No match found — skip
        continue;
      }
      const targetItem = items[idx];
      const itemQty = Number(targetItem.quantity) || 0;
      const itemUnit = (targetItem.unit || "").toLowerCase();

      const usedAmount = Number(u.parsed.amount || 0);
      const usedUnit = (u.parsed.unit || "").toLowerCase();

      let newQty = itemQty;

      if (usedUnit === "ml" && (itemUnit === "ml" || /l|ml/.test(itemUnit))) {
        newQty = Math.max(0, itemQty - usedAmount);
      } else if (
        usedUnit === "g" &&
        (itemUnit === "g" || /kg|g/.test(itemUnit))
      ) {
        newQty = Math.max(0, itemQty - usedAmount);
      } else if (
        usedUnit === "count" &&
        (itemUnit === "" || /個|枚|本|count/.test(itemUnit))
      ) {
        newQty = Math.max(0, itemQty - usedAmount);
      } else {
        const iname = (targetItem.name || "").toLowerCase();
        if (
          iname.includes("牛乳") ||
          iname.includes("ミルク") ||
          iname.includes("milk") ||
          iname.includes("ジュース") ||
          iname.includes("水")
        ) {
          if (usedUnit === "ml") newQty = Math.max(0, itemQty - usedAmount);
          else if (usedUnit === "g") newQty = Math.max(0, itemQty - usedAmount);
          else if (usedUnit === "count")
            newQty = Math.max(0, itemQty - usedAmount);
          else newQty = Math.max(0, itemQty - (usedAmount || 0));
        } else {
          // Fallback: subtract as count if unknown
          newQty = Math.max(0, itemQty - (usedAmount || 1));
        }
      }

      items[idx].quantity = Number(Number(newQty).toFixed(3));
    }

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("completeMenu error:", err);
    return NextResponse.json(
      { error: "在庫の更新中に問題が発生しました。" },
      { status: 500 },
    );
  }
}
