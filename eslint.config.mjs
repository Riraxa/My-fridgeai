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
      // TypeScript厳密性 - 段階的導入
      "@typescript-eslint/no-explicit-any": "warn", // anyを警告に緩和
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], // 警告に緩和
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Next.js - 重要なものはerrorのまま
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-img-element": "warn", // 警告に緩和

      // セキュリティ - 段階的導入
      "security/detect-object-injection": "off", // 一時的に無効化
      "security/detect-non-literal-regexp": "warn",
      "security/detect-unsafe-regex": "warn", // 警告に緩和
      "security/detect-eval-with-expression": "error",

      // アクセシビリティ - 重要なものはerrorのまま
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/alt-text": "warn", // 警告に緩和

      // React Hooks - 重要なものはerrorのまま
      "react-hooks/exhaustive-deps": "warn", // 警告に緩和
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
