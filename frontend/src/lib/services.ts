export type Service = {
  title: string;
  summary: string;
  goodFor: string;
  includes: string[];
};

export const serviceList: Service[] = [
  {
    title: "Custom eCommerce development",
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
    title: "Improve an existing application",
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
  "AI integration and SaaS product development are things I am building for my own platforms. I do not sell them as client services yet.",
];

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
    q: "What languages do you work in?",
    a: "English and Bangla.",
  },
];
