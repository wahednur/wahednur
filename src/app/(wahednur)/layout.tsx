import Footer from "@/components/footer/footer";
import Header from "@/components/header/header";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: {
    template: "%s | Full stack developer",
    default: "Full stack developer",
  },
  description:
    "Innovative MERN Developer | SaaS Visionary | Feature-Driven Problem Solver",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="overflow-hidden">
      <header className="sticky top-0  bg-white z-50">
        <Header />
      </header>
      <main className=" min-h-[calc(100vh-300px)]">{children}</main>
      <footer>
        <Footer />
      </footer>
    </div>
  );
}
