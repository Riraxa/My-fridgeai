// lib/stripe.ts
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey && process.env.NODE_ENV === "production") {
    console.error("[Stripe] CRITICAL: STRIPE_SECRET_KEY is missing in production!");
}

export const stripe = stripeKey
    ? new Stripe(stripeKey, {
        apiVersion: "2026-02-25.clover" as any,
        appInfo: {
            name: "My-fridgeai",
            version: "0.1.0",
        },
    })
    : null;

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
