// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";

if (!process.env.NEXTAUTH_URL) {
  throw new Error("NEXTAUTH_URL is not defined in environment variables");
}

import NextAuth, { type NextAuthOptions, type User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";

const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

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

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
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

        console.log(`[Google OAuth] loginType=${loginType}, email=${email}`);

        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            status: true,
            emailVerified: true,
          },
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
            const linkedUser = existingAccount.user;
            if (linkedUser.status !== "active") {
              console.log("[Google login] ユーザーがアクティブではありません");
              return "/login?error=account_inactive";
            }
            console.log(`[Google login] 成功: userId=${linkedUser.id}`);
            return true;
          }

          if (existingUser) {
            if (existingUser.status !== "active") {
              console.log("[Google login] ユーザーがアクティブではありません");
              return "/login?error=account_inactive";
            }
            if (!existingUser.emailVerified) {
              console.log("[Google login] メール未認証ユーザー");
              return "/login?error=email_not_verified";
            }

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

          console.log("[Google login] 未登録ユーザーでログイン拒否");
          return "/login?error=not_registered";
        }

        if (loginType === "signup") {
          if (existingAccount || existingUser) {
            console.log("[Google signup] 既に登録済みユーザーで新規登録拒否");
            return "/register?error=registered_email";
          }

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

            console.log(
              `[Google signup] 新規ユーザー作成成功: userId=${newUser.id}`,
            );

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
              `[Google signup] Account作成成功: userId=${newUser.id}`,
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

        console.log(`[Google OAuth] 不明なloginType: ${loginType}`);
        return "/login?error=not_registered";
      }

      return false;
    },

    async jwt({ token, user, trigger, session }) {
      try {
        const incomingUserId =
          (user as any)?.id ??
          (token as any)?.userId ??
          (token as any)?.sub ??
          null;

        if (incomingUserId) {
          const userId = String(incomingUserId);
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { isPro: true, email: true },
          });

          (token as any).userId = userId;
          (token as any).email =
            dbUser?.email ?? (user as any)?.email ?? (token as any).email;
          (token as any).isPro = Boolean(dbUser?.isPro);
        }
      } catch (e) {
        console.error("jwt callback: DB isPro fetch error:", e);
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
      console.log("🔍🔍🔍 [redirect callback] START 🔍🔍🔍");
      console.log("url:", url);
      console.log("baseUrl:", baseUrl);

      // url に `/home` が含まれているか確認
      if (url.includes("/home")) {
        console.log("✅ [redirect] URL contains /home, returning:", url);
        return url;
      }

      // `/` で始まるなら baseUrl と結合
      if (url.startsWith("/")) {
        const result = `${baseUrl}${url}`;
        console.log("✅ [redirect] URL starts with /, returning:", result);
        return result;
      }

      // baseUrl で始まるなら そのまま
      if (url.startsWith(baseUrl)) {
        console.log("✅ [redirect] URL starts with baseUrl, returning:", url);
        return url;
      }

      // それ以外は /home へ
      const defaultResult = `${baseUrl}/home`;
      console.log("✅ [redirect] Default case, returning:", defaultResult);
      return defaultResult;
    },
  },

  debug: !isProd,
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
