import { day, money } from "@/lib/format";
import type { Quotation, SheetItem } from "@/lib/types";

const RISK = { low: ["Low", "bg-emerald-100 text-emerald-800"], mid: ["Medium", "bg-amber-100 text-amber-800"], high: ["High", "bg-red-100 text-red-800"] } as const;
const STATE = {
  done: ["Done", "bg-emerald-100 text-emerald-800"],
  partial: ["Partly done", "bg-amber-100 text-amber-800"],
  new: ["To do", "bg-red-100 text-red-800"],
} as const;

const pad = (n: number) => String(n).padStart(2, "0");

function Price({ cur, i }: { cur: string; i: SheetItem }) {
  if (!i.counted) return <span>Included</span>;
  const lo = money(cur, i.unit_price);
  return <span>{i.unit_price_max ? `${lo} – ${money(cur, i.unit_price_max)}` : lo}</span>;
}

/** The written proposal, laid out like a scope-of-work sheet. Used on screen and for printing. */
function Letterhead({ q }: { q: Quotation }) {
  const l = q.letterhead;
  return (
    <div className="flex items-end justify-between gap-4 border-b-2 border-[#0D9488] pb-3">
      <div>
        {l.mark === "photo" && <img src="/wahednur.jpg" alt="" className="mb-1.5 h-14 w-14 rounded-full object-cover" />}
        {l.mark === "logo" && <img src="/ws-logo.svg" alt="" className="mb-1.5 h-12 w-auto" />}
        <p className="text-xl font-bold tracking-tight text-[#163C52]">{l.name}</p>
      </div>
      <p className="text-right text-[11px] leading-5 text-[#4C7488]">
        {l.address}
        <br />
        {[l.website, l.email, l.phone].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

function LetterFoot({ q }: { q: Quotation }) {
  const l = q.letterhead;
  return (
    <p className="border-t border-[#BDD0D8] pt-2 text-center text-[10px] text-[#4C7488]">
      {[l.name, l.address, l.website, l.email, l.phone].filter(Boolean).join(" · ")}
    </p>
  );
}

export default function QuoteDocument({ q, from }: { q: Quotation; from?: string }) {
  const cur = q.currency;
  const counted = q.items.filter((i) => i.counted);
  const paperTitle = "font-semibold tracking-wide text-[#163C52]";
  return (
    <article className="letterhead-sheet mx-auto max-w-4xl bg-[#F4F9FB] p-6 text-[15px] leading-7 text-[#163C52] sm:p-10 print:p-0">
      <style>{`@media print { @page { size: A4; margin: 0; } .letterhead-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; max-width: none !important; width: 100% !important; margin: 0 !important; background: #fff !important; } .lh-wrap { width: 100%; border-collapse: collapse; } .lh-wrap > thead { display: table-header-group; } .lh-wrap > tfoot { display: table-footer-group; } .lh-gap { height: 6mm; } .lh-wrap > thead td { padding: 12mm 14mm 0; } .lh-wrap > tfoot td { padding: 0 14mm 10mm; } .lh-wrap > tbody td { padding: 0 14mm; } }`}</style>
      <table className="lh-wrap w-full">
        <thead><tr><td><Letterhead q={q} /><div className="lh-gap h-5" /></td></tr></thead>
        <tfoot><tr><td><div className="lh-gap h-5" /><LetterFoot q={q} /></td></tr></tfoot>
        <tbody><tr><td className="align-top">
      <header className="border-2 border-[#163C52] p-5">
        <div className="flex items-start justify-between gap-4 border-b border-[#BDD0D8] pb-3">
          <p className="text-xs uppercase tracking-[0.14em] text-[#4C7488]">Scope of Work &amp; Cost Estimate</p>
          <p className="shrink-0 -rotate-3 rounded border-2 border-[#A8392F] px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#A8392F]">
            {q.status === "sent" ? "Delivered" : q.status === "rejected" ? "Lost" : q.status}
            {q.revision ? ` · ${q.revision}` : ""}
          </p>
        </div>
        {q.bill_to_name && <p className="mt-3 text-sm font-semibold">{q.bill_to_name}</p>}
        <h1 className="mt-1 text-2xl font-bold">{q.title}</h1>
        {q.subtitle && <p className="text-sm text-[#4C7488]">{q.subtitle}</p>}
        <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
          <div><dt className="text-xs uppercase tracking-wide text-[#4C7488]">Quote no.</dt><dd className="font-mono">{q.number}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-[#4C7488]">Date</dt><dd>{day(q.issue_date)}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-[#4C7488]">Valid until</dt><dd>{q.valid_until ? day(q.valid_until) : "—"}</dd></div>
          {from && <div><dt className="text-xs uppercase tracking-wide text-[#4C7488]">Prepared by</dt><dd>{from}</dd></div>}
        </dl>
        {q.bill_to_address && <p className="mt-3 whitespace-pre-line text-sm text-[#4C7488]">{q.bill_to_address}</p>}
      </header>

      {q.proposal_html && <div className="doc-rich mt-8" dangerouslySetInnerHTML={{ __html: q.proposal_html }} />}

      <h2 className={`mt-10 mb-3 border-l-4 border-[#B06A1F] pl-3 text-lg ${paperTitle}`}>Work, time and cost</h2>
      <div className="space-y-4">
        {q.items.map((i, n) => (
          <section key={n} className="break-inside-avoid border border-[#BDD0D8] bg-white/60">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-[#BDD0D8] px-4 py-3">
              <div>
                <p className="font-mono text-xs tracking-wider text-[#4C7488]">SHEET {pad(n + 1)}</p>
                <h3 className="font-semibold">{i.description}</h3>
              </div>
              {i.work_state && (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${STATE[i.work_state][1]}`}>{STATE[i.work_state][0]}</span>
              )}
            </div>
            <div className="grid gap-4 px-4 py-3 sm:grid-cols-[1.5fr_1fr]">
              <div className="doc-rich text-sm text-[#4C7488]" dangerouslySetInnerHTML={{ __html: i.details_html }} />
              <dl className="space-y-1 border-[#BDD0D8] text-sm sm:border-l sm:pl-4">
                {i.risk && <div><span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${RISK[i.risk][1]}`}>Risk: {RISK[i.risk][0]}</span></div>}
                {i.time_estimate && <div className="flex justify-between gap-2"><dt>Time</dt><dd className="font-mono font-semibold">{i.time_estimate}</dd></div>}
                <div className="flex justify-between gap-2"><dt>{i.counted ? "Cost" : "Value"}</dt><dd className="font-mono font-semibold"><Price cur={cur} i={i} /></dd></div>
              </dl>
            </div>
            {i.note && <p className="border-t border-[#BDD0D8] px-4 py-2 text-xs text-[#4C7488]">{i.note}</p>}
          </section>
        ))}
      </div>

      <h2 className={`mt-10 mb-3 border-l-4 border-[#B06A1F] pl-3 text-lg ${paperTitle}`}>Total cost</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[#163C52] text-left text-xs uppercase tracking-wide text-[#4C7488]">
              <th className="py-2 pr-3">Sheet</th><th className="py-2 pr-3">Part of the work</th><th className="py-2 pr-3">Time</th><th className="py-2 text-right">Cost ({cur})</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((i, n) => (
              <tr key={n} className="border-b border-[#BDD0D8] align-top">
                <td className="py-2 pr-3 font-mono">{pad(n + 1)}</td>
                <td className="py-2 pr-3">{i.description}{!i.counted && <span className="ml-2 text-xs text-emerald-700">(not in the total)</span>}</td>
                <td className="py-2 pr-3 font-mono">{i.time_estimate || "—"}</td>
                <td className="py-2 text-right font-mono">{i.counted ? <Price cur={cur} i={i} /> : "—"}</td>
              </tr>
            ))}
            <tr><td colSpan={3} className="pt-3 text-right text-[#4C7488]">Subtotal</td><td className="pt-3 text-right font-mono">{money(cur, q.subtotal)}{q.subtotal_max && ` – ${money(cur, q.subtotal_max)}`}</td></tr>
            {Number(q.discount) > 0 && <tr><td colSpan={3} className="text-right text-[#4C7488]">Discount</td><td className="text-right font-mono">- {money(cur, q.discount)}</td></tr>}
            {Number(q.tax) > 0 && <tr><td colSpan={3} className="text-right text-[#4C7488]">{q.tax_name} ({Number(q.tax_rate)}%)</td><td className="text-right font-mono">{money(cur, q.tax)}</td></tr>}
            <tr className="border-t-2 border-[#163C52] font-bold"><td colSpan={3} className="pt-3 text-right">Total ({counted.length} counted parts)</td><td className="pt-3 text-right font-mono">{money(cur, q.total)}</td></tr>
          </tbody>
        </table>
      </div>
      {q.subtotal_max && <p className="mt-2 text-xs text-[#4C7488]">Parts with a range are estimates: the total above uses the lower price; the agreed price is fixed when you accept.</p>}

      {q.payment_plan.length > 0 && (
        <>
          <h2 className={`mt-10 mb-3 border-l-4 border-[#B06A1F] pl-3 text-lg ${paperTitle}`}>Payment plan</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {q.payment_plan.map((p, n) => (
              <div key={n} className="break-inside-avoid border border-[#BDD0D8] bg-white/60 p-4">
                <p className="font-mono text-2xl text-[#B06A1F]">{Number(p.percent)}%</p>
                <p className="font-semibold">{p.label}</p>
                <p className="font-mono text-sm">{money(cur, (Math.round(Number(q.total) * 100 * Number(p.percent)) / 10000).toFixed(2))}</p>
                {p.note && <p className="mt-1 text-xs text-[#4C7488]">{p.note}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {q.risks.length > 0 && (
        <>
          <h2 className={`mt-10 mb-3 border-l-4 border-[#B06A1F] pl-3 text-lg ${paperTitle}`}>Risks</h2>
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b-2 border-[#163C52] text-left text-xs uppercase tracking-wide text-[#4C7488]"><th className="py-2 pr-3">Risk</th><th className="py-2">Impact</th></tr></thead>
            <tbody>{q.risks.map((r, n) => <tr key={n} className="border-b border-[#BDD0D8] align-top"><td className="py-2 pr-3 font-semibold">{r.risk}</td><td className="py-2 text-[#4C7488]">{r.impact}</td></tr>)}</tbody>
          </table>
        </>
      )}

      {q.sections.map((s, n) => (
        <div key={n} className="break-inside-avoid">
          <h2 className={`mt-10 mb-3 border-l-4 border-[#B06A1F] pl-3 text-lg ${paperTitle}`}>{s.heading}</h2>
          <div className="doc-rich" dangerouslySetInnerHTML={{ __html: s.body_html }} />
        </div>
      ))}

      {q.notes && (
        <>
          <h2 className={`mt-10 mb-3 border-l-4 border-[#B06A1F] pl-3 text-lg ${paperTitle}`}>Terms and notes</h2>
          <p className="whitespace-pre-line text-sm">{q.notes}</p>
        </>
      )}

      <footer className="mt-16 grid gap-10 border-t-2 border-[#163C52] pt-4 text-sm text-[#4C7488] sm:grid-cols-2">
        <div><p>Prepared by</p><p className="mt-8 border-t border-[#4C7488] pt-1">{from ?? ""}</p></div>
        <div><p>Client approval</p><p className="mt-8 border-t border-[#4C7488] pt-1">Date and signature</p></div>
      </footer>
        </td></tr></tbody>
      </table>
    </article>
  );
}
