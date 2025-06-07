import MainNavbar from "@/components/navbars/main-navbar";
import defaultMetadata from "@/lib/seo";
import type { Metadata } from "next";
import { Inter, Lora, Poppins } from "next/font/google";
import "./globals.css";

const fontInter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-inter",
});

const fontTitle = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-title",
});

const fontQuote = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-quote",
});

export const metadata: Metadata = {
  ...defaultMetadata,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fontInter.variable} ${fontTitle.variable}  ${fontQuote.variable} antialiased`}
      >
        <header>
          <MainNavbar />
        </header>
        <main className="vh-height mt-3 lg:mt-5">{children}</main>
        <footer>Footer</footer>
      </body>
    </html>
  );
}
