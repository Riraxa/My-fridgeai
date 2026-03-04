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
      parserOptions: {
        project: ["./tsconfig.json"],
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
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Next.js - 重要なものはerrorのまま
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-img-element": "warn",

      // セキュリティ - 段階的導入
      "security/detect-object-injection": "off",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-unsafe-regex": "warn",
      "security/detect-eval-with-expression": "error",

      // アクセシビリティ - 重要なものはerrorのまま
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/alt-text": "warn",

      // React Hooks - 重要なものはerrorのまま
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
