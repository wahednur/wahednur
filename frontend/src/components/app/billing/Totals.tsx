import { fmt, type BillBase } from "@/lib/api";

export function ItemsTable({ doc }: { doc: BillBase }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="text-left font-mono text-[11px] uppercase text-muted">
          <tr>
            <th className="p-3">Item</th>
            <th className="p-3 text-right">Qty</th>
            <th className="p-3 text-right">Price</th>
            <th className="p-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {doc.items.map((i) => (
            <tr key={i.id}>
              <td className="p-3">
                {i.description}
                {i.cycle !== "one_time" && <span className="ml-2 font-mono text-[11px] text-muted">{i.cycle}</span>}
              </td>
              <td className="p-3 text-right">{Number(i.quantity)}</td>
              <td className="p-3 text-right">{fmt(doc.currency, i.unit_price)}</td>
              <td className="p-3 text-right">{fmt(doc.currency, i.amount ?? "0")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto w-full max-w-xs space-y-1 p-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{fmt(doc.currency, doc.subtotal)}</dd>
        </div>
        {Number(doc.discount) > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Discount</dt>
            <dd>- {fmt(doc.currency, doc.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd>{fmt(doc.currency, doc.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
