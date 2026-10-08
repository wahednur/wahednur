import { useState } from "react";
import { Badge, Button, Card, Empty, field, Loading, Notice, PageHeader, Table, Td, useLoad } from "@/components/ui";
import { day, money } from "@/lib/format";
import { api } from "@/lib/http";
import type { ShopOrder } from "@/lib/types";

export default function Shop() {
  const { data, error, reload } = useLoad<ShopOrder[]>("/shop/orders/");
  const [msg, setMsg] = useState("");
  const [shipping, setShipping] = useState<string | null>(null);

  async function act(id: string, action: string, body: object = {}) {
    setMsg("");
    const r = await api("POST", `/shop/orders/${id}/${action}/`, body);
    if (!r.ok) setMsg(r.error);
    setShipping(null);
    reload();
  }

  return (
    <>
      <PageHeader title="Shop orders" intro="Check the transaction ID against your statement before confirming a payment." />
      {msg && <div className="mb-4"><Notice>{msg}</Notice></div>}
      {error && <Notice>{error}</Notice>}
      {!data && !error ? <Loading /> : (data ?? []).length === 0 ? <Empty>No shop orders yet.</Empty> : (
        <Table head={["Order", "Customer", "Items", "Total", "Status", "Payment report", "Actions"]}>
          {(data ?? []).map((o) => {
            const physical = o.items.some((i) => i.kind === "physical");
            return (
              <tr key={o.id}>
                <Td><div className="font-mono">{o.number}</div><div className="font-mono text-[11px] text-muted">{day(o.created_at)}</div></Td>
                <Td>
                  <div>{o.customer_email}</div>
                  {o.ship_to && <div className="text-xs text-muted">{o.ship_to.name}, {o.ship_to.phone}<br />{o.ship_to.address}</div>}
                </Td>
                <Td className="text-muted">{o.items.map((i) => `${i.title} ×${i.quantity}`).join(", ")}</Td>
                <Td>{money(o.currency, o.total)}</Td>
                <Td><Badge value={o.status} /></Td>
                <Td className="text-xs">
                  {o.claimed ? <><span className="uppercase">{o.claimed.method}</span> <span className="font-mono">{o.claimed.reference}</span></> : <span className="text-muted">none</span>}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {!o.paid && o.status !== "cancelled" && (
                      <Button small tone="brand" onClick={() => act(o.id, "confirm-payment", o.claimed ? { method: o.claimed.method, reference: o.claimed.reference } : {})}>
                        Confirm payment
                      </Button>
                    )}
                    {o.paid && physical && o.status === "processing" && <Button small onClick={() => setShipping(o.id)}>Mark shipped</Button>}
                    {o.status === "shipped" && <Button small onClick={() => act(o.id, "deliver")}>Mark delivered</Button>}
                    {o.status !== "cancelled" && o.status !== "delivered" && !o.paid && (
                      <Button small tone="danger" onClick={() => confirm("Cancel this order?") && act(o.id, "cancel")}>Cancel</Button>
                    )}
                  </div>
                  {shipping === o.id && (
                    <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void act(o.id, "ship", { tracking: String(new FormData(e.currentTarget).get("tracking") ?? "") }); }}>
                      <input name="tracking" placeholder="Tracking (optional)" maxLength={100} className={`${field} mt-0`} />
                      <Button small tone="brand" type="submit">Save</Button>
                    </form>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
      <Card className="mt-4 p-4 text-xs text-muted">Products and stock are managed in the website's Manage area for now.</Card>
    </>
  );
}
