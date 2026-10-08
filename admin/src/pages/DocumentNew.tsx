import { Link, useParams } from "react-router-dom";
import DocumentEditor, { TITLES } from "@/components/DocumentEditor";
import { PageHeader } from "@/components/ui";

/** /billing/new/:kind  and  /billing/:kind/:id/edit */
export default function DocumentNew({ kind }: { kind: "quotation" | "invoice" | "recurring" }) {
  const { id } = useParams();
  return (
    <>
      <Link to="/billing" className="text-sm text-muted hover:text-brand">← Billing</Link>
      <div className="mt-3">
        <PageHeader
          title={TITLES[kind][id ? 1 : 0]}
          intro={
            id
              ? kind === "recurring"
                ? "Changes apply to invoices made from now on."
                : "Only drafts can be edited."
              : kind === "recurring"
                ? "A schedule that makes the invoice for you, every period."
                : "It starts as a draft. Nothing reaches the customer until you deliver or issue it."
          }
        />
      </div>
      <DocumentEditor kind={kind} id={id} />
    </>
  );
}
