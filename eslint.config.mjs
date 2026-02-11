// eslint.config.mjs
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import securityPlugin from "eslint-plugin-security";

export default [
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/.git/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      // ← ここを追加：TypeScript の型情報を使うための設定
      parserOptions: {
        // `project` に tsconfig を渡すと型情報を使った lint が可能になります
        project: ["./tsconfig.json"],
        // tsconfig の解決を安定させるため、ルートディレクトリを明示
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tseslint,
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
      "security": securityPlugin,
    },
    rules: {
      // TypeScript厳密性
      "@typescript-eslint/no-explicit-any": "error", // anyを禁止
      "@typescript-eslint/no-unused-vars": "error", // 未使用変数をエラー
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-non-null-assertion": "error",

      // Next.js
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-img-element": "error",

      // セキュリティ
      "security/detect-object-injection": "error",
      "security/detect-non-literal-regexp": "error",
      "security/detect-unsafe-regex": "error",
      "security/detect-eval-with-expression": "error",

      // アクセシビリティ
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/alt-text": "error",

      // React Hooks
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
