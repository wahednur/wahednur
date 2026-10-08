import { useState } from "react";
import { Badge, Button, Empty, Loading, Notice, PageHeader, Table, Td, useLoad } from "@/components/ui";
import { day, money } from "@/lib/format";
import { api } from "@/lib/http";
import type { PackageOrder } from "@/lib/types";

export default function Requests() {
  const { data, error, reload } = useLoad<PackageOrder[]>("/catalog/orders/");
  const [msg, setMsg] = useState("");

  async function act(id: string, action: "accept" | "decline") {
    setMsg("");
    const r = await api("POST", `/catalog/orders/${id}/${action}/`, {});
    if (!r.ok) setMsg(r.error);
    reload();
  }
  const waiting = (data ?? []).filter((o) => o.status === "requested");
  const rest = (data ?? []).filter((o) => o.status !== "requested");

  return (
    <>
      <PageHeader title="Package requests" intro="Accepting a one-time package creates a project and a draft quotation. A monthly or yearly one starts a subscription." />
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : (data ?? []).length === 0 ? <Empty>No requests yet.</Empty> : (
        <>
          {waiting.length > 0 && (
            <>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Waiting for you</h2>
              <Table head={["Package", "Client", "Price", "Note", "Asked", ""]}>
                {waiting.map((o) => (
                  <tr key={o.id}>
                    <Td className="font-medium">{o.title}</Td>
                    <Td className="text-muted">{o.client_email}</Td>
                    <Td>{money(o.currency, o.unit_price)}<span className="ml-1 text-xs text-muted">{o.cycle.replace("_", " ")}</span></Td>
                    <Td className="max-w-xs text-muted">{o.note || "—"}</Td>
                    <Td className="font-mono text-xs text-muted">{day(o.created_at)}</Td>
                    <Td>
                      <div className="flex gap-1.5">
                        <Button small tone="brand" onClick={() => act(o.id, "accept")}>Accept</Button>
                        <Button small tone="danger" onClick={() => act(o.id, "decline")}>Decline</Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            </>
          )}
          {rest.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Earlier</h2>
              <Table head={["Package", "Client", "Price", "Status", "Asked"]}>
                {rest.map((o) => (
                  <tr key={o.id}>
                    <Td className="font-medium">{o.title}</Td>
                    <Td className="text-muted">{o.client_email}</Td>
                    <Td>{money(o.currency, o.unit_price)}</Td>
                    <Td><Badge value={o.status} /></Td>
                    <Td className="font-mono text-xs text-muted">{day(o.created_at)}</Td>
                  </tr>
                ))}
              </Table>
            </>
          )}
        </>
      )}
    </>
  );
}
