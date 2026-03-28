// GENERATED_BY_AI: 2026-03-28 Web Push Notification Hook
'use client';

import { useState, useEffect, useCallback } from 'react';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UsePushNotificationReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotification(): UsePushNotificationReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // サポートチェックと初期状態確認
  useEffect(() => {
    const checkSupport = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsSupported(false);
        return;
      }

      setIsSupported(true);

      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSub = await registration.pushManager.getSubscription();
        setIsSubscribed(!!existingSub);
        setSubscription(existingSub);
      } catch (err) {
        // Error checking subscription - silent fail
      }
    };

    checkSupport();
  }, []);

  // 公開鍵取得
  const getPublicKey = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/push/public-key');
      if (!res.ok) throw new Error('Failed to fetch public key');
      const data = await res.json();
      return data.publicKey;
    } catch (err) {
      setError('公開鍵の取得に失敗しました');
      return null;
    }
  };

  // サーバーに購登録
  const sendSubscriptionToServer = async (
    sub: PushSubscriptionData,
    action: 'subscribe' | 'unsubscribe'
  ): Promise<void> => {
    const url = action === 'subscribe' ? '/api/push/subscribe' : '/api/push/unsubscribe';
    const method = action === 'subscribe' ? 'POST' : 'DELETE';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to ${action}`);
    }
  };

  // 購読登録
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('このブラウザはプッシュ通知をサポートしていません');
      return;
    }

    let permission: NotificationPermission;
    try {
      const permResult = Notification.requestPermission();
      if (permResult && typeof permResult.then === 'function') {
        permission = await permResult;
      } else {
        permission = permResult as unknown as NotificationPermission;
      }
    } catch (permError: any) {
      setError(`通知許可の取得に失敗しました: ${permError.message}`);
      return;
    }
    
    if (permission !== 'granted') {
      setError(permission === 'denied' 
        ? '通知がブロックされています。アドレスバー横の鍵/⚙️アイコンをクリックし、「通知」を「許可」に変更してください。' 
        : '通知許可の取得に失敗しました。ブラウザの設定を確認してください。');
      return;
    }

    // 以降の処理は許可が得られてから実行
    setIsLoading(true);
    setError(null);

    try {
      // Service Workerの登録を確認・取得
      let registration = await navigator.serviceWorker.getRegistration();
      
      // Service Workerが登録されていなければ登録
      if (!registration) {
        try {
          registration = await navigator.serviceWorker.register('/sw.js');
          await navigator.serviceWorker.ready;
        } catch (swError: any) {
          throw new Error(`Service Workerの登録に失敗しました: ${swError.message}`);
        }
      }
      
      // activeなSWを取得
      registration = await navigator.serviceWorker.ready;
      
      if (!registration.active) {
        throw new Error('Service Workerがアクティブではありません。ページを再読み込みしてください。');
      }

      // 既存の購読をチェック
      let existingSub;
      try {
        existingSub = await registration.pushManager.getSubscription();
      } catch (subError: any) {
        throw new Error(`購読情報の確認に失敗しました: ${subError.message}`);
      }
      
      if (existingSub) {
        const p256dhKey = existingSub.getKey('p256dh');
        const authKey = existingSub.getKey('auth');
        
        if (!p256dhKey || !authKey) {
          await existingSub.unsubscribe();
        } else {
          const subData: PushSubscriptionData = {
            endpoint: existingSub.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(p256dhKey),
              auth: arrayBufferToBase64(authKey),
            },
          };
          await sendSubscriptionToServer(subData, 'subscribe');
          setSubscription(existingSub);
          setIsSubscribed(true);
          return;
        }
      }

      // 公開鍵取得
      const publicKey = await getPublicKey();
      if (!publicKey) {
        throw new Error('公開鍵が取得できません');
      }

      // Push購読
      let newSubscription;
      try {
        const applicationServerKey = urlBase64ToUint8Array(publicKey);
        
        newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      } catch (subError: any) {
        throw new Error(`プッシュ購読に失敗しました: ${subError.message}`);
      }

      // サーバーに送信
      const p256dhKey = newSubscription.getKey('p256dh');
      const authKey = newSubscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        throw new Error('購読キーの取得に失敗しました');
      }
      
      const subData: PushSubscriptionData = {
        endpoint: newSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(p256dhKey),
          auth: arrayBufferToBase64(authKey),
        },
      };

      await sendSubscriptionToServer(subData, 'subscribe');

      setSubscription(newSubscription);
      setIsSubscribed(true);
    } catch (err: any) {
      setError(err.message || '購読登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // 購読解除
  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      setError('購読情報が見つかりません');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ブラウザ側で解除
      await subscription.unsubscribe();

      // サーバー側で解除
      const subData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: '',
          auth: '',
        },
      };
      await sendSubscriptionToServer(subData, 'unsubscribe');

      setSubscription(null);
      setIsSubscribed(false);
    } catch (err: any) {
      setError(err.message || '購読解除に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}

// Base64URL → Uint8Array 変換
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split('').map((c) => c.charCodeAt(0)));
}

// ArrayBuffer → Base64 変換
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    const byte = bytes[i] ?? 0;
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}
