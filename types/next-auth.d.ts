import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isPro: boolean;
      plan?: "FREE" | "PRO" | null;
      passkeySetupCompleted: boolean;
      stripeCurrentPeriodEnd?: Date | null;
      cancelAtPeriodEnd?: boolean;
      accounts?: { provider: string }[];
      provider?: string;
    } & DefaultSession["user"];
    authTime?: number;
  }

  interface User {
    id?: string;
    isPro?: boolean;
    plan?: "FREE" | "PRO" | null;
    requirePasskeySetup?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    requirePasskeySetup?: boolean;
    provider?: string;
  }
}
