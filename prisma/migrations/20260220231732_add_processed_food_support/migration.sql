-- CreateEnum
CREATE TYPE "IngredientType" AS ENUM ('raw', 'processed_base', 'instant_complete');

-- AlterTable: Add ingredientType and productId to Ingredient
ALTER TABLE "Ingredient" ADD COLUMN "ingredientType" "IngredientType" NOT NULL DEFAULT 'raw';
ALTER TABLE "Ingredient" ADD COLUMN "productId" TEXT;

-- CreateTable: Product
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandName" TEXT,
    "ingredientType" "IngredientType" NOT NULL DEFAULT 'processed_base',
    "requiresAdditionalIngredients" JSONB DEFAULT '[]',
    "instructionTemplate" TEXT,
    "nutritionEstimate" JSONB,
    "barcode" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_userId_idx" ON "Product"("userId");
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
CREATE INDEX "Product_ingredientType_idx" ON "Product"("ingredientType");
CREATE INDEX "Ingredient_ingredientType_idx" ON "Ingredient"("ingredientType");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
