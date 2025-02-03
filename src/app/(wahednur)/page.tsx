"use client";
import ContactForm from "@/components/contact-form/contact-form";
import HomeSlider from "@/components/home/slider/home-slider";
// import { Metadata } from "next";
import Image from "next/image";
import { useState } from "react";

import {
  FaBolt,
  FaUpRightAndDownLeftFromCenter,
  FaUserCheck,
} from "react-icons/fa6";

import { PiCertificateFill } from "react-icons/pi";

// export const metadata: Metadata = {
//   title: "Wahed Nur | Full stack developer",
//   description:
//     "Innovative MERN Developer | SaaS Visionary | Feature-Driven Problem Solver",
// };
export default function Home() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <HomeSlider />
      <section id="about">
        <div className="container">
          <h1 className="sec-title sec-title-gap text-center text-wahednur">
            About me
          </h1>
          <div className="w-full flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/2 hidden lg:block">
              <Image
                src={`/wahednur.jpg`}
                width={600}
                height={1200}
                alt="wahednur"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="w-full lg:w-1/2 overflow-hidden">
              <h4 className="title">Know About me</h4>
              <h4 className="sub-title">
                🚀 Turning Ideas into Reality with MERN
              </h4>
              <p className="mt-3">
                I <strong>am Abdul Wahed Nur</strong>, a Full Stack MERN
                Developer with a passion for solving complex problems
                effortlessly. I specialize in building high-performance web
                applications with clean, scalable code. Whether it’s a dynamic
                frontend or a robust backend, I ensure top-notch functionality,
                security, and user experience.
              </p>

              <h4 className="sub-title mt-6 ">💡 Why Work With Me?</h4>
              <div className="flex flex-col gap-3 home-about mt-3">
                <p className="flex items-center gap-2">
                  <span className="icon">
                    <PiCertificateFill />
                  </span>
                  <span>100% Client Satisfaction</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="icon">
                    <FaBolt />
                  </span>
                  <span>Lightning-Fast Project Delivery</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="icon">
                    <FaUpRightAndDownLeftFromCenter />
                  </span>
                  <span>Scalable & Secure Web Solutions</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="icon">
                    {" "}
                    <FaUserCheck />
                  </span>
                  <span>Expert in React, Node.js, MongoDB & More</span>
                </p>
              </div>
              <p className="mt-5 text-secondary">
                Whether it’s building dynamic frontend interfaces or crafting
                robust backend systems, I thrive on creating seamless,
                user-friendly web applications that deliver real value. With a
                strong focus on clean code, scalability, and performance, I’m
                here to bring your ideas to life. Let’s build something amazing
                together!
              </p>
              <div className="flex items-center gap-4 mt-8 relative border border-wahednur rounded-lg p-6 bg-wahednur text-white">
                <button onClick={() => setOpen(!open)} className="btn-gdn">
                  Get in Touch
                </button>{" "}
                <h4 className="title"> I’d Love to Hear From You!</h4>
                <div
                  className={`absolute duration-500 transition-all bottom-16 ${
                    open ? "right-3" : "right-[-900px]"
                  }`}
                >
                  <ContactForm setOpen={setOpen} />
                </div>
              </div>
              <div></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
