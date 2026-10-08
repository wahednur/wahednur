"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { api } from "@/lib/api";

type Prefs = { email: boolean; push: boolean; push_available: boolean; devices: number };

const toBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

function Toggle({ on, label, hint, onChange, disabled }: { on: boolean; label: string; hint: string; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="text-sm">
        <p className="font-medium">{label}</p>
        <p className="mt-0.5 text-muted">{hint}</p>
      </div>
      <button
        role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-brand" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

/** Email and browser notifications: what you get, and whether this device is signed up for push. */
export default function NotificationSettings() {
  const [p, setP] = useState<Prefs | null>(null);
  const [here, setHere] = useState<boolean | null>(null); // is this browser subscribed?
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    api<Prefs>("GET", "/notifications/settings/").then((r) => r.ok && setP(r.data));
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.getRegistration("/sw.js").then((reg) => reg?.pushManager.getSubscription()).then((s) => setHere(!!s)).catch(() => setHere(false));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHere(null);
    }
  }, []);

  if (!p) return <div className="h-40 animate-pulse rounded-2xl bg-surface" aria-busy />;
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  async function save(patch: Partial<Prefs>) {
    const r = await api<Prefs>("PATCH", "/notifications/settings/", patch);
    if (r.ok && r.data) setP(r.data);
  }

  async function enablePush() {
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setMsg({ kind: "error", text: "Your browser blocked notifications. Allow them for this site in the browser settings, then try again." });
      const key = await api<{ key: string }>("GET", "/push/key/");
      if (!key.ok || !key.data?.key) return setMsg({ kind: "error", text: "Browser notifications are not switched on for this site yet." });
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(key.data.key) });
      const r = await api("POST", "/push/subscription/", sub.toJSON());
      if (!r.ok) return setMsg({ kind: "error", text: r.error });
      setHere(true);
      setMsg({ kind: "info", text: "Done. This device will now get notifications." });
      void save({});
    } catch {
      setMsg({ kind: "error", text: "Could not turn on notifications on this device." });
    }
  }

  async function disablePush() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await api("DELETE", "/push/subscription/", { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setHere(false);
    void save({});
  }

  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface px-5">
      <Toggle on={p.email} label="Email" hint="Daily reports, messages and important updates by email." onChange={(v) => save({ email: v })} />
      <Toggle on={p.push} label="Browser notifications" hint="A pop-up on your device when something changes." onChange={(v) => save({ push: v })} disabled={!p.push_available} />
      <div className="py-3 text-sm">
        {!p.push_available ? (
          <p className="text-muted">Browser notifications are not switched on for this site yet. The bell in the top bar still shows everything.</p>
        ) : !supported ? (
          <p className="text-muted">This browser cannot show push notifications. On iPhone, add the site to your Home Screen first.</p>
        ) : here ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted">This device receives notifications.</p>
            <button onClick={disablePush} className="rounded-md border border-line px-3.5 py-2 hover:border-brand/60">Turn off on this device</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted">This device is not signed up yet.</p>
            <button onClick={enablePush} className="rounded-md bg-brand px-4 py-2 font-semibold text-bg hover:opacity-90">Turn on for this device</button>
          </div>
        )}
        {msg && <div className="mt-3"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
      </div>
    </div>
  );
}
