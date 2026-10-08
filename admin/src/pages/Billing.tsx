import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge, Button, Empty, Loading, Notice, PageHeader, Search, Table, Tabs, Td, useLoad } from "@/components/ui";
import { day, money } from "@/lib/format";
import TaxRates from "@/pages/TaxRates";
import type { BillRow, RecurringInv } from "@/lib/types";

export default function Billing() {
  const nav = useNavigate();
  const [tab, setTab] = useState("invoices");
  const [q, setQ] = useState("");
  const inv = useLoad<BillRow[]>("/invoices/");
  const quo = useLoad<BillRow[]>("/quotations/");
  const rec = useLoad<RecurringInv[]>("/billing/recurring/");
  const list = tab === "invoices" ? inv : quo;
  const rows = useMemo(
    () => (list.data ?? []).filter((r) => `${r.number} ${r.title} ${r.client_email}`.toLowerCase().includes(q.toLowerCase())),
    [list.data, q],
  );

  return (
    <>
      <PageHeader
        title="Billing"
        intro="Quotations become invoices; payments are recorded on the invoice."
        action={
          <div className="flex gap-2">
            <Button onClick={() => nav("/billing/new/quotation")}>New quote</Button>
            <Button onClick={() => nav("/billing/new/recurring")}>New recurring invoice</Button>
            <Button tone="brand" onClick={() => nav("/billing/new/invoice")}>New invoice</Button>
          </div>
        }
      />
      <Tabs
        tabs={[
          ["invoices", "Invoices"],
          ["quotations", "Quotes"],
          ["recurring", "Recurring invoices"],
          ["taxes", "Tax rates"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "taxes" ? (
        <TaxRates />
      ) : tab === "recurring" ? (
        <RecurringList rows={rec.data} error={rec.error} />
      ) : (
        <>
      <div className="mb-4"><Search value={q} onChange={setQ} placeholder="Search number, title or client" /></div>
      {list.error && <Notice>{list.error}</Notice>}
      {!list.data && !list.error ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>Nothing here yet.</Empty>
      ) : tab === "invoices" ? (
        <Table head={["Number", "Client", "Total", "Still due", "State", "Due"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td><Link className="font-mono text-brand hover:underline" to={`/billing/invoices/${r.id}`}>{r.number}</Link></Td>
              <Td><div>{r.title}</div><div className="text-xs text-muted">{r.client_email}</div></Td>
              <Td>{money(r.currency, r.total)}</Td>
              <Td>{money(r.currency, r.outstanding ?? "0")}</Td>
              <Td><Badge value={r.state ?? r.status} /></Td>
              <Td className="font-mono text-xs text-muted">{day(r.due_date)}</Td>
            </tr>
          ))}
        </Table>
      ) : (
        <Table head={["Number", "Client", "Total", "Status", "Valid until", "Invoice"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td><Link className="font-mono text-brand hover:underline" to={`/billing/quotations/${r.id}`}>{r.number}</Link></Td>
              <Td><div>{r.title}</div><div className="text-xs text-muted">{r.client_email}</div></Td>
              <Td>{money(r.currency, r.total)}</Td>
              <Td><Badge value={r.status} /></Td>
              <Td className="font-mono text-xs text-muted">{day(r.valid_until)}</Td>
              <Td>{r.invoice_id ? <Link className="text-brand hover:underline" to={`/billing/invoices/${r.invoice_id}`}>Open</Link> : "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
        </>
      )}
    </>
  );
}

const FREQ: Record<string, string> = { weekly: "Every week", monthly: "Every month", quarterly: "Every 3 months", yearly: "Every year" };

function RecurringList({ rows, error }: { rows: RecurringInv[] | null; error: string }) {
  if (error) return <Notice>{error}</Notice>;
  if (!rows) return <Loading />;
  if (rows.length === 0) return <Empty>No recurring invoices yet. Use one for retainers, hosting or maintenance.</Empty>;
  return (
    <Table head={["Schedule", "Client", "Amount", "Repeats", "Next invoice", "Status"]}>
      {rows.map((r) => (
        <tr key={r.id}>
          <Td><Link className="font-medium text-brand hover:underline" to={`/billing/recurring/${r.id}`}>{r.title}</Link></Td>
          <Td className="text-muted">{r.client_email}</Td>
          <Td>{money(r.currency, r.total)}</Td>
          <Td className="text-muted">{FREQ[r.frequency]}</Td>
          <Td className="font-mono text-xs text-muted">{day(r.next_run)}</Td>
          <Td><Badge value={r.status} /></Td>
        </tr>
      ))}
    </Table>
  );
}
