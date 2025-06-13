"use client";
import Image from "next/image";
import { useState } from "react";
import ContactModal from "../contact/ContactModal";

export default function AboutContent() {
  const [isOpen, setIsOpen] = useState(false);
  // const [open, setOpen] = useState(false);
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-ws-primary">
        About Me
      </h1>

      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <Image
            src="/about.jpg" // তোমার নিজের প্রোফাইল পিক আপলোড করো public ফোল্ডারে
            alt="My Photo"
            width={300}
            height={300}
            className="w-full border-4 rounded-2xl shadow-lg mx-auto object-cover object-top"
          />
        </div>

        <div className="flex-1 text-lg leading-8 text-gray-700">
          <p>
            Hi! I&apos;m <strong>Abul Wahed Nur</strong>, a passionate{" "}
            <strong>MERN Stack Developer</strong> with expertise in building
            scalable web applications.
          </p>

          <p className="mt-4">
            My expertise includes: <br />
            ✅ React.js, Next.js, TypeScript <br />
            ✅ Express.js, Node.js <br />
            ✅ MongoDB & Mongoose <br />
            ✅ REST API Development <br />✅ Cloudinary, JWT Auth, Form
            Validation
          </p>

          <p className="mt-4">
            I enjoy solving real-world problems through clean code and modern
            technologies. Currently, I&apos;m sharpening my skills on advanced
            full-stack SaaS development with cutting-edge tools like Prisma,
            PostgreSQL, Redis, Socket.io, Stripe etc.
          </p>

          <p className="mt-4">
            If you&apos;re looking for someone who can build, scale, and
            optimize your web platform —{" "}
            <span className="font-semibold text-ws-primary">
              I&apos;m ready!
            </span>
          </p>
          <div className="mt-6">
            <button onClick={() => setIsOpen(true)} className="btn btn-filled">
              Send Me a Message
            </button>
          </div>
          <div className="mt-5"></div>
        </div>
      </div>
      <ContactModal isOpen={isOpen} closeModal={() => setIsOpen(false)} />
    </div>
  );
}
