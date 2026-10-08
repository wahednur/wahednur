import { Eye, FileText, Lock, Scale, Store, WalletCards } from "lucide-react";
import Reveal from "./Reveal";

const PILLARS = [
  { icon: FileText, title: "The scope is written first", text: "Every part of the work is listed with what it covers, how long it takes, how risky it is and what it costs, before any code. You can compare it with any other offer." },
  { icon: WalletCards, title: "You pay in steps", text: "A common split is 40% to start, 30% midway and 30% before final delivery, and final delivery follows full payment. Whatever is agreed is on the quotation and the invoice." },
  { icon: Eye, title: "You can see progress", text: "A private client area shows milestones, a progress bar worked out from finished parts, written updates, your quotations, invoices and files. You do not have to ask how it is going." },
  { icon: Store, title: "I run what I build", text: `My own online store has been live since 2016. The same habits (stock as a ledger, exact money, permissions) go into your system.` },
  { icon: Lock, title: "Security is built in", text: "Staff accounts need two-step sign-in, private files use short-lived links, money is calculated exactly on the server, and requests are rate limited. I do not claim the impossible." },
  { icon: Scale, title: "Honest about limits", text: "I am one developer. I say what I do not offer, I label demos as demos, and I will tell you if a ready-made tool fits you better than custom work." },
];

export default function TrustPillars() {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {PILLARS.map((p, i) => (
        <Reveal key={p.title} delay={i * 70} className="bg-surface">
          <div className="glow-border group h-full bg-surface p-6 hover:bg-surface-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-brand/30 bg-bg text-brand transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:border-brand/70">
            <p.icon className="h-5 w-5" aria-hidden />
          </span>
          <h3 className="mt-4 font-semibold">{p.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{p.text}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
