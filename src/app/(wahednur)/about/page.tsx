"use client";
import ContactForm from "@/components/contact-form/contact-form";
import Head from "next/head";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { BsEnvelope, BsPhone } from "react-icons/bs";

// export const metadata: Metadata = {
//   title: "Wahed Nur | Full stack developer",
//   description:
//     "Innovative MERN Developer | SaaS Visionary | Feature-Driven Problem Solver",
// };

export default function About() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Dynamically update document title
    document.title = "About | Wahed Nur";

    // Optional: Update metadata dynamically
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Updated dynamic description");
    }
  }, []);
  return (
    <>
      <Head>
        <title>About | Wahed Nur</title>
      </Head>
      <div className="container mt overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/2 space-y-6">
            <h4 className="sec-title text-wahednur mb-4">About Me –</h4>
            {/* <h1 className="sec-title text-success">About Wahed Nur</h1> */}
            <p>
              Welcome! I’m{" "}
              <span className="text-success sec-sub-title ">
                Abdul Wahed Nur
              </span>
              , a <strong>Full Stack MERN Developer</strong> who loves turning
              complex ideas into seamless digital experiences. With expertise in
              React, Node.js, Express, and MongoDB, I craft high-quality web
              applications that are both scalable and efficient.
            </p>
            <div className="bg-white p-6 rounded-lg border-b-2 border-success drop-shadow-lg">
              <h2 className="title"> My Mission 🚀</h2>I help businesses and
              individuals build powerful, fast, and secure web applications.
              Whether it’s a SaaS platform, an eCommerce site, or a custom web
              solution, I bring my technical expertise to ensure the best
              results.
            </div>
            <div className="bg-white p-6 rounded-lg border-b-2 border-success drop-shadow-lg">
              <h2 className="title">Why Choose Me?</h2>
              <p>
                <strong>✔ Client-Centric Approach</strong> – I listen,
                understand, and deliver beyond expectations.
              </p>
              <p>
                <strong>✔ Speed & Efficiency</strong> – I ensure high-quality
                solutions without delays.{" "}
              </p>
              <p>
                <strong>✔ Scalability & Security</strong> – Your application
                will be future-proof and secure.{" "}
              </p>
              <p>
                <strong> ✔ 100% Satisfaction Guaranteed</strong> – My goal is to
                exceed your expectations.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border-b-2 border-success drop-shadow-lg">
              <h2 className="title">What I Offer</h2>
              <p>
                💡 Frontend Development: React, Next.js, Tailwind CSS, Firebase
              </p>
              <p>
                🛠 Backend Development: Node.js, Express.js, MongoDB, JWT
                Authentication
              </p>
              <p>
                ⚡ Full-Stack Solutions: SaaS Development, Marketplace Apps,
                Business Websites
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border-b-2 border-success drop-shadow-lg">
              <h2 className="title">My Work Philosophy</h2>
              <p>
                I believe in writing clean, maintainable code that ensures
                smooth performance. Every project I take on is crafted with
                care, precision, and attention to detail to meet the unique
                needs of my clients.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border-b-2 border-success drop-shadow-lg">
              <h2 className="title">Let’s Build Together!</h2>
              <p>
                Looking for a reliable developer who can bring your ideas to
                life? Let’s discuss your project and create something
                remarkable! 🚀
              </p>
            </div>
          </div>

          <div className="w-full md:w-1/2">
            <Image
              src={"/about.png"}
              width={600}
              height={1000}
              alt="Wahed Nur"
              className="w-full"
            />
            <div className="bg-white p-6 rounded-lg border-b-2 border-success drop-shadow-lg mt-8 space-y-3 relative">
              <h2 className="title">📩 Contact Me Today!</h2>
              <p className="flex gap-2 items-center">
                <BsEnvelope /> wahednur@gmail.com
              </p>
              <p className="flex gap-2 items-center">
                <BsEnvelope /> Contact@wahednur.com
              </p>
              <p className="flex gap-2 items-center">
                <BsPhone />
                +88 01917 83 93 03
              </p>
              <div
                className={`absolute duration-500 transition-all bottom-16 ${
                  open ? "right-3" : "right-[-900px]"
                }`}
              >
                <ContactForm setOpen={setOpen} />
              </div>
              <div className="mt-6">
                <button onClick={() => setOpen(!open)} className="btn-gdn">
                  Get in Touch
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
