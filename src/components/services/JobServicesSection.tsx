const services = [
  {
    title: "Frontend Development",
    desc: "React, Next.js, TypeScript, Tailwind CSS — modern, fast, responsive UIs.",
  },
  {
    title: "Backend Development",
    desc: "Node.js, Express.js, MongoDB, secure REST APIs, Mongoose models.",
  },
  {
    title: "Full-Stack Apps",
    desc: "Complete solutions from database to deployment with clean architecture.",
  },
  {
    title: "Auth & Security",
    desc: "NextAuth, JWT, role-based auth, secure password hashing.",
  },
  {
    title: "Deployment & Git",
    desc: "Vercel, Netlify, GitHub workflows, CI/CD basics.",
  },
];

export default function JobServicesSection() {
  return (
    <div className="py-12">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-6">
          My Skills & Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <div
              key={idx}
              className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
            >
              <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-gray-600 text-sm">{service.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
