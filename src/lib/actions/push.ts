"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

type SubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeToPush(subscription: SubscriptionInput) {
  const user = await requireUser();

  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId: user.id,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    create: {
      userId: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function unsubscribeFromPush(endpoint: string) {
  await requireUser();
  await db.pushSubscription.deleteMany({ where: { endpoint } });
}
