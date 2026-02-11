import NextAuth from "next-auth";
import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      emailVerified?: Date | null;
      isPro: boolean;
      plan?: "FREE" | "PRO" | null;
      accounts?: Array<{
        provider: string;
        type: string;
        providerAccountId: string;
      }> | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    emailVerified?: Date | null;
    isPro: boolean;
    plan?: "FREE" | "PRO" | null;
  }

  interface JWT {
    id?: string;
    isPro?: boolean;
    plan?: "FREE" | "PRO" | null;
    emailVerified?: Date | null;
  }
}

// より厳密な型ガード
export function isValidSession(session: unknown): session is Session {
  return (
    typeof session === "object" &&
    session !== null &&
    "user" in session &&
    typeof (session as any).user?.id === "string"
  );
}
