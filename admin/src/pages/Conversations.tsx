import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, Empty, field, Loading, Notice, PageHeader, useLoad } from "@/components/ui";
import { api } from "@/lib/http";

type Convo = { customer: number; email: string; name: string; last: string; unread: number };
type Msg = { id: number; body: string; from_team: boolean; created_at: string };
type Thread = { email: string; name: string; messages: Msg[] };
const when = (iso: string) => iso.slice(0, 16).replace("T", " ");

function ThreadView({ id, onSent }: { id: string; onSent: () => void }) {
  const [t, setT] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const r = await api<Thread>("GET", `/conversations/${id}/`);
    if (r.ok && r.data) setT(r.data);
    else if (!r.ok) setErr(r.error);
  }, [id]);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const poll = setInterval(() => !document.hidden && void load(), 20000);
    return () => { clearTimeout(first); clearInterval(poll); };
  }, [load]);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [t?.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await api("POST", `/conversations/${id}/`, { body: text });
    if (!r.ok) return setErr(r.error);
    setText("");
    await load();
    onSent();
  }
  if (!t) return err ? <Notice>{err}</Notice> : <Loading />;
  return (
    <Card className="flex h-[70vh] flex-col overflow-hidden">
      <div className="border-b border-line px-4 py-3 text-sm"><span className="font-medium">{t.name || t.email}</span> <span className="text-muted">{t.name && t.email}</span></div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {t.messages.map((m) => (
          <div key={m.id} className={`flex ${m.from_team ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.from_team ? "bg-brand/15" : "border border-line bg-surface-2"}`}>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-right font-mono text-[10px] text-muted">{when(m.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="space-y-2 border-t border-line p-3">
        {err && <Notice>{err}</Notice>}
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000} placeholder="Reply…" aria-label="Reply" className={`${field} mt-0 flex-1`} />
          <Button type="submit" tone="brand" disabled={!text.trim()}>Send</Button>
        </div>
        <p className="text-[11px] text-muted">The customer is notified in the app, by browser notification and by email (if they allow it).</p>
      </form>
    </Card>
  );
}

/** Private chats with customers, from the "Messages" page in their area. */
export default function Conversations() {
  const { id } = useParams();
  const { data, error, reload } = useLoad<Convo[]>("/conversations/");
  return (
    <>
      <PageHeader title="Conversations" intro="Private chats with customers. Enquiries from the website contact form are under Enquiries." />
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-2">
            {data && data.length === 0 && <Empty>No one has written yet.</Empty>}
            {data?.map((c) => (
              <Link key={c.customer} to={`/conversations/${c.customer}`} className={`block rounded-xl border p-3 text-sm transition-colors hover:border-brand/60 ${String(c.customer) === id ? "border-brand/60 bg-brand/5" : "border-line bg-surface"}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{c.name || c.email}</span>
                  {c.unread > 0 && <span className="rounded-full bg-amber-400 px-2 py-0.5 font-mono text-[10px] font-bold text-bg">{c.unread}</span>}
                </span>
                <span className="block truncate text-xs text-muted">{c.email}</span>
                <span className="mt-1 block font-mono text-[10px] text-muted">{when(c.last)}</span>
              </Link>
            ))}
          </div>
          {id ? <ThreadView key={id} id={id} onSent={reload} /> : <Empty>Pick a conversation.</Empty>}
        </div>
      )}
    </>
  );
}
