import { useMemo, useState } from "react";
import { Badge, Button, Empty, Loading, Notice, PageHeader, Search, Table, Td, useLoad } from "@/components/ui";
import { day } from "@/lib/format";
import { api, SITE_URL } from "@/lib/http";
import type { Page } from "@/lib/types";

export default function Content() {
  const { data, error, reload } = useLoad<Page[]>("/cms/manage/");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const rows = useMemo(() => (data ?? []).filter((p) => `${p.title} ${p.slug}`.toLowerCase().includes(q.toLowerCase())), [data, q]);

  async function toggle(p: Page) {
    setMsg("");
    const r = await api("PATCH", `/cms/manage/${p.id}/`, { status: p.status === "published" ? "draft" : "published" });
    if (!r.ok) setMsg(r.error);
    reload();
  }
  return (
    <>
      <PageHeader
        title="Content"
        intro="Publish or hide posts. Writing and the SEO panel are on the website's editor."
        action={SITE_URL ? <a className="text-sm text-brand hover:underline" href={`${SITE_URL}/app/content`} target="_blank" rel="noreferrer">Open the editor ↗</a> : undefined}
      />
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      <div className="mb-4"><Search value={q} onChange={setQ} placeholder="Search title or address" /></div>
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : rows.length === 0 ? <Empty>No posts match.</Empty> : (
        <Table head={["Title", "Kind", "Status", "SEO text", "Updated", ""]}>
          {rows.map((p) => (
            <tr key={p.id}>
              <Td><div className="font-medium">{p.title}</div><div className="font-mono text-[11px] text-muted">/{p.kind === "post" ? "blog/" : ""}{p.slug}</div></Td>
              <Td className="text-muted">{p.kind}</Td>
              <Td><Badge value={p.status} /></Td>
              <Td className="text-xs text-muted">{p.seo_source}{p.seo_stale && p.status === "published" ? " · outdated" : ""}</Td>
              <Td className="font-mono text-xs text-muted">{day(p.updated_at)}</Td>
              <Td><Button small onClick={() => toggle(p)}>{p.status === "published" ? "Unpublish" : "Publish"}</Button></Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
