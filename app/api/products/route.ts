// app/api/products/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { validateJWTToken, sanitizeString } from "@/lib/security";
import { addApiSecurityHeaders } from "@/lib/securityHeaders";

// GET: ユーザーの加工食品商品一覧
export async function GET(req: NextRequest) {
    try {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
            secureCookie: process.env.NODE_ENV === "production",
        });

        if (!token) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }

        const tokenValidation = validateJWTToken(token);
        if (!tokenValidation.valid) {
            return NextResponse.json(
                { error: "無効なトークンです" },
                { status: 401 },
            );
        }

        const userId = tokenValidation.userId!;
        const products = await prisma.product.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        return addApiSecurityHeaders(NextResponse.json({ products }));
    } catch (e) {
        console.error("products API error:", e);
        return addApiSecurityHeaders(
            NextResponse.json(
                { error: "商品リストの取得に失敗しました" },
                { status: 500 },
            ),
        );
    }
}

// POST: 新規加工食品商品を登録
export async function POST(req: NextRequest) {
    try {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
            secureCookie: process.env.NODE_ENV === "production",
        });

        if (!token) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
        }

        const tokenValidation = validateJWTToken(token);
        if (!tokenValidation.valid) {
            return NextResponse.json(
                { error: "無効なトークンです" },
                { status: 401 },
            );
        }

        const userId = tokenValidation.userId!;
        const body = await req.json();

        // バリデーション
        const name = sanitizeString(body.name, 200);
        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: "商品名は必須です" },
                { status: 400 },
            );
        }

        const brandName = body.brandName
            ? sanitizeString(body.brandName, 100)
            : null;

        // ingredientType validation
        const validTypes = ["processed_base", "instant_complete"];
        const ingredientType = validTypes.includes(body.ingredientType)
            ? body.ingredientType
            : "processed_base";

        // requiresAdditionalIngredients validation
        let requiresAdditionalIngredients: any[] = [];
        if (Array.isArray(body.requiresAdditionalIngredients)) {
            requiresAdditionalIngredients = body.requiresAdditionalIngredients
                .filter((item: any) => item && typeof item.name === "string")
                .map((item: any) => ({
                    name: sanitizeString(item.name, 50),
                    amount: Number(item.amount) || 1,
                    unit: sanitizeString(item.unit || "個", 20),
                }));
        }

        const instructionTemplate = body.instructionTemplate
            ? sanitizeString(body.instructionTemplate, 500)
            : ingredientType === "instant_complete"
                ? "商品操作手順に従い準備する"
                : `商品操作手順に従い、${name}を仕上げる`;

        const category = body.category
            ? sanitizeString(body.category, 50)
            : "加工食品";

        const barcode = body.barcode
            ? sanitizeString(body.barcode, 50)
            : null;

        const product = await prisma.product.create({
            data: {
                userId,
                name,
                brandName,
                ingredientType,
                requiresAdditionalIngredients,
                instructionTemplate,
                nutritionEstimate: body.nutritionEstimate || null,
                barcode,
                category,
            },
        });

        return addApiSecurityHeaders(
            NextResponse.json({ product }),
        );
    } catch (e) {
        console.error("product create error:", e);
        return addApiSecurityHeaders(
            NextResponse.json(
                { error: "商品の登録に失敗しました" },
                { status: 500 },
            ),
        );
    }
}
