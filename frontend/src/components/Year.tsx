"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Cache Components forbids `new Date()` during prerender, so the server and
// hydration render a fixed fallback and the browser then shows the real year.
export default function Year() {
  const year = useSyncExternalStore(subscribe, () => new Date().getFullYear(), () => 2026);
  return <>{year}</>;
}
