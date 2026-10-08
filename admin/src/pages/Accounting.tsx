import { Card, Loading, Notice, PageHeader, Table, Td, useLoad } from "@/components/ui";
import { money } from "@/lib/format";
import type { Summary } from "@/lib/types";

export default function Accounting() {
  const { data, error } = useLoad<Summary>("/accounting/summary/");
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Loading />;
  const cur = Object.keys(data);
  return (
    <>
      <PageHeader title="Accounting" intro="Owner only. Dollars and taka are never added together." />
      {cur.length === 0 ? <Card className="p-6 text-sm text-muted">No money recorded yet.</Card> : cur.map((c) => {
        const s = data[c];
        return (
          <section key={c} className="mb-10">
            <h2 className="mb-3 font-mono text-sm text-brand">{c}</h2>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {([["Received", s.received], ["Spent", s.spent], ["Net", s.net], ["Still owed", s.receivable]] as const).map(([k, v]) => (
                <Card key={k} className="p-4"><p className="text-xs text-muted">{k}</p><p className="mt-1 text-xl font-semibold">{money(c, v)}</p></Card>
              ))}
            </div>
            {Number(s.overdue) > 0 && <p className="mb-3 text-sm text-red-300">{money(c, s.overdue)} is past its due date.</p>}
            {s.months.length > 0 && (
              <Table head={["Month", "Received", "Spent", "Net"]}>
                {[...s.months].reverse().map((m) => (
                  <tr key={m.month}>
                    <Td className="font-mono">{m.month}</Td>
                    <Td>{money(c, m.received)}</Td>
                    <Td>{money(c, m.spent)}</Td>
                    <Td className="font-semibold">{money(c, m.net)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </section>
        );
      })}
    </>
  );
}
