import { useMemo, useState } from "react";
import { Empty, Loading, Notice, PageHeader, Search, Table, Td, useLoad } from "@/components/ui";
import type { ClientRow } from "@/lib/types";

export default function Clients() {
  const { data, error } = useLoad<ClientRow[]>("/clients/");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => (data ?? []).filter((c) => `${c.email} ${c.full_name} ${c.company}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );
  return (
    <>
      <PageHeader title="Clients" intro="Accounts that can sign in to see their own projects, quotations and invoices." />
      <div className="mb-4"><Search value={q} onChange={setQ} placeholder="Search name, company or email" /></div>
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : rows.length === 0 ? <Empty>No clients match.</Empty> : (
        <Table head={["Name", "Company", "Email", "Phone"]}>
          {rows.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.full_name || "—"}</Td>
              <Td className="text-muted">{c.company || "—"}</Td>
              <Td>{c.email}</Td>
              <Td className="text-muted">{c.phone || "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
