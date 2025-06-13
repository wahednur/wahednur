"use client";
import Link from "next/link";
import {
  FaCloud,
  FaCode,
  FaDatabase,
  FaLock,
  FaMobileAlt,
  FaRocket,
} from "react-icons/fa";

export default function ServicesContent() {
  const services = [
    {
      title: "Full Stack Web Development",
      description:
        "End-to-end modern web applications using React, Next.js, Node.js, Express, and MongoDB.",
      icon: <FaCode className="text-4xl text-blue-500" />,
    },
    {
      title: "API Development & Integration",
      description:
        "RESTful API, third-party integration, payment gateway (Stripe, SSLCommerz, PayPal).",
      icon: <FaCloud className="text-4xl text-green-500" />,
    },
    {
      title: "Responsive Frontend Development",
      description:
        "Pixel perfect frontend design using React 19, TailwindCSS 4, Framer Motion & ShadCN UI.",
      icon: <FaMobileAlt className="text-4xl text-purple-500" />,
    },
    {
      title: "Backend Development",
      description:
        "High-performance backend using Node.js, Express.js, Prisma, PostgreSQL & MongoDB.",
      icon: <FaDatabase className="text-4xl text-pink-500" />,
    },
    {
      title: "Security & Authentication",
      description:
        "JWT, OAuth 2.0, Google Login, NextAuth, 2FA, role-based access, secure API protection.",
      icon: <FaLock className="text-4xl text-yellow-500" />,
    },
    {
      title: "Performance & Optimization",
      description:
        "Optimized code, caching (Redis), server-side rendering, image optimization with Cloudinary.",
      icon: <FaRocket className="text-4xl text-red-500" />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">My Services</h1>
        <p className="text-gray-600 text-lg">
          Build scalable, secure & high-performing full-stack web applications.
        </p>
      </div>

      {/* Services */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
        {services.map((service, index) => (
          <div
            key={index}
            className="p-6 bg-white shadow-lg rounded-2xl hover:shadow-2xl transition duration-300"
          >
            <div className="mb-4 flex justify-center">{service.icon}</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">
              {service.title}
            </h3>
            <p className="text-gray-600 text-center">{service.description}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-20 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Ready to start your project?
        </h2>
        <Link
          href="/contact"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-blue-700 transition"
        >
          Let&apos;s Work Together
        </Link>
      </div>
    </div>
  );
}
