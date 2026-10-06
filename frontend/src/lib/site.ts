export const site = {
  name: "Abdul Wahed Nur",
  title: "Full-Stack Developer (Django + Next.js)",
  email: "wahednur@gmail.com",
  github: "https://github.com/wahednur",
  linkedin: "https://www.linkedin.com/in/wahednur",
  resume: "/Abdul_Wahed_Nur_Resume.pdf",
  url: "https://www.wahednur.tech",
};

export type Project = {
  title: string;
  kind: string;
  status: string;
  summary: string;
  stack: string[];
  slug: string;
  href?: string;
  linkLabel?: string;
};

// Only facts that are verified. Status labels are deliberate: own product,
// live, or demo. Nothing here is a client claim.
export const projects: Project[] = [
  {
    slug: "ekhaneikini",
    title: "ekhaneikini.com",
    kind: "Own business · eCommerce platform",
    status: "Live",
    summary:
      "A full online store: customer storefront, admin dashboard, backend API and a mobile order app. Product variations, guest checkout, Cash on Delivery and SSLCommerz payment, courier consignments, returns, stock ledger and reports.",
    stack: ["Django REST Framework", "PostgreSQL", "Redis", "Celery", "Next.js", "React", "Flutter"],
    href: "https://ekhaneikini.com",
    linkLabel: "Visit store",
  },
  {
    slug: "service-parts-management",
    title: "Service & Parts Management System",
    kind: "Own project · business application",
    status: "Live",
    summary:
      "One open invoice collects many jobs and parts over time. Customers pay in parts, and the system tracks dues with customer and supplier ledgers, inventory, expenses, cashbook and profit/loss reports.",
    stack: ["Django REST Framework", "PostgreSQL", "Next.js", "shadcn/ui"],
    href: "https://nurain.vercel.app",
    linkLabel: "View system",
  },
  {
    slug: "education-management-demo",
    title: "Education Management System",
    kind: "Demo · prototype with sample data",
    status: "Demo",
    summary:
      "An interactive prototype that shows how an education management system would work, built so a school can evaluate it before deciding. Not a production system.",
    stack: [],
    href: "https://lms.wahednur.tech",
    linkLabel: "Open demo",
  },
];

export const services = [
  {
    title: "Custom eCommerce",
    text: "Storefront, admin panel and backend built around how you sell: variations, checkout, payments, delivery and reports.",
  },
  {
    title: "Business management apps",
    text: "Inventory, invoicing, partial payments, due tracking and ledgers for businesses that outgrew spreadsheets.",
  },
  {
    title: "Admin dashboards",
    text: "Clear internal tools for orders, stock, customers and reporting, with permission-based access.",
  },
  {
    title: "Backend APIs & integrations",
    text: "Django REST APIs with authentication, background jobs, and payment-gateway or courier integration.",
  },
  {
    title: "Improve an existing app",
    text: "Review, fix and extend a web application you already have, without a rewrite when one isn't needed.",
  },
  {
    title: "Deployment setup",
    text: "Docker-based setup on your own VPS, agreed per project.",
  },
];

export const process = [
  { n: "01", title: "Understand", text: "I start with your business and the problem, not the technology." },
  { n: "02", title: "Agree the scope", text: "A written scope, milestones and delivery time before any code." },
  { n: "03", title: "Build in steps", text: "Small milestones you can see and test, with feedback along the way." },
  { n: "04", title: "Deliver", text: "A working application, source code and handover, with deployment help if agreed." },
];

export const roadmap = [
  "Multi-store dropshipping platform",
  "Shop management system",
  "Restaurant management system",
  "Building management system",
];
