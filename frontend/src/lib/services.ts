export type Service = {
  title: string;
  short: string; // one line for the home page
  summary: string;
  goodFor: string;
  includes: string[];
  icon: "store" | "boxes" | "layout" | "server" | "sparkles" | "wrench" | "rocket";
  note?: string; // where I have built this myself
};

export const serviceList: Service[] = [
  {
    title: "Custom eCommerce development",
    icon: "store",
    short: "Storefront, admin panel and backend built around how you sell: variations, checkout, payments, delivery and reports.",
    summary:
      "An online store built around how you sell, from the storefront to the admin panel and the backend.",
    goodFor: "Shops that need more than a template: variations, local payment, courier handling, special order rules.",
    includes: [
      "Product catalog with categories and variations",
      "Cart and checkout (guest and member)",
      "Cash on Delivery and online payment (for example SSLCommerz)",
      "Order status workflow and courier integration where an API exists",
      "Admin panel with permission-based access",
    ],
  },
  {
    title: "Business management applications",
    icon: "boxes",
    short: "Inventory, invoicing, partial payments, due tracking and ledgers for businesses that outgrew spreadsheets.",
    summary:
      "Inventory, invoicing, payments and reports in one system, shaped to your records.",
    goodFor: "Businesses still running on notebooks or spreadsheets.",
    includes: [
      "Customers and suppliers with ledgers",
      "Products, stock, purchase and sales entries",
      "Invoices with partial payments and due tracking",
      "Expenses and cashbook",
      "Sales, stock and profit/loss reports",
    ],
  },
  {
    title: "Admin dashboards",
    icon: "layout",
    short: "Clear internal tools for orders, stock, customers and reporting, with permission-based access.",
    summary: "Clear internal tools for the people who run the business daily.",
    goodFor: "Teams that already have a backend or data and need a usable interface.",
    includes: [
      "Tables, filters and search for orders, stock and customers",
      "Reports and charts",
      "User permissions",
      "Built with React and TypeScript",
    ],
  },
  {
    title: "Backend API development and integration",
    icon: "server",
    short: "Django REST APIs with authentication, background jobs, and payment-gateway or courier integration.",
    summary: "Django REST APIs that other apps can rely on.",
    goodFor: "New products that need a backend, or apps that must talk to payment and delivery services.",
    includes: [
      "Authentication (JWT) and permissions",
      "PostgreSQL data model",
      "Background jobs with Celery and Redis",
      "Payment gateway and courier integration",
    ],
  },
  {
    title: "AI features for business software",
    icon: "sparkles",
    short: "Product Q&A, smarter search and content drafts that work only from your own data, with a person approving what goes out.",
    summary:
      "AI that works from your own data and does not invent facts. Customers get answers taken from your catalog, shoppers find products by what they mean, and you get drafts of descriptions and SEO text that you approve before anything is published.",
    goodFor:
      "Shops and business apps that already hold good product or service data and want faster content work and better customer help.",
    includes: [
      "Product questions answered only from your product data. Price, stock and warranty come from the system, never from the AI",
      "AI-assisted search that understands what shoppers mean",
      "Draft product descriptions, SEO titles and comparison summaries, reviewed by a person before publishing",
      "Suggested replies for your support staff, which a person always sends",
      "Fallback when an AI provider is down, answer caching, and usage and cost tracking",
    ],
    note: "I built these inside my own store platform, ekhaneikini.com.",
  },
  {
    title: "Improve an existing application",
    icon: "wrench",
    short: "Review, fix and extend a web application you already have, without a rewrite when one isn't needed.",
    summary: "Review, fix and extend a web application you already run.",
    goodFor: "Apps that work but are slow to change, buggy, or missing features.",
    includes: [
      "Code and workflow review",
      "Bug fixes and new features",
      "No rewrite unless it is clearly the better option",
    ],
  },
  {
    title: "Deployment setup",
    icon: "rocket",
    short: "Docker-based setup on your own VPS, agreed per project.",
    summary: "Getting the application running on your own server.",
    goodFor: "Projects that need Docker-based setup on a VPS. Agreed per project.",
    includes: [
      "Docker and Docker Compose configuration",
      "VPS deployment with Dokploy",
      "Domain and Cloudflare setup",
    ],
  },
];

export const notOffered = [
  "I do not take on work outside web applications, such as hardware or unrelated mobile-only products.",
  "I do not build AI agents that act on their own, such as placing orders or spending an advertising budget.",
  "Chatbots on Messenger or WhatsApp are still a plan for my own store. I do not sell them as a service yet.",
  "Reusable SaaS products are something I am building for myself. I do not take SaaS builds as client work yet.",
];

// How AI is used in my own work. Shown on the Services page; remove if you
// prefer not to say.
export const aiWorkflow = {
  title: "How I use AI when I build",
  text: [
    "I use AI coding assistants to move faster on routine work. The design decisions, the review of every change and the testing stay with me.",
    "In practice that means a written scope first, small changes that are reviewed one by one, and automated tests for the parts that handle money, stock and permissions. You receive working software and a record of what was decided and why.",
  ],
};

export const faq = [
  {
    q: "How do you price a project?",
    a: "After a short discussion I give a written scope with milestones and a price for each. I do not quote before I understand the problem.",
  },
  {
    q: "Can you work on my existing site or app?",
    a: "Yes. I review it first and tell you honestly whether to extend it or rebuild a part of it.",
  },
  {
    q: "What do I need to prepare?",
    a: "A short description of the business problem and how the work is done today. Existing data, logos and product details help if they are relevant.",
  },
  {
    q: "Can you add AI to my website or app?",
    a: "Yes, for the kinds listed above: answers and search grounded in your data, and drafts a person approves. I will tell you honestly if your data is not good enough yet for it to work well.",
  },
  {
    q: "What languages do you work in?",
    a: "English and Bangla.",
  },
];
