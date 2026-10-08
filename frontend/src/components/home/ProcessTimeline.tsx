"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  { n: "01", title: "A short call", text: "You describe the business and the problem. I ask questions, and I tell you honestly if I am the right person." },
  { n: "02", title: "A written scope and quote", text: "Each part of the work is listed with its time, risk and cost, plus payment milestones and terms. You accept it online." },
  { n: "03", title: "Advance and kickoff", text: "The first payment reserves the time and work begins. Your client area opens with the plan." },
  { n: "04", title: "Build in visible steps", text: "Milestones you can test. Written updates, and you decide what comes next." },
  { n: "05", title: "Delivery and handover", text: "Final delivery follows full payment: working software, source code and deployment help, as agreed in the scope." },
  { n: "06", title: "Support if you want it", text: "Monthly care or hosting help can run as a recurring invoice, so the cost is clear every month." },
];

/** A vertical timeline: the line fills downward as you scroll and each step lights up when reached. */
export default function ProcessTimeline() {
  const list = useRef<HTMLOListElement>(null);
  const [reached, setReached] = useState(-1);
  const [fill, setFill] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const ol = list.current;
    if (!ol) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      const t = setTimeout(() => { setReached(STEPS.length - 1); setFill(1); }, 0);
      return () => clearTimeout(t);
    }
    const t0 = setTimeout(() => setLive(true), 0);
    let raf = 0;
    const update = () => {
      raf = 0;
      const items = Array.from(ol.children) as HTMLElement[];
      const mark = window.innerHeight * 0.62; // the "reading line"
      let r = -1;
      items.forEach((el, i) => { if (el.getBoundingClientRect().top < mark) r = i; });
      setReached(r);
      const first = items[0].getBoundingClientRect().top + 20;
      const last = items[items.length - 1].getBoundingClientRect().top + 20;
      setFill(Math.min(1, Math.max(0, (mark - first) / Math.max(1, last - first))));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      clearTimeout(t0);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <ol ref={list} className="relative max-w-3xl" data-live={live}>
      <span className="absolute bottom-5 left-[19px] top-5 w-px bg-line" aria-hidden />
      <span
        className="absolute left-[18px] top-5 w-[3px] origin-top rounded-full bg-gradient-to-b from-brand to-brand/40 transition-[height] duration-300 ease-out"
        style={{ height: `calc((100% - 40px) * ${fill})` }}
        aria-hidden
      />
      {STEPS.map((s, i) => {
        const on = i <= reached;
        return (
          <li key={s.n} className="relative pb-10 pl-14 last:pb-0">
            <span
              className={`absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border font-mono text-xs shadow-[0_0_0_6px_var(--wn-bg)] transition-all duration-500 ${
                on ? "border-brand bg-brand text-bg" : "border-line bg-bg text-muted"
              } ${i === reached && live ? "step-now" : ""}`}
            >
              {s.n}
            </span>
            <div className={`transition-all duration-500 ${on || !live ? "opacity-100" : "translate-y-1 opacity-40"}`}>
              <h3 className="pt-1.5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted">{s.text}</p>
              {i === 1 && (
                <p className="mt-2 inline-block rounded-md border border-line bg-surface px-3 py-1 font-mono text-[11px] text-muted">Quotation → accepted → invoice, no retyping</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
