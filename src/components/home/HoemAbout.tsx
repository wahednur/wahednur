"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { FaComments } from "react-icons/fa";

export default function HomeAbout() {
  return (
    <motion.section
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      id="about"
      className="bg-white py-20 px-6 text-gray-800"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.h2
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-3xl md:text-4xl font-bold text-ws-primary"
        >
          About Me
        </motion.h2>
        <motion.p
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg leading-relaxed text-justify text-gray-700"
        >
          I&apos;m a Full Stack JavaScript Developer with over 6 years of
          real-world experience working across frontend, backend, and production
          systems. My journey began back in 2008, building desktop and web-based
          applications, and over time I&apos;ve delivered digital solutions for
          organizations like{" "}
          <span className="text-ws-primary font-bold">BRAC, UNDP, Oxfam</span>,
          and several local businesses. From designing interactive dashboards
          and role-based admin panels, to implementing secure authentication
          flows, to integrating scalable backend APIs — I&apos;ve worn many hats
          and solved real problems that impacted real users. While I&apos;ve
          worked on multiple client projects and SaaS systems (including a
          restaurant management platform and building management system),
          I&apos;ve rarely had the luxury to pause and polish my personal
          portfolio. My focus has always been on delivering value where
          it&apos;s needed — in production, for clients, on deadlines. This
          space is a work in progress, just like the best of us. I'm currently
          organizing my past projects and code samples — so stay tuned or feel
          free to reach out if you'd like to learn more about what I&apos;ve
          built and delivered behind the scenes.
        </motion.p>
        <motion.p
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-semibold text-gray-600"
        >
          Let&apos;s build something smart, fast, and impactful — together.
        </motion.p>
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="pt-4"
        >
          <Link
            href="/contact"
            className="inline-flex items-center px-6 py-3 bg-primary bg-gray-800 hover:bg-ws-primary duration-300 text-white rounded-lg font-semibold transition"
          >
            <FaComments className="mr-2" />
            Let’s Discuss Your Project
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}
