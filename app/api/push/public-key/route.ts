// GENERATED_BY_AI: 2026-03-28 Web Push Public Key API
// GET /api/push/public-key - VAPID公開鍵を取得
import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID public key not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey });
}
