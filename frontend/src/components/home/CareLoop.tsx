import Reveal from "./Reveal";

const NODES = ["Secure", "Trusted", "Reliable", "Long-term support", "Happy client"];
const CX = 260, CY = 170, R = 105;
const pos = NODES.map((_, i) => {
  const a = (-90 + i * 72) * (Math.PI / 180);
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
});

/** After step 6 the work does not stop. A loop of five qualities that keep feeding each other. */
export default function CareLoop() {
  return (
    <Reveal className="mt-14 grid items-center gap-8 rounded-2xl border border-line bg-surface p-6 sm:p-8 md:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">After step 6</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">Delivery is where the relationship starts</h3>
        <p className="mt-3 text-sm leading-7 text-muted">
          I stay with the systems I build. Fixes, updates and hosting help continue after handover, each month
          with its cost written down. Secure systems earn trust, trust brings steady work, steady work keeps
          the system reliable, and a reliable system keeps the client happy. Then the loop goes round again.
        </p>
      </div>
      <svg viewBox="0 0 520 340" role="img" aria-label="A loop of five connected qualities: secure, trusted, reliable, long-term support and a happy client" className="mx-auto h-auto w-full max-w-md">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--wn-border)" strokeWidth="1.5" strokeDasharray="3 6" />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--wn-primary)" strokeOpacity="0.25" strokeWidth="1" className="loop-ring" />
        <text x={CX} y={CY - 4} textAnchor="middle" className="fill-[var(--wn-text)]" fontSize="13" fontWeight="600">Long-term</text>
        <text x={CX} y={CY + 14} textAnchor="middle" className="fill-[var(--wn-muted)]" fontSize="11">partnership</text>
        {pos.map((p, i) => {
          const below = p.y > CY + 20;
          const right = p.x > CX + 20, left = p.x < CX - 20;
          const lx = right ? p.x + 20 : left ? p.x - 20 : p.x;
          const ly = right || left ? p.y + 4 : below ? p.y + 34 : p.y - 22;
          return (
            <g key={NODES[i]}>
              <circle cx={p.x} cy={p.y} r="13" fill="var(--wn-bg)" stroke="var(--wn-primary)" strokeOpacity="0.5" />
              <circle cx={p.x} cy={p.y} r="13" fill="var(--wn-primary)" className="loop-node" style={{ animationDelay: `${i * 2}s` }} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--wn-text)">{i + 1}</text>
              <text x={lx} y={ly} textAnchor={right ? "start" : left ? "end" : "middle"} fontSize="13" fill="var(--wn-text)">{NODES[i]}</text>
            </g>
          );
        })}
        <circle r="5" fill="var(--wn-primary)" className="packet">
          <animateMotion dur="10s" repeatCount="indefinite" path={`M${CX},${CY - R} A${R},${R} 0 1 1 ${CX - 0.01},${CY - R}`} />
        </circle>
      </svg>
    </Reveal>
  );
}
