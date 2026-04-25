import { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
  },
  // セキュリティヘッダーの追加
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/blog/refrigerator-management', destination: '/features/inventory', permanent: true },
      { source: '/features/refrigerator-management', destination: '/features/inventory', permanent: true },
      { source: '/blog/ai-meal-planning', destination: '/features/ai-menu', permanent: true },
      { source: '/features/ai-meal-planning', destination: '/features/ai-menu', permanent: true },
      { source: '/blog/reduce-food-waste', destination: '/features/reduce-food-waste', permanent: true },
      { source: '/blog/recipe-from-fridge', destination: '/features/recipe-from-fridge', permanent: true },
      { source: '/blog/leftover-ingredients-recipes', destination: '/features/leftover-ingredients-recipes', permanent: true },
      { source: '/feature/ai-menu', destination: '/features/ai-menu', permanent: true },
      { source: '/feature/inventory', destination: '/features/inventory', permanent: true },
      { source: '/feature/receipt-scan', destination: '/features/receipt-scan', permanent: true },
      { source: '/ingredients-recipes', destination: '/features/ingredients-recipes', permanent: true },
      { source: '/ingredients-recipes/:path*', destination: '/features/ingredients-recipes/:path*', permanent: true },
    ];
  },
  // Turbopack設定
  turbopack: {
    // Turbopackのカスタム設定が必要な場合はここに追加
  },
};

const withPWAConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

export default withPWAConfig(nextConfig);
