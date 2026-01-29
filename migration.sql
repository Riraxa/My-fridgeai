-- UserPreferencesテーブルが存在しない場合のみ作成
CREATE TABLE IF NOT EXISTS "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cookingSkill" TEXT NOT NULL DEFAULT 'intermediate',
    "comfortableMethods" JSONB,
    "avoidMethods" JSONB,
    "kitchenEquipment" JSONB,
    "enableExpirationAlert" BOOLEAN NOT NULL DEFAULT true,
    "alertDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "alertTime" TEXT NOT NULL DEFAULT '07:00',
    "expirationCriticalDays" INTEGER NOT NULL DEFAULT 2,
    "expirationWarningDays" INTEGER NOT NULL DEFAULT 5,
    "expirationPriorityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "tasteJson" JSONB NOT NULL DEFAULT '{}',
    "aiMessageEnabled" BOOLEAN NOT NULL DEFAULT false,
    "proFeaturesUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- ユニークインデックスの作成
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- 外部キー制約の作成（Userテーブルが存在する場合）
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
