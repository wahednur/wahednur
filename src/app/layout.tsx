import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className={` antialiased`}>
        <main>{children}</main>
      </body>
    </html>
  );
}
