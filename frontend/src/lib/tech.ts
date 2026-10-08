export type Tech = { name: string; role: string; brief: string; usedIn: string };
export type TechGroup = { layer: string; tagline: string; items: Tech[] };

// Every line describes how the tool is used in my own projects. No ratings, no percentages.
export const techGroups: TechGroup[] = [
  {
    layer: "Backend",
    tagline: "Where the rules live: money, stock, permissions, orders.",
    items: [
      { name: "Python · Django", role: "Core framework", brief: "Mature, batteries-included and safe by default. Good for systems that must still be maintainable in five years.", usedIn: "Every backend I run" },
      { name: "Django REST Framework", role: "APIs", brief: "Clean, versioned JSON APIs for web, mobile and partner systems, with authentication and permission checks on each endpoint.", usedIn: "Store, billing, client portal" },
      { name: "Celery · Redis", role: "Background work", brief: "Emails, courier sync, PDFs and scheduled jobs run outside the request, so pages stay fast and nothing is lost on a restart.", usedIn: "Emails, recurring invoices" },
    ],
  },
  {
    layer: "Data",
    tagline: "Records that stay correct when many people use them.",
    items: [
      { name: "PostgreSQL", role: "Database", brief: "Transactions and constraints keep balances, stock and invoices exact. Money is stored as exact decimals, never floats.", usedIn: "All projects" },
      { name: "Ledger-style design", role: "Pattern", brief: "Stock and payments are recorded as entries, not overwritten numbers, so every figure can be traced and audited.", usedIn: "Store stock, due tracking" },
    ],
  },
  {
    layer: "Frontend",
    tagline: "Fast pages people enjoy and search engines can read.",
    items: [
      { name: "Next.js · React", role: "Websites and apps", brief: "Server rendering for speed and SEO, React for rich interaction. Caching is planned per page, not left to chance.", usedIn: "This site, the store" },
      { name: "TypeScript", role: "Safer code", brief: "Types catch whole classes of mistakes before a customer ever sees them, and make later changes cheaper.", usedIn: "All frontends" },
      { name: "Tailwind CSS · shadcn/ui", role: "Interface", brief: "A consistent, accessible design system that is quick to extend and does not look like a template.", usedIn: "Dashboards, public sites" },
      { name: "Flutter", role: "Mobile", brief: "One codebase for a mobile order app that talks to the same API as the web.", usedIn: "Store order app" },
    ],
  },
  {
    layer: "Delivery",
    tagline: "Shipped, monitored and handed over properly.",
    items: [
      { name: "Docker · VPS", role: "Deployment", brief: "Repeatable builds and a setup you own. Your system is not locked to my laptop or my account.", usedIn: "API, worker, admin" },
      { name: "AI features", role: "Grounded assistants", brief: "Product Q&A and drafts that read only from your own database. Prices and stock always come from the system, never from the model.", usedIn: "Store AI layer" },
    ],
  },
];

export const mission = "Help small and growing businesses run on software they can trust: written scope, honest pricing, and work they can see as it is built.";
export const vision = "Bangladesh as a place where overseas teams find an engineer they can rely on, because the process is as dependable as the code.";
export const principles = [
  { t: "High quality", d: "Build it properly the first time: tested money logic, clear structure, no shortcuts that cost you later." },
  { t: "Fair prices", d: "You see what each part costs before work starts. No hidden extras, no padding." },
  { t: "No compromise", d: "If something cannot be done well within the agreed scope, I say so instead of shipping it anyway." },
];

export const differences = [
  { t: "I operate what I build", d: "Most freelancers deliver and leave. I run my own store every day, so I feel the problems of bad software before you do." },
  { t: "You deal with the engineer", d: "No account manager and no relay of messages. The person who writes the code is the person you talk to." },
  { t: "Process you can check", d: "Written scope, staged payments, a client area with progress, quotations and invoices. Trust comes from things you can verify." },
  { t: "Design and engineering together", d: "A background in visual effects and graphics means interfaces get as much care as the backend." },
  { t: "You keep what you pay for", d: "Source code and deployment help are part of final delivery, so you are never locked in." },
  { t: "English and Bangla", d: "Clear written updates in English, and your local team can talk to me in Bangla." },
];
