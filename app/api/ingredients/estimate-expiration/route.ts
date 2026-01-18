import { NextResponse } from "next/server";
import { estimateExpirationDate } from "@/lib/expiration-rules";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { name, purchasedAt } = await req.json();
    const purchaseDate = purchasedAt ? new Date(purchasedAt) : new Date();

    // 1. Rule Based
    const ruleBasedDate = estimateExpirationDate(name, purchaseDate);

    if (ruleBasedDate) {
      return NextResponse.json({
        success: true,
        estimatedExpiration: ruleBasedDate,
        source: "rule",
      });
    }

    // 2. AI Fallback
    const prompt = `
食材「${name}」の一般的な賞味期限（冷蔵保存）を推定してください。
購入日は${purchaseDate.toISOString().split("T")[0]}です。

回答は以下のJSON形式のみで返してください:
{
  "days": 7, // 購入日からの日数
  "confidence": "medium"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (content) {
      const result = JSON.parse(content);
      const days = result.days || 7;
      const aiDate = new Date(purchaseDate);
      aiDate.setDate(aiDate.getDate() + days);

      return NextResponse.json({
        success: true,
        estimatedExpiration: aiDate,
        source: "ai",
      });
    }

    return NextResponse.json({ error: "Could not estimate" }, { status: 400 });
  } catch (error) {
    console.error("Estimation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
