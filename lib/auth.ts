// GENERATED_BY_AI: 2026-03-25 antigravity
// lib/auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          access_type: "online",
          response_type: "code",
          // hd: process.env.ALLOWED_DOMAIN, // temporarily disabled for testing
        },
      },
      allowDangerousEmailAccountLinking: false,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email?.toLowerCase()?.trim(),
          name: profile.name,
          image: null,
          emailVerified: profile.email_verified ? new Date() : null,
          isPro: false,
        };
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
    error: "/login",
  },

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = (profile as { email?: string })?.email?.toLowerCase()?.trim();
        if (!email) return false;

        let loginType = "login";
        try {
          const cookieStore = await cookies();
          loginType = cookieStore.get("google_auth_type")?.value ?? "login";
        } catch { /* ignore */ }

        const existingAccount = await prisma.account.findFirst({
          where: {
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
          include: { user: true },
        });

        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, status: true, emailVerified: true },
        });

        if (loginType === "login") {
          if (existingAccount) {
            if (existingAccount.user.status !== "active") return false;
            // Update tokens on each login
            await prisma.account.update({
              where: { id: existingAccount.id },
              data: {
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
                image: null,
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
              name: true,
              image: true,
            },
          });

          if (dbUser) {
            const plan = dbUser.plan ?? "FREE";
            (session.user as { plan?: string }).plan = plan;
            (session.user as { isPro?: boolean }).isPro = plan === "PRO";

            if (dbUser.name) session.user.name = dbUser.name;
            if (dbUser.image) session.user.image = dbUser.image;
            if (token.provider && typeof token.provider === "string") {
              (session.user as { provider?: string }).provider = token.provider;
            }
          }
        } catch {
          // Silently ignore session data fetch errors
        }
      }
      return session;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
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

  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});
