import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import PublicChrome from "@/components/PublicChrome";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.title}`, template: `%s | ${site.name}` },
  description:
    "Remote full-stack engineer in Bangladesh for overseas clients: eCommerce platforms, business systems and Django REST APIs. Written scope, milestone delivery, staged payments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PublicChrome>
          <Header />
        </PublicChrome>
        <div className="flex-1">{children}</div>
        <PublicChrome>
          <Footer />
        </PublicChrome>
      </body>
    </html>
  );
}
