import webpush from 'web-push';
import type { Env } from './core-utils';
import { PushSubscriptionEntity } from './entities';
import type { PushSubscriptionRecord } from '@shared/types';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
};

export class PushDeliveryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = 'PushDeliveryError';
  }
}

export function getPushConfiguration(env: Env) {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim();
  return {
    publicKey: publicKey || null,
    configured: Boolean(publicKey && privateKey && subject),
    privateKey,
    subject,
  };
}

function configureWebPush(env: Env) {
  const config = getPushConfiguration(env);
  if (!config.configured || !config.publicKey || !config.privateKey || !config.subject) {
    throw new Error('Web Push is not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.');
  }
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
}

export async function sendPushToSubscription(
  env: Env,
  subscription: PushSubscriptionRecord,
  payload: PushPayload,
) {
  configureWebPush(env);
  if (!subscription.keys.p256dh || !subscription.keys.auth) {
    throw new Error('Push subscription is missing encryption keys.');
  }

  const request = webpush.generateRequestDetails(
    {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    },
    JSON.stringify({
      ...payload,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-96.png',
      url: payload.url || '/tickets',
    }),
    { TTL: 60 * 60, urgency: 'high', topic: payload.tag?.slice(0, 32) },
  );

  const response = await fetch(request.endpoint, {
    method: request.method,
    headers: request.headers,
    body: request.body ? Uint8Array.from(request.body).buffer : undefined,
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new PushDeliveryError(
      `Push service rejected delivery (${response.status})`,
      response.status,
      responseBody,
    );
  }
}

export async function sendPushToAll(env: Env, payload: PushPayload) {
  if (!getPushConfiguration(env).configured) {
    return { configured: false, sent: 0, failed: 0, removed: 0 };
  }

  const { items } = await PushSubscriptionEntity.list(env, null, 100);
  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(items.map(async (subscription: PushSubscriptionRecord) => {
    try {
      await sendPushToSubscription(env, subscription, payload);
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode =
        error instanceof PushDeliveryError
          ? error.statusCode
          : error instanceof webpush.WebPushError
            ? error.statusCode
            : 0;
      if (statusCode === 404 || statusCode === 410) {
        await PushSubscriptionEntity.delete(env, subscription.id);
        removed += 1;
      } else {
        console.error('[PUSH DELIVERY]', subscription.id, error);
      }
    }
  }));

  return { configured: true, sent, failed, removed };
}
