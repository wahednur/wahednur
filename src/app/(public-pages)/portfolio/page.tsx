import Image from "next/image";
import Link from "next/link";

interface PortfolioItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  category: string;
  tags: string[];
  liveLink?: string;
  githubLink?: string;
}

const portfolios: PortfolioItem[] = [
  {
    id: "1",
    title: "Full Stack SaaS Platform",
    slug: "full-stack-saas-platform",
    description:
      "A fully functional SaaS platform with authentication, subscription, payments and admin panel.",
    image: "/wbms.jpg",
    category: "SaaS Applications",
    tags: ["Next.js", "MongoDB", "TailwindCSS", "Stripe", "NextAuth"],
    liveLink: "https://your-saas-app.vercel.app",
    githubLink: "https://github.com/username/saas-app",
  },
  {
    id: "2",
    title: "E-commerce Web Application",
    slug: "ecommerce-web-app",
    description:
      "A scalable e-commerce solution built with Next.js, Stripe, and MongoDB.",
    image: "/SebaHub.jpg",
    category: "E-Commerce",
    tags: ["Next.js", "Express", "MongoDB", "Stripe", "Cloudinary"],
    liveLink: "https://your-ecommerce.vercel.app",
    githubLink: "https://github.com/username/ecommerce-app",
  },
  {
    id: "3",
    title: "Admin Dashboard",
    slug: "admin-dashboard",
    description:
      "An advanced admin dashboard for managing users, orders and analytics.",
    image: "/dash.jpg",
    category: "Admin Dashboards",
    tags: ["React", "Redux", "Node.js", "MongoDB", "Chart.js"],
    liveLink: "https://your-dashboard.vercel.app",
    githubLink: "https://github.com/username/admin-dashboard",
  },
];

export default function PortfolioPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-10 text-center text-gray-800">
        My Portfolio
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {portfolios.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300"
          >
            <Image
              src={item.image}
              alt={item.title}
              width={500}
              height={300}
              className="w-full h-56 object-cover"
            />

            <div className="p-5">
              <h2 className="text-2xl font-semibold mb-2">{item.title}</h2>
              <p className="text-gray-600 mb-3">{item.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {item.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-sm bg-blue-100 text-blue-600 px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex justify-between">
                {item.liveLink && (
                  <Link href="#" className="text-blue-600 font-medium">
                    Live
                  </Link>
                )}
                {item.githubLink && (
                  <Link href="#" className="text-gray-600 font-medium">
                    GitHub
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
