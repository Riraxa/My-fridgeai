import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimiter";
import { validateAndNormalizeIP } from "@/lib/security";
import { inferBarcodeProductAgent, type BarcodeProductData } from "@/lib/agents/fridge-agent";

// --- API Config ---
const YAHOO_APP_ID = process.env.YAHOO_APP_ID;
const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;

interface RawProductData {
  name: string;
  brands?: string;
  image?: string;
  category_tags?: string[];
  quantity?: string;
}

export interface ProductLookupResult extends BarcodeProductData {
  barcode: string;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Rate Limiting (20 times per minute per user)
  const userId = session.user?.id || "anonymous";
  const ip = validateAndNormalizeIP(req.headers.get("x-forwarded-for"));
  const identifier = `${userId}:${ip}`;
  
  const limiter = await rateLimit(identifier, "BARCODE_LOOKUP", 20, 60);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "リクエスト回数が多すぎます。しばらく待ってから再試行してください。" },
      { 
        status: 429,
        headers: { "X-RateLimit-Reset": limiter.resetTime.toString() }
      }
    );
  }

  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json({ error: "Barcode is required" }, { status: 400 });
  }

  try {
    let rawData: RawProductData | null = null;
    let source = "";

    // 1. Open Food Facts (OFF) - グローバル商品
    rawData = await lookupOFF(barcode);
    if (rawData) source = "openfoodfacts";

    // 2. Yahoo!ショッピング API - 日本国内の商品に強い
    if (!rawData && YAHOO_APP_ID) {
      rawData = await lookupYahoo(barcode);
      if (rawData) source = "yahoo";
    }

    // 3. 楽天 商品検索API - バックアップ
    if (!rawData && RAKUTEN_APP_ID) {
      rawData = await lookupRakuten(barcode);
      if (rawData) source = "rakuten";
    }

    if (!rawData) {
      return NextResponse.json({ success: false, message: "Product not found" });
    }

    // 4. AI推論でカテゴリ・賞味期限・数量を補完
    const inferredData = await inferBarcodeProductAgent({
      name: rawData.name,
      brand: rawData.brands,
      image: rawData.image,
      category_tags: rawData.category_tags,
      quantity: rawData.quantity,
    });

    const result: ProductLookupResult = {
      ...inferredData,
      barcode,
    };

    console.log(`[Barcode API] Found via ${source}:`, {
      name: result.name,
      category: result.category,
      expiry: result.recommendedExpiry,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Barcode Lookup Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function lookupOFF(barcode: string): Promise<RawProductData | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { headers: { "User-Agent": "My-fridgeai - WebApp" } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status === 0) return null;

    const p = data.product;
    return {
      name: p.product_name || p.product_name_ja || "不明な商品",
      brands: p.brands || "",
      image: p.image_url || "",
      category_tags: p.categories_tags || [],
      quantity: p.quantity || "",
    };
  } catch { return null; }
}

async function lookupYahoo(barcode: string): Promise<RawProductData | null> {
  try {
    // V3 Item Search
    const url = `https://shopping.yahooapis.jp/ShoppingWebApi/V3/itemSearch?appid=${YAHOO_APP_ID}&jan_code=${barcode}&results=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (!data.hits || data.hits.length === 0) return null;
    const item = data.hits[0];
    
    return {
      name: item.name,
      brands: item.brand?.name || "",
      image: item.image?.medium || "",
      category_tags: [item.genreCategory?.name].filter(Boolean) as string[],
      quantity: "", // Yahoo API may not provide simple quantity string
    };
  } catch { return null; }
}

async function lookupRakuten(barcode: string): Promise<RawProductData | null> {
  try {
    const url = `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?applicationId=${RAKUTEN_APP_ID}&keyword=${barcode}&hits=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();

    if (!data.Items || data.Items.length === 0) return null;
    const item = data.Items[0].Item;

    return {
      name: item.itemName,
      brands: "", // Rakuten may require different API for brands
      image: item.mediumImageUrls?.[0]?.imageUrl || "",
      category_tags: [],
      quantity: "",
    };
  } catch { return null; }
}
