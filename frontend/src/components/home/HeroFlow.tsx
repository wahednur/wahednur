/** A small animated map of how a request travels through a system I build. Pure SVG: no script, no library. */
const PACKETS = [
  { path: "M130 60 L130 140", dur: "2.6s", begin: "0s", label: "order" },
  { path: "M130 140 L130 232", dur: "2.6s", begin: "0.9s", label: "api" },
  { path: "M130 232 L130 330", dur: "2.6s", begin: "1.8s", label: "sql" },
  { path: "M130 232 C 230 232 300 250 372 232", dur: "3.2s", begin: "0.4s", label: "job" },
  { path: "M372 232 C 372 290 372 300 372 330", dur: "2.8s", begin: "1.4s", label: "mail" },
];

function Node({ x, y, w = 140, title, sub, accent = false }: { x: number; y: number; w?: number; title: string; sub: string; accent?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={46} rx={10} fill="#111a2f" stroke={accent ? "#2dd4bf" : "#2b3a57"} strokeWidth={accent ? 1.6 : 1.2} />
      <text x={x + 14} y={y + 20} fill="#e2e8f0" fontSize="13" fontWeight="600" fontFamily="var(--font-geist-sans), system-ui">{title}</text>
      <text x={x + 14} y={y + 36} fill="#a3b2c7" fontSize="10.5" fontFamily="var(--font-geist-mono), monospace">{sub}</text>
    </g>
  );
}

export default function HeroFlow() {
  return (
    <figure className="drift">
      <svg
        viewBox="0 0 520 400"
        role="img"
        aria-label="Diagram of a request moving from the customer's browser through Next.js and the Django API to the PostgreSQL database, with Redis and Celery doing background jobs such as email"
        className="h-auto w-full"
      >
        <defs>
          <linearGradient id="hf-line" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2dd4bf" stopOpacity="0.7" />
            <stop offset="1" stopColor="#7dd3fc" stopOpacity="0.25" />
          </linearGradient>
          <filter id="hf-glow"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>

        <g stroke="url(#hf-line)" strokeWidth="1.5" fill="none" strokeDasharray="4 5">
          <path d="M130 60 L130 140" />
          <path d="M130 186 L130 232" />
          <path d="M130 278 L130 330" />
          <path d="M200 255 C 260 255 300 255 302 255 L372 255" />
          <path d="M372 278 L372 330" />
        </g>

        <Node x={60} y={14} title="Customer" sub="browser · phone" />
        <Node x={60} y={140} title="Website" sub="Next.js · React" accent />
        <Node x={60} y={232} title="API" sub="Django REST" accent />
        <Node x={60} y={330} title="Database" sub="PostgreSQL" />
        <Node x={302} y={232} title="Worker" sub="Celery · Redis" />
        <Node x={302} y={330} title="Email · courier" sub="SMTP · APIs" />

        {PACKETS.map((p) => (
          <g key={p.path + p.begin} className="packet">
            <circle r="9" fill="#2dd4bf" opacity="0.35" filter="url(#hf-glow)">
              <animateMotion dur={p.dur} begin={p.begin} repeatCount="indefinite" path={p.path} />
            </circle>
            <circle r="3.6" fill="#2dd4bf">
              <animateMotion dur={p.dur} begin={p.begin} repeatCount="indefinite" path={p.path} />
            </circle>
          </g>
        ))}
        <text x="140" y="108" fill="#a3b2c7" fontSize="10" fontFamily="var(--font-geist-mono), monospace">order, quote, invoice</text>
        <text x="140" y="212" fill="#a3b2c7" fontSize="10" fontFamily="var(--font-geist-mono), monospace">rules and permissions</text>
        <text x="140" y="314" fill="#a3b2c7" fontSize="10" fontFamily="var(--font-geist-mono), monospace">exact money, stock ledger</text>
      </svg>
      <figcaption className="mt-2 text-center font-mono text-[11px] text-muted">
        How one request travels through a system I build
      </figcaption>
    </figure>
  );
}
