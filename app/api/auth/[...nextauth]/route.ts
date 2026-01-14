// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";

if (!process.env.NEXTAUTH_URL) {
  throw new Error("NEXTAUTH_URL is not defined in environment variables");
}

import NextAuth, { type NextAuthOptions, type User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
// EmailProvider intentionally removed to avoid duplicate emails with custom flow
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";

const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    // Google OAuth
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
      // Prevent automatic account linking
      allowDangerousEmailAccountLinking: false,
    }),

    // Credentials (email + password) — keep behavior identical to before
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" },
      },

      async authorize(
        credentials: Record<"email" | "password" | "token", string> | undefined,
        req: any,
      ): Promise<User | null> {
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
            } as User;
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

        const result: Partial<User> = {
          id: user.id,
          email: user.email ?? null,
          name: user.name ?? null,
        };

        return result as User;
      },
    }),
  ],

  // Session: JWT strategy with production-friendly cookie settings
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
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
      // Credentials provider - standard handling
      if (account?.provider === "credentials") {
        if (!user?.id) return false;
        return true;
      }

      // Google OAuth handling
      if (account?.provider === "google") {
        const email = (profile as any)?.email?.toLowerCase()?.trim();

        if (!email) {
          console.log("[Google OAuth] メールアドレスを取得できませんでした");
          return "/login?error=no_email_from_provider";
        }

        // Get loginType from cookie (set by client before OAuth redirect)
        let loginType = "login"; // default to login for safety
        try {
          const cookieStore = await cookies();
          loginType = cookieStore.get("google_auth_type")?.value ?? "login";
        } catch (e) {
          console.log("[Google OAuth] Cookie読み取りエラー、login として処理");
        }

        console.log(`[Google OAuth] loginType=${loginType}, email=${email}`);

        // Check if user exists in DB
        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            status: true,
            emailVerified: true,
          },
        });

        // Check for existing Account link
        const existingAccount = await prisma.account.findFirst({
          where: {
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
          include: { user: true },
        });

        // ========== LOGIN FLOW ==========
        if (loginType === "login") {
          if (existingAccount) {
            // User has previously logged in with Google
            const linkedUser = existingAccount.user;
            if (linkedUser.status !== "active") {
              console.log("[Google login] ユーザーがアクティブではありません");
              return "/login?error=account_inactive";
            }
            console.log(`[Google login] 成功: userId=${linkedUser.id}`);
            return true;
          }

          if (existingUser) {
            // User exists but no Google account linked
            // Link the account and allow login
            if (existingUser.status !== "active") {
              console.log("[Google login] ユーザーがアクティブではありません");
              return "/login?error=account_inactive";
            }
            if (!existingUser.emailVerified) {
              console.log("[Google login] メール未認証ユーザー");
              return "/login?error=email_not_verified";
            }

            // Link Google account to existing user
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

            console.log(
              `[Google login] 既存ユーザーにリンク: userId=${existingUser.id}`,
            );
            return true;
          }

          // No existing user - reject login for unregistered account
          console.log("[Google login] 未登録ユーザーでログイン拒否");
          return "/login?error=not_registered";
        }

        // ========== SIGNUP FLOW ==========
        if (loginType === "signup") {
          if (existingAccount || existingUser) {
            // User or account already exists - reject signup
            console.log("[Google signup] 既に登録済みユーザーで新規登録拒否");
            return "/register?error=registered_email";
          }

          // Create new user
          try {
            const newUser = await prisma.user.create({
              data: {
                email: email,
                name: (profile as any)?.name ?? null,
                image: (profile as any)?.picture ?? null,
                emailVerified: new Date(),
                status: "active",
                isPro: false,
              },
            });

            // Create the account link
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

            console.log(
              `[Google signup] 新規ユーザー作成成功: userId=${newUser.id}`,
            );
            return true;
          } catch (err: any) {
            if (err?.code === "P2002") {
              console.log("[Google signup] 競合: メールアドレスが既に存在");
              return "/register?error=registered_email";
            }
            console.error("[Google signup] ユーザー作成エラー:", err);
            return "/login?error=signup_failed";
          }
        }

        // Unknown loginType - default to login behavior (reject unregistered)
        console.log(`[Google OAuth] 不明なloginType: ${loginType}`);
        return "/login?error=not_registered";
      }

      // Other providers - default deny
      return false;
    },

    /**
     * JWT callback
     *
     * 修正方針（このブロックが今回の重要箇所）:
     * - どのタイミングでも最新の isPro を参照する（DBを必ず確認）
     * - user または既存 token から userId を決定し、DBを読み最新フラグを token に反映する
     * - 既存の trigger 判定には依存しない（Webhook 後すぐ反映されるようにするため）
     */
    async jwt({ token, user, trigger, session }) {
      try {
        // Determine userId from incoming user (login) or existing token
        const incomingUserId =
          (user as any)?.id ??
          (token as any)?.userId ??
          (token as any)?.sub ??
          null;
        if (incomingUserId) {
          const userId = String(incomingUserId);
          // Always attempt to fetch latest isPro from DB for this userId
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { isPro: true, email: true },
          });

          // ensure token fields are set/updated from DB
          (token as any).userId = userId;
          (token as any).email =
            dbUser?.email ?? (user as any)?.email ?? (token as any).email;
          (token as any).isPro = Boolean(dbUser?.isPro);
        }
      } catch (e) {
        console.error("jwt callback: DB isPro fetch error:", e);
        // Fallback: do not mutate token.isPro here to avoid accidental downgrade
        // but ensure token has some structure
        (token as any).isPro = (token as any).isPro ?? false;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).userId;
        (session.user as any).email = (token as any).email;
        (session.user as any).isPro = (token as any).isPro || false;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Handle custom error redirects
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/home`;
    },
  },

  debug: !isProd,
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
