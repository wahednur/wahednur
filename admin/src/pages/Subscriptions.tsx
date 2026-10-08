import { useState } from "react";
import { Badge, Button, Empty, Loading, Notice, PageHeader, Table, Td, useLoad } from "@/components/ui";
import { day, money } from "@/lib/format";
import { api } from "@/lib/http";
import type { Subscription } from "@/lib/types";

export default function Subscriptions() {
  const { data, error, reload } = useLoad<Subscription[]>("/subscriptions/");
  const [msg, setMsg] = useState("");
  async function act(id: number, action: "pause" | "resume" | "cancel") {
    setMsg("");
    const r = await api("POST", `/subscriptions/${id}/${action}/`, {});
    if (!r.ok) setMsg(r.error);
    reload();
  }
  return (
    <>
      <PageHeader title="Subscriptions" intro="One invoice is issued per period, never twice. Pausing does not bill the paused time later." />
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : (data ?? []).length === 0 ? <Empty>No subscriptions yet.</Empty> : (
        <Table head={["Plan", "Client", "Price", "Status", "Next invoice", ""]}>
          {(data ?? []).map((s) => (
            <tr key={s.id}>
              <Td className="font-medium">{s.title}</Td>
              <Td className="text-muted">{s.client_email}</Td>
              <Td>{money(s.currency, s.unit_price)}<span className="ml-1 text-xs text-muted">/ {s.cycle}</span></Td>
              <Td><Badge value={s.status} /></Td>
              <Td className="font-mono text-xs text-muted">{day(s.next_billing_date)}</Td>
              <Td>
                <div className="flex gap-1.5">
                  {s.status === "active" && <Button small onClick={() => act(s.id, "pause")}>Pause</Button>}
                  {s.status === "paused" && <Button small tone="brand" onClick={() => act(s.id, "resume")}>Resume</Button>}
                  {s.status !== "cancelled" && <Button small tone="danger" onClick={() => confirm("Cancel this subscription?") && act(s.id, "cancel")}>Cancel</Button>}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
