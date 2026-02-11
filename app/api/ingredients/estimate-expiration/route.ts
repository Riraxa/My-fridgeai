//app/api/ingredients/estimate-expiration/route.ts
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

    // ルールベースのカテゴリ推定
    const estimateCategory = (itemName: string): string => {
      const lowerName = itemName.toLowerCase();

      // 冷凍食品
      if (
        lowerName.includes("冷凍") ||
        lowerName.includes("フローズン") ||
        lowerName.includes("アイス") ||
        lowerName.includes("シャーベット")
      )
        return "冷凍";

      // 野菜類
      if (
        lowerName.includes("野菜") ||
        lowerName.includes("キャベツ") ||
        lowerName.includes("レタス") ||
        lowerName.includes("人参") ||
        lowerName.includes("じゃがいも") ||
        lowerName.includes("玉ねぎ") ||
        lowerName.includes("トマト") ||
        lowerName.includes("きゅうり") ||
        lowerName.includes("ピーマン") ||
        lowerName.includes("なす") ||
        lowerName.includes("ほうれん草") ||
        lowerName.includes("小松菜") ||
        lowerName.includes("大根") ||
        lowerName.includes("白菜") ||
        lowerName.includes("ネギ") ||
        lowerName.includes("ブロッコリー") ||
        lowerName.includes("カリフラワー") ||
        lowerName.includes("アスパラ") ||
        lowerName.includes("もやし") ||
        lowerName.includes("きのこ") ||
        lowerName.includes("しめじ") ||
        lowerName.includes("えのき") ||
        lowerName.includes("まいたけ") ||
        lowerName.includes("しいたけ") ||
        lowerName.includes("ごぼう") ||
        lowerName.includes("れんこん") ||
        lowerName.includes("かぼちゃ") ||
        lowerName.includes("とうもろこし") ||
        lowerName.includes("オクラ") ||
        lowerName.includes("にら") ||
        lowerName.includes("三つ葉") ||
        lowerName.includes("春菊") ||
        lowerName.includes("セロリ") ||
        lowerName.includes("パセリ") ||
        lowerName.includes("バジル") ||
        lowerName.includes("ミント") ||
        lowerName.includes("山芋") ||
        lowerName.includes("長芋") ||
        lowerName.includes("里芋") ||
        lowerName.includes("さつまいも") ||
        lowerName.includes("山菜") ||
        lowerName.includes("豆苗")
      )
        return "野菜";

      // 果物類
      if (
        lowerName.includes("りんご") ||
        lowerName.includes("リンゴ") ||
        lowerName.includes("ぶどう") ||
        lowerName.includes("ブドウ") ||
        lowerName.includes("みかん") ||
        lowerName.includes("ミカン") ||
        lowerName.includes("オレンジ") ||
        lowerName.includes("レモン") ||
        lowerName.includes("ライム") ||
        lowerName.includes("バナナ") ||
        lowerName.includes("いちご") ||
        lowerName.includes("イチゴ") ||
        lowerName.includes("もも") ||
        lowerName.includes("モモ") ||
        lowerName.includes("すもも") ||
        lowerName.includes("なし") ||
        lowerName.includes("ナシ") ||
        lowerName.includes("かき") ||
        lowerName.includes("柿") ||
        lowerName.includes("キウイ") ||
        lowerName.includes("パイナップル") ||
        lowerName.includes("メロン") ||
        lowerName.includes("スイカ") ||
        lowerName.includes("アボカド") ||
        lowerName.includes("マンゴー") ||
        lowerName.includes("ブルーベリー") ||
        lowerName.includes("ラズベリー") ||
        lowerName.includes("いちじく") ||
        lowerName.includes("くり") ||
        lowerName.includes("いちじく")
      )
        return "野菜";

      // 調味料・香辛料
      if (
        lowerName.includes("醤油") ||
        lowerName.includes("味噌") ||
        lowerName.includes("ソース") ||
        lowerName.includes("ケチャップ") ||
        lowerName.includes("マヨネーズ") ||
        lowerName.includes("調味料") ||
        lowerName.includes("塩") ||
        lowerName.includes("コショウ") ||
        lowerName.includes("砂糖") ||
        lowerName.includes("酢") ||
        lowerName.includes("みりん") ||
        lowerName.includes("酒") ||
        lowerName.includes("わさび") ||
        lowerName.includes("からし") ||
        lowerName.includes("マスタード") ||
        lowerName.includes("ポン酢") ||
        lowerName.includes("ドレッシング") ||
        lowerName.includes("だし") ||
        lowerName.includes("めんつゆ") ||
        lowerName.includes("うどんつゆ") ||
        lowerName.includes("そばつゆ") ||
        lowerName.includes("焼肉のたれ") ||
        lowerName.includes("焼肉タレ") ||
        lowerName.includes("てんつゆ") ||
        lowerName.includes("オイル") ||
        lowerName.includes("ごま油") ||
        lowerName.includes("オリーブオイル") ||
        lowerName.includes("サラダ油") ||
        lowerName.includes("スパイス") ||
        lowerName.includes("ハーブ") ||
        lowerName.includes("ガーリック") ||
        lowerName.includes("オニオン") ||
        lowerName.includes("パウダー")
      )
        return "調味料";

      // 肉類
      if (
        lowerName.includes("鶏肉") ||
        lowerName.includes("とりにく") ||
        lowerName.includes("鶏") ||
        lowerName.includes("豚肉") ||
        lowerName.includes("ぶたにく") ||
        lowerName.includes("豚") ||
        lowerName.includes("牛肉") ||
        lowerName.includes("うしにく") ||
        lowerName.includes("牛") ||
        lowerName.includes("ひき肉") ||
        lowerName.includes("挽肉") ||
        lowerName.includes("ハム") ||
        lowerName.includes("ベーコン") ||
        lowerName.includes("ソーセージ") ||
        lowerName.includes("ウインナー") ||
        lowerName.includes("ステーキ") ||
        lowerName.includes("焼肉") ||
        lowerName.includes("唐揚げ") ||
        lowerName.includes("からあげ") ||
        lowerName.includes("フライドチキン") ||
        lowerName.includes("ミートボール") ||
        lowerName.includes("ハンバーグ") ||
        lowerName.includes("コロッケ") ||
        lowerName.includes("とんかつ") ||
        lowerName.includes("カツ") ||
        lowerName.includes("フライ") ||
        lowerName.includes("ロース") ||
        lowerName.includes("バラ") ||
        lowerName.includes("もも") ||
        lowerName.includes("手羽")
      )
        return "冷蔵";

      // 魚介類
      if (
        lowerName.includes("魚") ||
        lowerName.includes("さかな") ||
        lowerName.includes("鮭") ||
        lowerName.includes("サーモン") ||
        lowerName.includes("マグロ") ||
        lowerName.includes("鮪") ||
        lowerName.includes("鰹") ||
        lowerName.includes("カツオ") ||
        lowerName.includes("ブリ") ||
        lowerName.includes("鯛") ||
        lowerName.includes("タイ") ||
        lowerName.includes("鱈") ||
        lowerName.includes("タラ") ||
        lowerName.includes("秋刀魚") ||
        lowerName.includes("サンマ") ||
        lowerName.includes("鰯") ||
        lowerName.includes("イワシ") ||
        lowerName.includes("鯵") ||
        lowerName.includes("アジ") ||
        lowerName.includes("鰻") ||
        lowerName.includes("ウナギ") ||
        lowerName.includes("切り身") ||
        lowerName.includes("刺身") ||
        lowerName.includes("寿司") ||
        lowerName.includes("すし") ||
        lowerName.includes("イクラ") ||
        lowerName.includes("たらこ") ||
        lowerName.includes("明太子") ||
        lowerName.includes("ツナ") ||
        lowerName.includes("シーチキン") ||
        lowerName.includes("サーモン") ||
        lowerName.includes("エビ") ||
        lowerName.includes("カニ") ||
        lowerName.includes("ホタテ") ||
        lowerName.includes("アサリ") ||
        lowerName.includes("ハマグリ") ||
        lowerName.includes("牡蠣") ||
        lowerName.includes("カキ") ||
        lowerName.includes("貝")
      )
        return "冷蔵";

      // 乳製品・卵
      if (
        lowerName.includes("牛乳") ||
        lowerName.includes("ぎゅうにゅう") ||
        lowerName.includes("ミルク") ||
        lowerName.includes("チーズ") ||
        lowerName.includes("ヨーグルト") ||
        lowerName.includes("卵") ||
        lowerName.includes("たまご") ||
        lowerName.includes("バター") ||
        lowerName.includes("マーガリン") ||
        lowerName.includes("クリーム") ||
        lowerName.includes("生クリーム") ||
        lowerName.includes("ホイップ") ||
        lowerName.includes("練乳") ||
        lowerName.includes("豆乳") ||
        lowerName.includes("とうにゅう") ||
        lowerName.includes("乳製品") ||
        lowerName.includes("にゅうせいひん")
      )
        return "冷蔵";

      // 穀類・パン・麺類
      if (
        lowerName.includes("米") ||
        lowerName.includes("こめ") ||
        lowerName.includes("ごはん") ||
        lowerName.includes("パン") ||
        lowerName.includes("食パン") ||
        lowerName.includes("バゲット") ||
        lowerName.includes("うどん") ||
        lowerName.includes("そば") ||
        lowerName.includes("パスタ") ||
        lowerName.includes("スパゲッティ") ||
        lowerName.includes("ラーメン") ||
        lowerName.includes("そうめん") ||
        lowerName.includes("ひやむぎ") ||
        lowerName.includes("きしめん") ||
        lowerName.includes("中華そば") ||
        lowerName.includes("即席麺") ||
        lowerName.includes("カップ麺") ||
        lowerName.includes("インスタント") ||
        lowerName.includes("マカロニ") ||
        lowerName.includes("ペンネ") ||
        lowerName.includes("パスタ") ||
        lowerName.includes("シリアル") ||
        lowerName.includes("オートミール") ||
        lowerName.includes("グラノーラ")
      )
        return "その他";

      // 豆製品
      if (
        lowerName.includes("豆腐") ||
        lowerName.includes("とうふ") ||
        lowerName.includes("納豆") ||
        lowerName.includes("油揚げ") ||
        lowerName.includes("厚揚げ") ||
        lowerName.includes("がんもどき") ||
        lowerName.includes("こんにゃく") ||
        lowerName.includes("しらたき") ||
        lowerName.includes("春雨") ||
        lowerName.includes("高野豆腐") ||
        lowerName.includes("凍り豆腐") ||
        lowerName.includes("おから")
      )
        return "冷蔵";

      // 菓子類・デザート
      if (
        lowerName.includes("ケーキ") ||
        lowerName.includes("チョコ") ||
        lowerName.includes("チョコレート") ||
        lowerName.includes("クッキー") ||
        lowerName.includes("ビスケット") ||
        lowerName.includes("クラッカー") ||
        lowerName.includes("ポテトチップス") ||
        lowerName.includes("ポテチ") ||
        lowerName.includes("スナック") ||
        lowerName.includes("飴") ||
        lowerName.includes("キャンディー") ||
        lowerName.includes("ガム") ||
        lowerName.includes("ゼリー") ||
        lowerName.includes("プリン") ||
        lowerName.includes("アイス") ||
        lowerName.includes("シャーベット") ||
        lowerName.includes("和菓子") ||
        lowerName.includes("まんじゅう") ||
        lowerName.includes("だんご") ||
        lowerName.includes("たい焼き") ||
        lowerName.includes("せんべい") ||
        lowerName.includes("おかき") ||
        lowerName.includes("あられ") ||
        lowerName.includes("スイーツ")
      )
        return "その他";

      // 飲料
      if (
        lowerName.includes("コーヒー") ||
        lowerName.includes("紅茶") ||
        lowerName.includes("茶") ||
        lowerName.includes("緑茶") ||
        lowerName.includes("日本茶") ||
        lowerName.includes("烏龍茶") ||
        lowerName.includes("麦茶") ||
        lowerName.includes("ハーブティー") ||
        lowerName.includes("ジュース") ||
        lowerName.includes("オレンジジュース") ||
        lowerName.includes("リンゴジュース") ||
        lowerName.includes("野菜ジュース") ||
        lowerName.includes("トマトジュース") ||
        lowerName.includes("炭酸") ||
        lowerName.includes("コーラ") ||
        lowerName.includes("スプライト") ||
        lowerName.includes("エナジードリンク") ||
        lowerName.includes("スポーツドリンク") ||
        lowerName.includes("ミネラルウォーター") ||
        lowerName.includes("ウォーター") ||
        lowerName.includes("水") ||
        lowerName.includes("お茶") ||
        lowerName.includes("紅茶") ||
        lowerName.includes("コーヒー")
      )
        return "その他";

      // 漬物・加工品
      if (
        lowerName.includes("漬物") ||
        lowerName.includes("梅干し") ||
        lowerName.includes("たくあん") ||
        lowerName.includes("白菜漬け") ||
        lowerName.includes("きゅうりの漬物") ||
        lowerName.includes("味噌漬け") ||
        lowerName.includes("しょうゆ漬け") ||
        lowerName.includes("ぬか漬け") ||
        lowerName.includes("佃煮") ||
        lowerName.includes("煮物") ||
        lowerName.includes("おでん") ||
        lowerName.includes("鍋物") ||
        lowerName.includes("カレー") ||
        lowerName.includes("シチュー") ||
        lowerName.includes("ビーフカレー") ||
        lowerName.includes("チキンカレー") ||
        lowerName.includes("ベジタブルカレー") ||
        lowerName.includes("ポテトサラダ") ||
        lowerName.includes("マカロニサラダ") ||
        lowerName.includes("コールスロー") ||
        lowerName.includes("サラダ") ||
        lowerName.includes("惣菜") ||
        lowerName.includes("そうざい") ||
        lowerName.includes("お惣菜")
      )
        return "冷蔵";

      // デフォルトは冷蔵
      return "冷蔵";
    };

    if (ruleBasedDate) {
      return NextResponse.json({
        success: true,
        estimatedExpiration: ruleBasedDate,
        estimatedCategory: estimateCategory(name),
        source: "rule",
      });
    }

    // 2. AI Fallback
    const prompt = `
食材「${name}」の一般的な賞味期限（冷蔵保存）と適切なカテゴリを推定してください。
購入日は${purchaseDate.toISOString().split("T")[0]}です。

以下の点を考慮して推定してください：

【賞味期限の基準】
- 生鮮食品（肉・魚・生野菜）：1-7日
- 乳製品・卵：7-30日
- 野菜：3-30日（種類による）
- 果物：3-30日（種類による）
- 調味料・香辛料：30日-10年（開封後も考慮）
- 加工食品・缶詰：数ヶ月-数年
- 冷凍食品：数ヶ月-1年
- 乾物・穀類：6ヶ月-2年

【カテゴリ分類】
以下の中から最も適切なものを選んでください：
- 冷蔵（一般的な冷蔵食品、生鮮食品、惣菜等）
- 冷凍（冷凍食品、アイス等）
- 野菜（生野菜、野菜類、ハーブ類）
- 調味料（醤油、味噌、ソース、香辛料等）
- その他（穀類、菓子類、飲料等）

【特別な考慮事項】
- 日本の一般的な家庭での保存条件を想定
- 未開封状態の賞味期限を推定
- 季節による変動は考慮しない
- 特殊な保存方法（冷凍・真空パック等）は考慮しない

回答は以下のJSON形式のみで返してください:
{
  "days": 7, // 購入日からの日数（整数）
  "category": "冷蔵", // 推定カテゴリ
  "confidence": "medium", // high/medium/low
  "reasoning": "推定の根拠（簡潔に）"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message.content;
    if (content) {
      const result = JSON.parse(content);
      const days = result.days || 7;
      const aiDate = new Date(purchaseDate);
      aiDate.setDate(aiDate.getDate() + days);
      const estimatedCategory = result.category || "その他";

      return NextResponse.json({
        success: true,
        estimatedExpiration: aiDate,
        estimatedCategory,
        confidence: result.confidence || "medium",
        reasoning: result.reasoning || "",
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
