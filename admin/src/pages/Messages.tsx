import { useMemo, useState } from "react";
import { Badge, Button, Card, Empty, Loading, Notice, PageHeader, Search, Tabs, useLoad } from "@/components/ui";
import { api } from "@/lib/http";
import type { Lead } from "@/lib/types";

const TABS: [string, string][] = [
  ["new", "New"],
  ["read", "Read"],
  ["replied", "Replied"],
  ["archived", "Archived"],
  ["all", "All"],
];

/** Every message from the website's contact form. They are saved even when the email to you fails. */
export default function Messages() {
  const { data, error, reload } = useLoad<Lead[]>("/leads/inbox/");
  const [tab, setTab] = useState("new");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (l) => (tab === "all" || l.status === tab) && `${l.name} ${l.email} ${l.details}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, tab, q],
  );
  const count = (s: string) => (data ?? []).filter((l) => l.status === s).length;
  const failed = (data ?? []).filter((l) => !l.emailed).length;

  async function setStatus(l: Lead, status: Lead["status"]) {
    setMsg("");
    const r = await api("PATCH", `/leads/inbox/${l.id}/`, { status });
    if (!r.ok) setMsg(r.error);
    reload();
  }
  async function resend(l: Lead) {
    setMsg("");
    const r = await api<Lead>("POST", `/leads/inbox/${l.id}/resend/`, {});
    if (!r.ok) setMsg(r.error);
    else if (r.data && !r.data.emailed) setMsg(`The email still could not be sent: ${r.data.email_error}`);
    reload();
  }

  return (
    <>
      <PageHeader title="Messages" intro="Everything sent through the contact form. A message is saved first, then emailed to you." />
      {failed > 0 && (
        <div className="mb-4">
          <Notice>
            {failed} message{failed > 1 ? "s were" : " was"} saved but the email to you did not go out. Open one and press "Send the email again" to see the reason.
          </Notice>
        </div>
      )}
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      <Tabs tabs={TABS.map(([k, l]) => [k, k === "all" ? l : `${l}${count(k) ? ` (${count(k)})` : ""}`] as [string, string])} value={tab} onChange={setTab} />
      <div className="mb-4"><Search value={q} onChange={setQ} placeholder="Search name, email or text" /></div>
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : rows.length === 0 ? <Empty>No messages here.</Empty> : (
        <div className="space-y-3">
          {rows.map((l) => (
            <Card key={l.id} className="overflow-hidden">
              <button
                className="flex w-full items-start justify-between gap-3 p-4 text-left"
                aria-expanded={open === l.id}
                onClick={() => {
                  setOpen(open === l.id ? null : l.id);
                  if (l.status === "new") void setStatus(l, "read");
                }}
              >
                <span className="min-w-0">
                  <span className="font-medium">{l.name}</span>
                  <span className="ml-2 text-sm text-muted">{l.email}</span>
                  <span className="mt-0.5 block truncate text-sm text-muted">{l.need_label}: {l.details}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge value={l.status === "new" ? "pending" : l.status} />
                  <span className="font-mono text-[11px] text-muted">{l.created_at.slice(0, 16).replace("T", " ")}</span>
                  {!l.emailed && <span className="text-[11px] text-amber-200">email not sent</span>}
                </span>
              </button>
              {open === l.id && (
                <div className="space-y-4 border-t border-line p-4 text-sm">
                  <p className="whitespace-pre-line">{l.details}</p>
                  <dl className="grid gap-1 text-muted sm:grid-cols-3">
                    <div><dt className="text-xs">Needs</dt><dd className="text-ink">{l.need_label}</dd></div>
                    <div><dt className="text-xs">Budget</dt><dd className="text-ink">{l.budget || "—"}</dd></div>
                    <div><dt className="text-xs">Timeline</dt><dd className="text-ink">{l.timeline || "—"}</dd></div>
                  </dl>
                  {!l.emailed && (
                    <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200">
                      The email to you was not sent{l.email_error ? `: ${l.email_error}` : ""}.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`mailto:${l.email}?subject=${encodeURIComponent("Re: your enquiry")}`}
                      onClick={() => l.status !== "replied" && void setStatus(l, "replied")}
                      className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
                    >
                      Reply by email
                    </a>
                    {l.status !== "replied" && <Button onClick={() => setStatus(l, "replied")}>Mark replied</Button>}
                    {l.status !== "archived" && <Button onClick={() => setStatus(l, "archived")}>Archive</Button>}
                    {l.status === "archived" && <Button onClick={() => setStatus(l, "read")}>Restore</Button>}
                    {!l.emailed && <Button onClick={() => resend(l)}>Send the email again</Button>}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
