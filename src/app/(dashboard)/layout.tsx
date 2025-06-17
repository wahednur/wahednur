"use client";
import { useState } from "react";
import DashTopBar from "./components/dash-topbar";
import SidebarNav from "./components/sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex">
      <div
        className={`duration-500 ${
          open ? "w-[280px] -ml-[280px]" : "w-[280px]"
        }`}
      >
        <SidebarNav />
      </div>
      <div className="flex-1 overflow-hidden">
        <DashTopBar open={open} setOpen={setOpen} />

        <main className="p-5 bg-gray-100">{children}</main>
      </div>
    </div>
  );
}
