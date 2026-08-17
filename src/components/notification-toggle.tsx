"use client";

import { useEffect, useState } from "react";

import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "checking" | "off" | "on";

export function NotificationToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ) {
        setStatus("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "on" : "off");
    }
    check().catch(() => setStatus("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("off");
        setError(
          permission === "denied"
            ? "Notifications are blocked for this site in your browser settings."
            : "Permission request was dismissed — try again to enable notifications.",
        );
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });
      await subscribeToPush(subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      });
      setStatus("on");
    } catch (err) {
      console.error("Push subscribe failed", err);
      setStatus("off");
      setError("Couldn't turn on notifications. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported" || status === "checking") return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={status === "on" ? disable : enable}
      >
        {status === "on" ? "🔔 Notifications on" : "🔕 Enable notifications"}
      </Button>
      {error ? (
        <p className="absolute top-full right-0 z-20 mt-1 w-56 rounded-md border bg-popover p-2 text-xs text-destructive shadow-md">
          {error}
        </p>
      ) : null}
    </div>
  );
}
