// lib/auth.ts
import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";

const isProd = process.env.NODE_ENV === "production";

// 本番環境ではNextAuth URLを明示的に設定
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // 信頼されるホストを明示的に指定してリファラーチェックを緩和
  ...(isProd && {
    trustHost: true,
  }),

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
        console.log("[AUTH_DEBUG] authorize called");
        if (credentials?.token) {
          console.log("[AUTH_DEBUG] verifying token login");
          const user = await prisma.user.findFirst({
            where: {
              verifyToken: credentials.token,
              status: "active",
            },
          });
          console.log("[AUTH_DEBUG] token user found:", !!user);
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

        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH_DEBUG] missing credentials");
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        console.log("[AUTH_DEBUG] finding user by email:", email);
        const user = await prisma.user.findUnique({ where: { email } });
        console.log("[AUTH_DEBUG] user found:", !!user);

        if (!user) return null;
        if (user.status !== "active") {
          console.log("[AUTH_DEBUG] user not active");
          return null;
        }
        if (!user.emailVerified) {
          console.log("[AUTH_DEBUG] user email not verified");
          return null;
        }
        if (!user.password) {
          console.log("[AUTH_DEBUG] user has no password");
          return null;
        }

        console.log("[AUTH_DEBUG] comparing password");
        const ok = await compare(credentials.password, user.password);
        console.log("[AUTH_DEBUG] password match:", ok);
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
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30日
    updateAge: 24 * 60 * 60, // 1日ごとに更新
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

    async session({ session, user }) {
      // Database Sessionの場合、user引数にDBのユーザー情報が入ってくる
      if (session.user && user) {
        session.user.id = user.id;

        // 追加のユーザー情報をDBから確実に取得
        // (Adapterが返すuserオブジェクトにはカスタムフィールドが含まれない場合があるため)
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              plan: true,
              cancelAtPeriodEnd: true,
              stripeCurrentPeriodEnd: true,
              passkeySetupCompleted: true,
            },
          });

          if (dbUser) {
            const plan = dbUser.plan || "FREE";
            (session.user as any).plan = plan;
            (session.user as any).isPro = plan === "PRO" || plan === "MEMBER";
            (session.user as any).cancelAtPeriodEnd = dbUser.cancelAtPeriodEnd;
            (session.user as any).stripeCurrentPeriodEnd =
              dbUser.stripeCurrentPeriodEnd;
            (session.user as any).passkeySetupCompleted =
              dbUser.passkeySetupCompleted ?? false;
          }
        } catch (e) {
          console.error(
            "Failed to fetch extended user data in session callback",
            e,
          );
        }

        (session.user as any).accounts = [];
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

  debug: false,
  secret: process.env.NEXTAUTH_SECRET,
};
