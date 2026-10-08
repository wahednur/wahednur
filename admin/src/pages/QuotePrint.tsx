import { Link, useParams } from "react-router-dom";
import QuoteDocument from "@/components/QuoteDocument";
import { Button, Loading, Notice, useLoad } from "@/components/ui";
import type { Quotation } from "@/lib/types";

/** A clean page for the browser's Print or Save as PDF. It handles Bengali text, which the server PDF cannot. */
export default function QuotePrint() {
  const { id } = useParams();
  const { data: q, error } = useLoad<Quotation>(`/quotations/${id}/`);
  if (error) return <div className="p-6"><Notice>{error}</Notice></div>;
  if (!q) return <div className="p-6"><Loading /></div>;
  return (
    <div className="min-h-full bg-[#E7EEF2] py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3 px-4">
        <Link to={`/billing/quotations/${id}`} className="text-sm text-[#163C52] underline">← Back</Link>
        <Button tone="brand" onClick={() => window.print()}>Print or save as PDF</Button>
      </div>
      <QuoteDocument q={q} from="Abdul Wahed Nur" />
    </div>
  );
}
