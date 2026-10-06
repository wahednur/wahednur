import Footer from "@/components/footer/footer";
import MainNavbar from "@/components/navbars/MainNavbars";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="overflow-hidden">
      <header className="relative z-20">
        <MainNavbar />
      </header>
      <main className="vh-height mt-3 lg:mt-5">{children}</main>
      <footer className="w-full">
        <Footer />
      </footer>
    </div>
  );
}
