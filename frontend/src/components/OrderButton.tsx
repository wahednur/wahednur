"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

/** Sends the order request, or the visitor to sign in first. Ordering never bills anything. */
export default function OrderButton({ packageId }: { packageId: number }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function order() {
    setState("busy");
    setError("");
    const r = await api("POST", "/catalog/orders/", { package: packageId });
    if (r.status === 401 || r.status === 403) {
      setState("idle"); // Next keeps this page alive behind the sign-in screen: be ready when they return
      router.push("/login?next=%2Fpackages");
      return;
    }
    if (r.ok) setState("done");
    else {
      setError(r.error);
      setState("idle");
    }
  }

  if (state === "done")
    return (
      <p role="status" className="text-sm text-brand">
        Request sent. I will reply by email. <a href="/app/orders" className="underline">See your requests</a>
      </p>
    );
  return (
    <div>
      <button
        type="button"
        onClick={order}
        disabled={state === "busy"}
        className="w-full rounded-md bg-brand px-5 py-3 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-60"
      >
        {state === "busy" ? "Sending…" : "Request this package"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">Nothing is charged when you request. I confirm the details first.</p>
    </div>
  );
}
