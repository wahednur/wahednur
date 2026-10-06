import AboutContent from "@/components/about/AboutContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Abdul Wahed Nur - Full Stack Developer",
  description:
    "Learn more about Abdul Wahed Nur, a full stack web developer specializing in Next.js, MongoDB, and Tailwind CSS. Discover his journey, services, and skills.",
  keywords: [
    "Abdul Wahed Nur",
    "Full Stack Developer",
    "Next.js Developer",
    "MERN Stack",
    "Tailwind CSS",
    "Web Developer Bangladesh",
    "Freelance Web Developer",
    "NextAuth",
    "MongoDB",
    "ecommerce",
    "e-commerce",
  ],
};
export default function AboutPage() {
  return (
    <div>
      <AboutContent />
    </div>
  );
}
