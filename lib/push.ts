// GENERATED_BY_AI: 2026-03-28 Web Push utility library
import webpush from 'web-push';

let isVapidInitialized = false;

function initializeVapid() {
  if (isVapidInitialized) return;
  
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? '';
  const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:admin@my-fridgeai.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[Push] VAPID keys not configured, push notifications will be disabled');
    return;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  isVapidInitialized = true;
  console.log('[Push] VAPID configured successfully');
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  options?: NotificationOptions;
}

/**
 * プッシュ通知を送信
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<void> {
  initializeVapid();
  
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? '';
  
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys are not configured');
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );
  } catch (error: any) {
    // 購読が無効な場合（410 Goneなど）
    if (error.statusCode === 410 || error.statusCode === 404) {
      throw new Error('Subscription expired or invalid');
    }
    throw error;
  }
}

/**
 * 複数デバイスに一斉送信
 */
export async function sendPushToMultiple(
  subscriptions: PushSubscriptionData[],
  payload: PushPayload
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await sendPushNotification(sub, payload);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(error.message);
      }
    })
  );

  return results;
}

export { webpush };
