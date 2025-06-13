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
      <div className="max-w-4xl mx-auto text-center space-y-6">
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
          className="text-lg leading-relaxed text-gray-700"
        >
          I&apos;m{" "}
          <span className="font-semibold text-gray-900">Abul Wahed Nur</span>, a
          passionate{" "}
          <span className="text-primary">Full Stack MERN Developer</span> and
          <span className="text-primary"> Web App Consultant</span>. I help
          startups, small businesses, and creators build scalable SaaS platforms
          and modern web applications that solve real-world problems — from
          secure authentication to sleek UI/UX.
        </motion.p>
        <motion.p
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base text-gray-600"
        >
          Let’s build something smart, fast, and impactful — together.
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
