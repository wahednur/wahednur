import { faq } from "@/lib/services";

export default function Faq() {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line rounded-2xl border border-line">
      {faq.map((f) => (
        <details key={f.q} className="group p-5 open:bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform group-open:rotate-45" aria-hidden>+</span>
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
