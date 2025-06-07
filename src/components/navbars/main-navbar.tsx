"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserNav from "./user-nav";

export default function MainNavbar() {
  const p = usePathname();
  const navLists = (
    <>
      <li>
        <Link href={"/"} className={`${p === "/" ? "active" : ""}`}>
          Home
        </Link>
        <Link href={"/about"} className={`${p === "/about" ? "active" : ""}`}>
          About
        </Link>
        <Link
          href={"/services"}
          className={`${p === "/services" ? "active" : ""}`}
        >
          Services
        </Link>
        <Link href={"/shop"} className={`${p === "/shop" ? "active" : ""}`}>
          Shop
        </Link>
        <Link href={"/blog"} className={`${p === "/blog" ? "active" : ""}`}>
          Blog
        </Link>
      </li>
    </>
  );
  return (
    <div>
      <div className="desk-nav border-b border-gray-300 shadow-lg">
        <div className="container">
          <div className="flex items-center justify-between h-12">
            <ul>{navLists}</ul>
            <div>
              <UserNav />
            </div>
          </div>
        </div>
      </div>
      <div className="mbl-nav">Mobile nav</div>
    </div>
  );
}
