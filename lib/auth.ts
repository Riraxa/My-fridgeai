// lib/auth.ts
import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";

const isProd = process.env.NODE_ENV === "production";

// 本番環境でのNextAuth URL設定
const nextAuthUrl =
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

console.log("[NextAuth] Configuration:", {
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  finalUrl: nextAuthUrl,
  isProd,
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // 本番環境でのURL設定を明示的に指定
  ...(isProd && { url: nextAuthUrl }),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
      allowDangerousEmailAccountLinking: false,
    }),

    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" },
      },

      async authorize(credentials) {
        if (credentials?.token) {
          const user = await prisma.user.findFirst({
            where: {
              verifyToken: credentials.token,
              status: "active",
            },
          });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { verifyToken: null, verifyTokenCreatedAt: null },
            });
            return {
              id: user.id,
              email: user.email ?? null,
              name: user.name ?? null,
            } as any;
          }
          return null;
        }

        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return null;
        if (user.status !== "active") return null;
        if (!user.emailVerified) return null;
        if (!user.password) return null;

        const ok = await compare(credentials.password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email ?? null,
          name: user.name ?? null,
        } as any;
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },

  // JWT設定を本番環境用に最適化
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30日
  },

  cookies: {
    sessionToken: {
      name: isProd
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: isProd ? "strict" : "lax",
        path: "/",
        secure: isProd,
        domain: isProd && process.env.VERCEL_URL ? undefined : undefined,
        maxAge: 30 * 24 * 60 * 60, // 30日
      },
    },
  },

  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
    error: "/login",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        if (!user?.id) return false;
        return true;
      }

      if (account?.provider === "google") {
        const email = (profile as any)?.email?.toLowerCase()?.trim();

        if (!email) {
          console.log("[Google OAuth] メールアドレスを取得できませんでした");
          return "/login?error=no_email_from_provider";
        }

        let loginType = "login";
        try {
          const cookieStore = await cookies();
          loginType = cookieStore.get("google_auth_type")?.value ?? "login";
        } catch (e) {
          console.log("[Google OAuth] Cookie読み取りエラー、login として処理");
        }

        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, status: true, emailVerified: true },
        });

        const existingAccount = await prisma.account.findFirst({
          where: {
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
          include: { user: true },
        });

        if (loginType === "login") {
          if (existingAccount) {
            if (existingAccount.user.status !== "active")
              return "/login?error=account_inactive";
            return true;
          }
          if (existingUser) {
            if (existingUser.status !== "active")
              return "/login?error=account_inactive";
            if (!existingUser.emailVerified)
              return "/login?error=email_not_verified";

            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | null,
              },
            });
            return true;
          }
          return "/login?error=not_registered";
        }

        if (loginType === "signup") {
          if (existingAccount || existingUser)
            return "/register?error=registered_email";

          try {
            const newUser = await prisma.user.create({
              data: {
                email: email,
                name: (profile as any)?.name ?? null,
                image: (profile as any)?.picture ?? null,
                emailVerified: new Date(),
                status: "active",
              },
            });

            await prisma.account.create({
              data: {
                userId: newUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | null,
              },
            });
            return true;
          } catch (err: any) {
            return "/login?error=signup_failed";
          }
        }
        return "/login?error=not_registered";
      }
      return false;
    },

    async jwt({ token, user }) {
      try {
        const incomingUserId =
          (user as any)?.id ??
          (token as any)?.userId ??
          (token as any)?.sub ??
          null;
        const email = (user as any)?.email ?? (token as any)?.email ?? null;

        if (incomingUserId) {
          const userId = String(incomingUserId);
          // 1. IDで検索
          let dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              plan: true,
              email: true,
              cancelAtPeriodEnd: true,
              stripeCurrentPeriodEnd: true,
            },
          });

          // 2. IDで見つからず、メールアドレスがある場合はメールで検索（Googleログイン等の初回/再開時の不整合対策）
          if (!dbUser && email) {
            dbUser = await prisma.user.findUnique({
              where: { email: String(email) },
              select: {
                id: true,
                plan: true,
                email: true,
                cancelAtPeriodEnd: true,
                stripeCurrentPeriodEnd: true,
              },
            });
          }

          // 3. アカウント情報を取得
          const accounts: { provider: string }[] = [];
          if (dbUser) {
            const accountData = await prisma.account.findMany({
              where: { userId: dbUser.id },
              select: {
                provider: true,
              },
            });
            accounts.push(...accountData);
          }

          if (dbUser) {
            (token as any).userId = dbUser.id; // DBの正当なCUIDをセット
            (token as any).sub = dbUser.id; // JWTのsubフィールドにも設定
            (token as any).email = dbUser.email ?? email;
            (token as any).plan = dbUser.plan ?? "FREE";
            (token as any).cancelAtPeriodEnd = dbUser.cancelAtPeriodEnd;
            (token as any).stripeCurrentPeriodEnd =
              dbUser.stripeCurrentPeriodEnd;
            (token as any).accounts = accounts; // アカウント情報をセット
          } else {
            // 最悪のフォールバック
            (token as any).userId = userId;
            (token as any).sub = userId; // JWTのsubフィールドにも設定
            (token as any).email = email;
            (token as any).plan = (token as any).plan ?? "FREE";
            (token as any).accounts = [];
          }
        }
      } catch (e) {
        console.error("jwt callback: DB fetch error:", e);
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).userId;
        (session.user as any).email = (token as any).email;
        (session.user as any).plan = (token as any).plan || "FREE";
        (session.user as any).cancelAtPeriodEnd = (
          token as any
        ).cancelAtPeriodEnd;
        (session.user as any).stripeCurrentPeriodEnd = (
          token as any
        ).stripeCurrentPeriodEnd;

        // Proステータスを動的に判定
        const plan = (token as any).plan || "FREE";
        (session.user as any).isPro = plan === "PRO" || plan === "MEMBER";

        // アカウントプロバイダー情報を追加
        (session.user as any).accounts = (token as any).accounts || [];
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // 常に絶対URLを返すように徹底
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) return url;
      } catch (e) {
        // urlが相対パス等の場合にここに来る
      }
      return `${baseUrl}/home`;
    },
  },

  debug: !isProd,
  secret: process.env.NEXTAUTH_SECRET,
};
