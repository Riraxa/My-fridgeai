// lib/auth.ts
import NextAuth, { AuthError, CredentialsSignin } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";

interface ExtendedUser {
  id: string;
  email: string | null;
  name: string | null;
  password: string;
  authMethod?: "password_only" | "passkey_enabled";
}

class PasskeyOnlyError extends CredentialsSignin {
  override code = "PASSKEY_ONLY";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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
          hd: process.env.ALLOWED_DOMAIN,
        },
      },
      allowDangerousEmailAccountLinking: false,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email?.toLowerCase()?.trim(),
          name: profile.name,
          image: profile.picture,
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
              verifyToken: credentials.token as string,
              status: "active",
            },
          });

          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                verifyToken: null,
                verifyTokenCreatedAt: null,
                authMethod: user.authMethod || "password_only",
              },
            });

            return {
              id: user.id,
              email: user.email ?? null,
              name: user.name ?? null,
            };
          }
          return null;
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return null;
        if (user.status !== "active") return null;
        if (!user.emailVerified) return null;

        // パスキーが有効な場合は即座にエラー
        if ((user as ExtendedUser).authMethod === "passkey_enabled") {
          console.warn(`[auth] Password login attempted for passkey_enabled user: ${email}`);
          throw new PasskeyOnlyError();
        }

        if (!user.password) return null;

        const ok = await compare(credentials.password as string, user.password);
        if (!ok) return null;

        const result = {
          id: user.id,
          email: user.email ?? null,
          name: user.name ?? null,
          requirePasskeySetup: (user as ExtendedUser).authMethod === "password_only"
        };

        return result;
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
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
        const email = (profile as { email?: string })?.email?.toLowerCase()?.trim();

        if (!email) {
          console.log("[Google OAuth] メールアドレスを取得できませんでした");
          return false; // Auth.js では文字列または boolean を返す
        }

        let loginType = "login";
        try {
          const cookieStore = await cookies();
          loginType = cookieStore.get("google_auth_type")?.value ?? "login";
        } catch {
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
            if (existingAccount.user.status !== "active") return false;
            return true;
          }
          if (existingUser) {
            if (existingUser.status !== "active") return false;
            if (!existingUser.emailVerified) return false;

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
          return false;
        }

        if (loginType === "signup") {
          if (existingAccount || existingUser) return false;

          try {
            const newUser = await prisma.user.create({
              data: {
                email: email,
                name: (profile as { name?: string })?.name ?? null,
                image: (profile as { picture?: string })?.picture ?? null,
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
          } catch {
            return false;
          }
        }
        return false;
      }
      return false;
    },

    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub;
        (session as { authTime?: number }).authTime = token.iat;

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
              accounts: {
                select: { provider: true }
              }
            },
          });

          if (dbUser) {
            const plan = dbUser.plan || "FREE";
            (session.user as { plan?: string }).plan = plan;
            (session.user as { isPro?: boolean }).isPro = plan === "PRO";
            (session.user as { cancelAtPeriodEnd?: boolean }).cancelAtPeriodEnd = dbUser.cancelAtPeriodEnd;
            (session.user as { stripeCurrentPeriodEnd?: Date | null }).stripeCurrentPeriodEnd = dbUser.stripeCurrentPeriodEnd;
            (session.user as { passkeySetupCompleted?: boolean }).passkeySetupCompleted = dbUser.passkeySetupCompleted ?? false;
            (session.user as { accounts?: Array<{ provider: string }> }).accounts = dbUser.accounts;

            if (dbUser.name) session.user.name = dbUser.name;
            if (dbUser.image) session.user.image = dbUser.image;
            if (token.provider && typeof token.provider === "string") {
              session.user.provider = token.provider;
            }
          }
        } catch {
          console.error("Failed to fetch extended user data in session callback");
        }
      }
      return session;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        if ((user as { requirePasskeySetup?: boolean }).requirePasskeySetup) {
          token.requirePasskeySetup = true;
        }
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) return url;
      } catch { }
      return baseUrl;
    },
  },

  debug: false,
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});

