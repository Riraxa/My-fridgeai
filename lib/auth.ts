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
          // セキュリティ強化
          hd: process.env.ALLOWED_DOMAIN, // 特定ドメインのみ許可（必要に応じて）
        },
      },
      allowDangerousEmailAccountLinking: false,
      // 追加のセキュリティオプション
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email?.toLowerCase()?.trim(),
          name: profile.name,
          image: profile.picture,
          // メールドメイン検証
          emailVerified: profile.email_verified ? new Date() : null,
          isPro: false,
        };
      },
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
            // verifyTokenを確実にクリア
            await prisma.user.update({
              where: { id: user.id },
              data: {
                verifyToken: null,
                verifyTokenCreatedAt: null,
                // authMethodが未設定の場合はpassword_onlyに設定
                authMethod: user.authMethod || "password_only",
              },
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
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return null;
        if (user.status !== "active") return null;
        if (!user.emailVerified) return null;
        if (!user.password) return null;

        const ok = await compare(credentials.password, user.password);
        if (!ok) return null;

        // auth_methodチェック：passkey_enabledユーザーはパスワードログインを禁止
        // UX改善：エラーではなく適切な案内メッセージを返す
        if ((user as any).authMethod === "passkey_enabled") {
          console.warn(
            `[auth] Password login attempted for passkey_enabled user: ${email}`,
          );
          // NextAuthがエラーとして扱う特殊な値を返す
          throw new Error("PASSKEY_ONLY");
        }

        const result = {
          id: user.id,
          email: user.email ?? null,
          name: user.name ?? null,
        } as any;

        // password_onlyユーザーにはパスキー設定誘導フラグを追加
        if ((user as any).authMethod === "password_only") {
          (result as any).requirePasskeySetup = true;
        }

        return result;
      },
    }),
  ],

  session: {
    strategy: "jwt", // JWTストラテジーに変更して安定性を向上
    maxAge: 30 * 24 * 60 * 60, // 30日
    updateAge: 24 * 60 * 60, // 1日ごとに更新
  },

  cookies: {
    sessionToken: {
      name: isProd
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
        domain: undefined,
      },
    },
  },

  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
    error: "/login", // エラー時もログインページに戻り、クエリパラメータでエラー種別を渡す
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

    async session({ session, token }) {
      // JWTストラテジーの場合、token引数にJWTトークン情報が入ってくる
      if (session.user && token?.sub) {
        session.user.id = token.sub;

        // 追加のユーザー情報をDBから確実に取得
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              plan: true,
              cancelAtPeriodEnd: true,
              stripeCurrentPeriodEnd: true,
              passkeySetupCompleted: true,
              name: true,
              image: true,
            },
          });

          if (dbUser) {
            const plan = dbUser.plan || "FREE";
            (session.user as any).plan = plan;
            (session.user as any).isPro = plan === "PRO";
            (session.user as any).cancelAtPeriodEnd = dbUser.cancelAtPeriodEnd;
            (session.user as any).stripeCurrentPeriodEnd =
              dbUser.stripeCurrentPeriodEnd;
            (session.user as any).passkeySetupCompleted =
              dbUser.passkeySetupCompleted ?? false;

            // 名前と画像をDBから最新のもので上書き
            if (dbUser.name) session.user.name = dbUser.name;
            if (dbUser.image) session.user.image = dbUser.image;
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

    async jwt({ token, user, account }) {
      // JWTコールバックで追加情報をトークンに保存
      if (user) {
        token.id = user.id;
      }

      // パスキー設定が必要なユーザーのフラグを追加
      if (user && (user as any).requirePasskeySetup) {
        token.requirePasskeySetup = true;
      }

      return token;
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
