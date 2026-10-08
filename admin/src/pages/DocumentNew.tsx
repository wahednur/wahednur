import { Link, useParams } from "react-router-dom";
import DocumentEditor from "@/components/DocumentEditor";
import { PageHeader } from "@/components/ui";

/** /billing/new/:kind  and  /billing/:kind/:id/edit */
export default function DocumentNew({ kind }: { kind: "quotation" | "invoice" }) {
  const { id } = useParams();
  return (
    <>
      <Link to="/billing" className="text-sm text-muted hover:text-brand">← Billing</Link>
      <div className="mt-3">
        <PageHeader
          title={`${id ? "Edit" : "New"} ${kind}`}
          intro={id ? "Only drafts can be edited." : "It starts as a draft. Nothing reaches the client until you send or issue it."}
        />
      </div>
      <DocumentEditor kind={kind} id={id} />
    </>
  );
}
