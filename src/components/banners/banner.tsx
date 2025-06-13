"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaBriefcase, FaCogs, FaComments, FaUser } from "react-icons/fa";
export default function Banner() {
  return (
    <section className="relative bg-gray-900 text-white lg:min-h-[700px] flex items-center justify-center px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Content */}
        <div className="space-y-6 text-center mt-20 lg:mt-0 lg:col-span-7 lg:text-left">
          <motion.h1
            className="text-3xl md:text-5xl lg:text-6xl font-bold uppercase leading-tight"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            Abdul Wahed Nur
          </motion.h1>
          <motion.p
            className="text-lg text-gray-300 max-w-xl mx-auto lg:mx-0"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Full Stack MERN Developer | SaaS Architect & Consultant
          </motion.p>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-gray-400"
          >
            From MVP to Enterprise — I build web apps that scale.
          </motion.p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 justify-center lg:justify-start">
            <button className="btn btn-outline">
              <FaUser className="inline mr-2" />
              About Me
            </button>
            <button className="btn btn-filled">
              <FaBriefcase className="inline mr-2" />
              Portfolio
            </button>
            <button className="btn btn-filled">
              <FaComments className="inline mr-2" />
              Let&apos;s Discuss
            </button>
            <button className="btn btn-outline">
              <FaCogs className="inline mr-2" />
              Services
            </button>
          </div>
        </div>

        {/* Right Image */}
        <motion.div
          className="flex lg:col-span-5 justify-center lg:min-h-[700px] lg:justify-end"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Image
            src="/img/wahednur.png"
            alt="Abdul Wahed Nur"
            className="rounded-xl shadow-lg w-full object-contain object-bottom-right"
            width={717}
            height={924}
          />
        </motion.div>
      </div>
    </section>
  );
}
