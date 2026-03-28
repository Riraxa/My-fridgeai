# My-fridgeai 🍎🍳

AIを活用した次世代の食材管理・献立作成アプリケーション。

## 🌟 主な機能

- **🤖 AI 献立生成**: 冷蔵庫にある食材をAIが分析し、最適なレシピを提案。
- **📸 レシート・バーコードスキャン**: Tesseract.js と OpenAI Vision を活用した高度なOCRにより、レシートから食材を自動読み取り。
- **🛡️ 最新の認証システム**: Google / Apple OAuthに一本化した、安全でストレスフリーなログイン体験。
- **📱 PWA 対応**: インストール可能なWebアプリとして、オフライン時でも快適な操作感。
- **📊 インベントリ管理**: 賞味期限アラートや在庫の自動同期機能を搭載。

## 🛠️ 技術スタック

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Hono
- **Database**: PostgreSQL, Prisma (ORM)
- **Auth**: NextAuth.js (v5 Beta) - Google & Apple OAuth
- **AI/ML**: OpenAI GPT-4o, Tesseract.js (OCR)
- **Infrastructure**: Vercel
- **Payments**: Stripe (Pro Plan)

## 🚀 開発環境の構築

### 前提条件
- Node.js >= 20.0.0
- Docker (Postgres実行用、または Supabase/Vercel Postgres)

### セットアップ手順

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/your-repo/my-fridgeai.git
   cd my-fridgeai
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   ```

3. **環境変数の設定**
   `.env.example` を参考に `.env.local` を作成し、必要なAPIキーを設定してください。

4. **データベースの同期**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

## 🧹 最新のアップデート (2026-03)

- **認証システムの刷新**: レガシーなメールアドレス/パスワード認証を廃止し、OAuth（Google/Apple）のみに統合。セキュリティとユーザビリティを大幅に向上させました。
- **コードベースのクリーンアップ**: 未使用のライブラリ（bcryptjs等）や、レガシーな検証コード、不要な大規模データファイルを一掃。
- **パフォーマンス最適化**: 静的アセットの整理と、ビルドプロセスの改善。
- **データベース整備**: 未使用の認証テーブルを削除し、最新のスキーマに最適化。
