import Reveal from "./Reveal";

const STEPS = [
  { n: "01", title: "A short call", text: "You describe the business and the problem. I ask questions, and I tell you honestly if I am the right person." },
  { n: "02", title: "A written scope and quote", text: "Each part of the work is listed with its time, risk and cost, plus payment milestones and terms. You accept it online." },
  { n: "03", title: "Advance and kickoff", text: "The first payment reserves the time and work begins. Your client area opens with the plan." },
  { n: "04", title: "Build in visible steps", text: "Milestones you can test. Written updates, and you decide what comes next." },
  { n: "05", title: "Delivery and handover", text: "Final delivery follows full payment: working software, source code and deployment help, as agreed in the scope." },
  { n: "06", title: "Support if you want it", text: "Monthly care or hosting help can run as a recurring invoice, so the cost is clear every month." },
];

/** A vertical timeline whose line draws as each step scrolls into view. */
export default function ProcessTimeline() {
  return (
    <ol className="relative max-w-3xl">
      <span className="absolute bottom-2 left-[19px] top-2 w-px bg-line" aria-hidden />
      {STEPS.map((s, i) => (
        <Reveal key={s.n} as="li" delay={40} className="relative pb-10 pl-14 last:pb-0">
          <span className="absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border border-brand/50 bg-bg font-mono text-xs text-brand shadow-[0_0_0_6px_var(--wn-bg)]">
            {s.n}
          </span>
          <h3 className="pt-1.5 text-lg font-semibold">{s.title}</h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted">{s.text}</p>
          {i === 1 && (
            <p className="mt-2 inline-block rounded-md border border-line bg-surface px-3 py-1 font-mono text-[11px] text-muted">Quotation → accepted → invoice, no retyping</p>
          )}
        </Reveal>
      ))}
    </ol>
  );
}
