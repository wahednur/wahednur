// Case-study content. Every statement here is either verified in the project's
// own repository/docs or stated by the owner. Do not add figures (sales,
// traffic, uptime) unless real data exists. `screenshots` stays empty until
// real images are placed in /public/work/<slug>/.

export type CaseStudy = {
  slug: string;
  title: string;
  kind: string;
  status: "Live" | "Demo";
  tagline: string;
  context: string;
  problem: string;
  role: string;
  solution: string[];
  workflow: { actor: string; steps: string[] }[];
  stack: { name: string; why: string }[];
  challenges: { title: string; text: string }[];
  statusText: string;
  limits: string[];
  screenshots: { src: string; alt: string }[];
  href?: string;
  linkLabel?: string;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "ekhaneikini",
    title: "ekhaneikini.com",
    kind: "Own business · eCommerce platform",
    status: "Live",
    tagline:
      "A full online store: storefront, admin dashboard, backend API and a mobile order app, built as one connected system.",
    context:
      "ekhaneikini.com is my own online store. It started in 2016 and I rebuilt it as a custom platform. Two groups use it: shoppers on the website and mobile, and the owner and staff who run orders, stock and delivery.",
    problem:
      "The parts of an online store depend on each other. A product's stock decides what can be sold at checkout, checkout creates an order, the order drives payment and delivery, and all of it feeds reports. I wanted these to work as one system built around how the store really operates.",
    role: "Sole developer, and the owner of the business. I designed the data model and business rules, built the backend API, the storefront, the admin dashboard and the mobile app, and I run the store.",
    solution: [
      "Catalog with nested categories, product variations (size, color) and reusable product-type specification templates.",
      "Cart, guest checkout and member checkout, with Cash on Delivery and online payment through SSLCommerz, plus payment retry.",
      "Order status workflow with courier consignments (Steadfast) and return handling.",
      "Inventory ledger where every stock change is a recorded movement.",
      "Admin dashboard for products, stock, orders, customers and reports, with permission-based access.",
      "Customer CRM, notifications and marketing source tracking (website, Facebook, WhatsApp).",
      "Offline-first mobile order app built with Flutter.",
      "AI features that work only from the store's own data: product questions, AI-assisted search, draft descriptions and SEO text, comparison summaries and suggested replies for staff.",
    ],
    workflow: [
      {
        actor: "A customer",
        steps: [
          "Browses a category and picks a variation",
          "Adds to cart and checks out as a guest or with an account",
          "Pays by Cash on Delivery or online",
          "Tracks the order status",
        ],
      },
      {
        actor: "The store team",
        steps: [
          "Reviews and confirms the order",
          "Creates the courier consignment",
          "Follows delivery, or handles a return",
          "Reads stock and sales reports",
        ],
      },
    ],
    stack: [
      { name: "Django REST Framework", why: "Keeps business rules and permissions in one backend that the website, admin and mobile app all use." },
      { name: "PostgreSQL", why: "Orders, stock and payments are relational data that must stay consistent." },
      { name: "Redis and Celery", why: "Background work such as courier consignments and notifications runs outside the request." },
      { name: "Next.js", why: "A fast, search-friendly storefront." },
      { name: "React and Vite", why: "A separate admin dashboard for staff." },
      { name: "Flutter", why: "A mobile order app that keeps working with poor connectivity." },
    ],
    challenges: [
      {
        title: "Stock that can be trusted",
        text: "Stock is never edited directly. Every change goes through a stock movement record, so any number can be explained from its history.",
      },
      {
        title: "Access without hardcoded roles",
        text: "Staff access is controlled by a permission system rather than role checks scattered through the code. Sensitive data such as buying prices is restricted in the API and the admin.",
      },
      {
        title: "Offline orders without duplicates",
        text: "The mobile app can create orders offline. Each order carries a client reference so a retried sync does not create the same order twice.",
      },
      {
        title: "AI that cannot invent facts",
        text: "Every AI answer is built from database rows. Price, stock and warranty are shown by the system, not written by the model. Draft content is saved as a draft for a person to approve, staff replies are suggested but sent by a person, and a template fallback runs if the AI provider is unavailable.",
      },
      {
        title: "Guest customers keep their history",
        text: "Guest orders are linked to a customer's phone number, so past orders appear when that customer later signs in.",
      },
    ],
    statusText:
      "Live. Customers can order today, and I keep adding features.",
    limits: [
      "No sales or traffic figures are published here.",
      "I am the only developer, so the roadmap moves at the pace of one person.",
      "The AI features are built and tested in the platform. A shopping assistant on Messenger and WhatsApp is still a plan.",
    ],
    screenshots: [
      {
        src: "/work/ekhaneikini/home.png",
        alt: "ekhaneikini.com home page with search, category banners and a shop-by-category section",
      },
    ],
    href: "https://ekhaneikini.com",
    linkLabel: "Visit the store",
  },
  {
    slug: "service-parts-management",
    title: "Service & Parts Management System",
    kind: "Own project · business application",
    status: "Live",
    tagline:
      "Invoicing that matches how repair work is actually paid for: many jobs, paid in parts, over weeks or months.",
    context:
      "A web application for a motorcycle service business. The people who use it enter jobs and parts, take payments, and check what each customer and supplier owes.",
    problem:
      "A customer often takes several services and buys parts. Many do not pay everything at once. They pay part now and the rest weeks or months later. An ordinary one-off invoice does not fit this, because the business needs the history of work, what is due, and a ledger of payments.",
    role: "Sole developer. I designed the workflow from the way the business records its work and money, and built the backend and the interface.",
    solution: [
      "One open invoice per customer. New jobs and parts are added to it over time, and each line item keeps its date and time.",
      "Partial payments with automatic due tracking.",
      "Customer and supplier ledgers.",
      "Parts inventory with purchase and sales entries.",
      "Expense entries and a cashbook.",
      "Reports for income, sales, purchase, stock and profit/loss.",
      "Service history with meter model, serial number and previous and new kilometer readings.",
    ],
    workflow: [
      {
        actor: "A service job",
        steps: [
          "Open the customer's invoice (or start a new one)",
          "Add the job and the parts used, each with date and time",
          "Record a payment if the customer pays part of it",
          "The due amount and the customer ledger update",
        ],
      },
      {
        actor: "Later",
        steps: [
          "The customer returns and pays more",
          "The remaining due falls",
          "Reports show income, stock and profit/loss",
        ],
      },
    ],
    stack: [
      { name: "Django REST Framework", why: "Clear rules for invoices, payments and ledgers behind a secure API." },
      { name: "PostgreSQL", why: "Money and stock records need strict consistency." },
      { name: "Next.js and shadcn/ui", why: "A fast, clean interface for daily data entry." },
    ],
    challenges: [
      {
        title: "One open invoice instead of many",
        text: "Instead of a new invoice per visit, work accumulates on one open invoice. This matches how customers pay and keeps the whole history in one place.",
      },
      {
        title: "Due amounts that stay correct",
        text: "Every payment is a ledger entry, so the balance for a customer or supplier is always derived from records rather than typed in.",
      },
    ],
    statusText:
      "Live and in use. It is kept running as it is, with no new feature work planned.",
    limits: [
      "It is built around one kind of business. Another business would need its workflow reviewed first.",
      "No usage or profit figures are published here.",
    ],
    screenshots: [],
    href: "https://nurain.vercel.app",
    linkLabel: "View the system",
  },
  {
    slug: "education-management-demo",
    title: "Education Management System",
    kind: "Demo · prototype with sample data",
    status: "Demo",
    tagline:
      "An interactive prototype built so a school could see how an education management system would work before deciding.",
    context:
      "A prototype prepared for a prospective client, an educational institution. It runs on sample data only.",
    problem:
      "Decision-makers at a school find it hard to judge software from a description. A working prototype lets them see the screens and the flow and give feedback before any real build.",
    role: "Sole developer of the prototype.",
    solution: [
      "Admin screens for students, staff, academics, class routine, attendance, examinations and results, plus reports, roles and an audit log.",
      "Five simulated roles (principal, academic in-charge, head of department, teacher, student) so each person sees only their own part.",
      "A public site with departments and contact pages, a light and dark theme, and charts for the reports.",
      "Built to show the intended screens and flow, not to run a real institution.",
    ],
    workflow: [
      {
        actor: "A walkthrough in the demo",
        steps: [
          "Pick a role on the login page (no password; demo only)",
          "See the screens and numbers that role would use",
          "Record attendance or results and watch the reports change",
          "Reset the demo data at any time from the settings page",
        ],
      },
    ],
    stack: [
      { name: "Next.js and React", why: "One app for the public site and the role-based admin screens." },
      { name: "TypeScript, Tailwind CSS and shadcn/ui", why: "A consistent, accessible interface that is quick to adjust after feedback." },
      { name: "TanStack Table and Recharts", why: "Searchable tables and charts for the lists and reports." },
      { name: "Browser storage with a checked seed dataset", why: "No server is needed to show it, and the sample data is validated for duplicates and broken references." },
    ],
    challenges: [
      {
        title: "Believable without being real",
        text: "The sample data is generated deterministically and checked by scripts for duplicate roll numbers, broken references and routine clashes, so the demo behaves like a real system without holding real people's data.",
      },
    ],
    statusText:
      "Demo only. A production system has not been built or contracted.",
    limits: [
      "It is a prototype with sample data. It is not a production system.",
      "There is no server: data lives in the browser. A real system would need a backend, real login and secure storage.",
      "No real student or staff data is used.",
    ],
    screenshots: [],
    href: "https://lms.wahednur.tech",
    linkLabel: "Open the demo",
  },
];

export const getCaseStudy = (slug: string) =>
  caseStudies.find((c) => c.slug === slug);
