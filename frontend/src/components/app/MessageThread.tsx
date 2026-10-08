"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/auth/ui";
import { ago, api, type ChatMessage } from "@/lib/api";

/** A private conversation with me. New messages arrive without reloading the page. */
export default function MessageThread() {
  const [rows, setRows] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => !document.hidden && api<ChatMessage[]>("GET", "/messages/").then((r) => r.ok && r.data && setRows(r.data));
    const first = setTimeout(load, 0);
    const id = setInterval(load, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [rows?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr("");
    const r = await api<ChatMessage>("POST", "/messages/", { body: text });
    setBusy(false);
    if (!r.ok || !r.data) return setErr(r.error);
    setRows((l) => [...(l ?? []), r.data!]);
    setText("");
  }

  return (
    <div className="flex h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {!rows ? <div className="h-24 animate-pulse rounded-xl bg-bg/40" aria-busy /> : rows.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted">No messages yet. Ask a question about your project and I will reply here.</p>
        ) : (
          rows.map((m) => (
            <div key={m.id} className={`flex ${m.from_team ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.from_team ? "rounded-bl-sm border border-line bg-surface-2" : "rounded-br-sm bg-brand/15"}`}>
                {m.from_team && <p className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-brand">Wahed Nur</p>}
                <p className="whitespace-pre-wrap leading-6">{m.body}</p>
                <p className="mt-1 text-right font-mono text-[10px] text-muted">{ago(m.created_at)}</p>
              </div>
            </div>
          ))
        )}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="border-t border-line p-3">
        {err && <div className="mb-2"><Alert>{err}</Alert></div>}
        <div className="flex items-end gap-2">
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000} placeholder="Write a message…"
            aria-label="Message"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e); }}
            className="flex-1 resize-none rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <button disabled={busy || !text.trim()} className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-60">{busy ? "…" : "Send"}</button>
        </div>
      </form>
    </div>
  );
}
